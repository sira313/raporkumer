import { error, json, redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getPresensiGuruStatus,
	parseSimulatedNow,
	savePresensiGuru,
	type PresensiGuruStatus,
	type PresensiGuruStatusValue
} from '$lib/server/presensi-guru';
import { ensurePresensiGuruSchema } from '$lib/server/db/ensure-presensi-guru';
import { deleteSignatureFile, saveSignatureFile } from '$lib/server/ttd';
import { dateStr } from '$lib/server/absen/utils';

const ALLOWED_STATUS: PresensiGuruStatusValue[] = ['hadir', 'izin', 'sakit', 'dinas_luar'];

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	await ensurePresensiGuruSchema();

	if (locals.user.type === 'admin') {
		return json({
			ready: true,
			enabled: false,
			message: 'Akun admin tidak dapat melakukan presensi guru.',
			shouldPrompt: false,
			tanggal: '',
			isSchoolDay: false,
			inWindow: false,
			hasDoneToday: false,
			jamMasuk: null,
			jamPulang: null,
			hariSekolah: null,
			status: null
		} satisfies PresensiGuruStatus);
	}

	const now = parseSimulatedNow(url.searchParams.get('tanggal-jam'));
	const status = await getPresensiGuruStatus(locals.sekolah?.id ?? null, locals.user.id, now);
	return json(status);
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw redirect(303, '/login');

	if (locals.user.type === 'admin') {
		throw error(400, { message: 'Akun admin tidak dapat melakukan presensi guru.' });
	}

	await ensurePresensiGuruSchema();

	const body = await request.json().catch(() => ({}));

	const rawStatus = typeof body.status === 'string' ? body.status : '';
	if (!ALLOWED_STATUS.includes(rawStatus as PresensiGuruStatusValue)) {
		throw error(400, { message: 'Status presensi tidak valid.' });
	}
	const status = rawStatus as PresensiGuruStatusValue;

	const tandaTangan =
		typeof body.tandaTangan === 'string' && body.tandaTangan.trim() ? body.tandaTangan : null;
	if (status === 'hadir' && !tandaTangan) {
		throw error(400, { message: 'Paraf wajib diisi untuk status Hadir.' });
	}

	const keterangan =
		typeof body.keterangan === 'string' && body.keterangan.trim() ? body.keterangan : null;

	const now =
		parseSimulatedNow(typeof body.tanggalJam === 'string' ? body.tanggalJam : null) ?? new Date();

	let storedSignature: string | null = null;
	try {
		const tanggal = dateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());
		if (status === 'hadir' && tandaTangan) {
			storedSignature = await saveSignatureFile(
				'guru',
				`${locals.user.id}_${tanggal}_${Date.now()}.png`,
				tandaTangan
			);
		}

		await savePresensiGuru(
			{
				sekolahId: locals.sekolah?.id ?? null,
				userId: locals.user.id,
				status,
				tandaTangan: storedSignature,
				keterangan
			},
			now
		);
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
