import { error, json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import db from '$lib/server/db';
import { tablePresensiGuru } from '$lib/server/db/schema';
import {
	listGuruBySekolah,
	parseSimulatedNow,
	savePresensiGuruAdmin,
	type PresensiGuruStatusValue
} from '$lib/server/presensi-guru';
import { ensurePresensiGuruSchema } from '$lib/server/db/ensure-presensi-guru';
import { deleteSignatureFile, saveSignatureFile } from '$lib/server/ttd';
import { isValidDate } from '$lib/server/absen/utils';

const ALLOWED_STATUS: PresensiGuruStatusValue[] = ['hadir', 'izin', 'sakit', 'dinas_luar'];

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	if (locals.user.type !== 'admin') {
		throw error(403, { message: 'Hanya admin yang dapat mengubah presensi guru.' });
	}

	const sekolahId = locals.sekolah?.id;
	if (!sekolahId) {
		throw error(400, { message: 'Sekolah belum diatur.' });
	}

	await ensurePresensiGuruSchema();

	const body = await request.json().catch(() => ({}));

	const userId = Number(body.userId);
	if (!Number.isInteger(userId) || userId <= 0) {
		throw error(400, { message: 'Pengguna tidak valid.' });
	}

	const tanggal = typeof body.tanggal === 'string' ? body.tanggal : '';
	if (!isValidDate(tanggal)) {
		throw error(400, { message: 'Tanggal tidak valid.' });
	}

	const rawStatus = typeof body.status === 'string' ? body.status : '';
	if (!ALLOWED_STATUS.includes(rawStatus as PresensiGuruStatusValue)) {
		throw error(400, { message: 'Status presensi tidak valid.' });
	}
	const status = rawStatus as PresensiGuruStatusValue;

	const tandaTangan =
		typeof body.tandaTangan === 'string' && body.tandaTangan.trim() ? body.tandaTangan : null;

	const keterangan =
		typeof body.keterangan === 'string' && body.keterangan.trim() ? body.keterangan : null;

	const now = parseSimulatedNow(typeof body.tanggalJam === 'string' ? body.tanggalJam : null);

	const gurus = await listGuruBySekolah(sekolahId);
	if (!gurus.some((g) => g.id === userId)) {
		throw error(400, { message: 'Pengguna tidak terdaftar di sekolah ini.' });
	}

	let storedSignature: string | null = null;
	try {
		// Timestamped filename gives a new URL per save, so the immutable cache on
		// /api/ttd never serves a stale paraf after "Ganti Paraf".
		if (status === 'hadir' && tandaTangan) {
			storedSignature = await saveSignatureFile(
				'guru',
				`${userId}_${tanggal}_${Date.now()}.png`,
				tandaTangan
			);
		}

		if (storedSignature) {
			const existing = await db.query.tablePresensiGuru.findFirst({
				columns: { tandaTangan: true },
				where: and(
					eq(tablePresensiGuru.sekolahId, sekolahId),
					eq(tablePresensiGuru.authUserId, userId),
					eq(tablePresensiGuru.tanggal, tanggal)
				)
			});
			// Legacy data-URL values are skipped by deleteSignatureFile (invalid rel path).
			if (existing?.tandaTangan && existing.tandaTangan !== storedSignature) {
				await deleteSignatureFile(existing.tandaTangan);
			}
		}

		await savePresensiGuruAdmin({
			sekolahId,
			userId,
			tanggal,
			status,
			tandaTangan: storedSignature,
			keterangan,
			now
		});
	} catch (e) {
		// Don't leave an orphan file behind if the DB write fails.
		if (storedSignature) {
			await deleteSignatureFile(storedSignature);
		}
		throw error(400, {
			message: e instanceof Error ? e.message : 'Gagal menyimpan presensi guru.'
		});
	}

	return json({ message: 'Presensi guru berhasil disimpan.' });
};
