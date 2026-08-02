import { error, json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { and, eq } from 'drizzle-orm';
import db from '$lib/server/db';
import { tablePresensiGuru } from '$lib/server/db/schema';
import {
	enumerateDates,
	formatCutiKeterangan,
	getPresensiGuruSettings,
	listGuruBySekolah,
	parseSimulatedNow,
	savePresensiGuruAdmin,
	type PresensiGuruStatusValue
} from '$lib/server/presensi-guru';
import { ensurePresensiGuruSchema } from '$lib/server/db/ensure-presensi-guru';
import { resolveSekolahAcademicContext } from '$lib/server/db/academic';
import { deleteSignatureFile, saveSignatureFile } from '$lib/server/ttd';
import { isValidDate } from '$lib/server/absen/utils';

const ALLOWED_STATUS: PresensiGuruStatusValue[] = ['hadir', 'izin', 'sakit', 'dinas_luar', 'cuti'];

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

	const presensiSettings = await getPresensiGuruSettings(sekolahId);
	if (presensiSettings?.presensiGuruEnabled === false) {
		throw error(400, { message: 'Fitur presensi guru sedang dinonaktifkan.' });
	}

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

	// Cuti spans a range: every date in [mulai, selesai] is stored as "cuti".
	if (status === 'cuti') {
		const cutiMulai = typeof body.cutiMulai === 'string' ? body.cutiMulai : '';
		const cutiSelesai = typeof body.cutiSelesai === 'string' ? body.cutiSelesai : '';
		if (!isValidDate(cutiMulai) || !isValidDate(cutiSelesai)) {
			throw error(400, { message: 'Tanggal mulai dan selesai cuti wajib diisi.' });
		}
		if (cutiSelesai < cutiMulai) {
			throw error(400, { message: 'Tanggal selesai cuti tidak boleh sebelum tanggal mulai.' });
		}
		const cutiDates = enumerateDates(cutiMulai, cutiSelesai);
		if (cutiDates.length > 366) {
			throw error(400, { message: 'Rentang cuti terlalu panjang (maksimal 366 hari).' });
		}
		const cutiKeterangan = keterangan
			? `${formatCutiKeterangan(cutiMulai, cutiSelesai)} — ${keterangan}`
			: formatCutiKeterangan(cutiMulai, cutiSelesai);

		// When an existing cuti range is shrunk, the days left outside the new range
		// are reset (their "cuti" rows deleted) so they no longer display as Ct.
		const rawMulaiAsli = typeof body.cutiMulaiAsli === 'string' ? body.cutiMulaiAsli : '';
		const rawSelesaiAsli = typeof body.cutiSelesaiAsli === 'string' ? body.cutiSelesaiAsli : '';
		const originalDates =
			isValidDate(rawMulaiAsli) && isValidDate(rawSelesaiAsli) && rawSelesaiAsli >= rawMulaiAsli
				? enumerateDates(rawMulaiAsli, rawSelesaiAsli)
				: [];
		const clearDates = originalDates.filter((d) => !cutiDates.includes(d));

		const saveNow = now ?? new Date();

		// Fail fast before touching any data: the school needs an active academic context.
		const academic = await resolveSekolahAcademicContext(sekolahId);
		if (!academic.activeTahunAjaranId || !academic.activeSemesterId) {
			throw error(400, { message: 'Tahun ajaran atau semester belum diatur.' });
		}

		const signatureFilesToDelete: string[] = [];
		try {
			await db.transaction(async (tx) => {
				for (const d of clearDates) {
					const existing = await tx.query.tablePresensiGuru.findFirst({
						columns: { status: true, tandaTangan: true },
						where: and(
							eq(tablePresensiGuru.sekolahId, sekolahId),
							eq(tablePresensiGuru.authUserId, userId),
							eq(tablePresensiGuru.tanggal, d)
						)
					});
					// Only clear days this feature cuti'd; leave other statuses alone.
					if (existing?.status !== 'cuti') continue;
					if (existing.tandaTangan) signatureFilesToDelete.push(existing.tandaTangan);
					await tx
						.delete(tablePresensiGuru)
						.where(
							and(
								eq(tablePresensiGuru.sekolahId, sekolahId),
								eq(tablePresensiGuru.authUserId, userId),
								eq(tablePresensiGuru.tanggal, d)
							)
						);
				}

				for (const d of cutiDates) {
					// Collect old paraf so files are only removed after the DB commit.
					const existing = await tx.query.tablePresensiGuru.findFirst({
						columns: { tandaTangan: true },
						where: and(
							eq(tablePresensiGuru.sekolahId, sekolahId),
							eq(tablePresensiGuru.authUserId, userId),
							eq(tablePresensiGuru.tanggal, d)
						)
					});
					if (existing?.tandaTangan) signatureFilesToDelete.push(existing.tandaTangan);
					await savePresensiGuruAdmin(
						{
							sekolahId,
							userId,
							tanggal: d,
							status,
							tandaTangan: null,
							keterangan: cutiKeterangan,
							now: saveNow,
							tahunAjaranId: academic.activeTahunAjaranId,
							semesterId: academic.activeSemesterId
						},
						tx
					);
				}
			});
		} catch (e) {
			// Transaction rolled back and no paraf files were touched, so DB and files
			// stay consistent.
			throw error(400, {
				message: e instanceof Error ? e.message : 'Gagal menyimpan cuti guru.'
			});
		}

		// Only after the commit succeeds are the replaced paraf files removed.
		for (const f of signatureFilesToDelete) {
			await deleteSignatureFile(f);
		}

		return json({ message: 'Cuti guru berhasil disimpan.' });
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
