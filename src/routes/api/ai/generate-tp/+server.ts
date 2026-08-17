import db from '$lib/server/db';
import { tableMataPelajaran } from '$lib/server/db/schema';
import { generateTujuanPembelajaran, getAiSettings } from '$lib/server/ai';
import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

const ALLOWED_USER_TYPES = ['admin', 'kepala_sekolah', 'user', 'wali_kelas', 'wali_asuh'];

const MAX_LINGKUP_MATERI = 20;
const MAX_TUJUAN_PEMBELAJARAN = 20;

export const POST = async ({ request, locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ message: 'Sesi berakhir. Silakan login kembali.' }, { status: 401 });
	}
	if (!ALLOWED_USER_TYPES.includes(user.type)) {
		return json({ message: 'Anda tidak berhak menggunakan fitur ini.' }, { status: 403 });
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch {
		return json({ message: 'Payload tidak valid.' }, { status: 400 });
	}

	const body = (payload ?? {}) as Record<string, unknown>;
	const mapelId = Number(body.mapelId);
	const capaianPembelajaran =
		typeof body.capaianPembelajaran === 'string' ? body.capaianPembelajaran.trim() : '';
	const maxLingkupMateri = Number(body.maxLingkupMateri);
	const maxTujuanPembelajaran = Number(body.maxTujuanPembelajaran);

	if (!Number.isFinite(mapelId)) {
		return json({ message: 'Mata pelajaran tidak valid.' }, { status: 400 });
	}
	if (!capaianPembelajaran) {
		return json({ message: 'Capaian Pembelajaran wajib diisi.' }, { status: 400 });
	}
	if (
		!Number.isInteger(maxLingkupMateri) ||
		maxLingkupMateri < 1 ||
		maxLingkupMateri > MAX_LINGKUP_MATERI
	) {
		return json(
			{ message: `Maksimal Lingkup Materi harus antara 1–${MAX_LINGKUP_MATERI}.` },
			{ status: 400 }
		);
	}
	if (
		!Number.isInteger(maxTujuanPembelajaran) ||
		maxTujuanPembelajaran < 1 ||
		maxTujuanPembelajaran > MAX_TUJUAN_PEMBELAJARAN
	) {
		return json(
			{ message: `Maksimal Tujuan Pembelajaran harus antara 1–${MAX_TUJUAN_PEMBELAJARAN}.` },
			{ status: 400 }
		);
	}

	const settings = await getAiSettings();
	if (!settings) {
		return json(
			{
				message:
					'Fitur AI belum aktif. Minta admin/kepala sekolah menyetel kunci API di halaman Pengaturan.'
			},
			{ status: 400 }
		);
	}

	const mapel = await db.query.tableMataPelajaran.findFirst({
		where: eq(tableMataPelajaran.id, mapelId),
		with: { kelas: { with: { semester: true } } }
	});
	if (!mapel) {
		return json({ message: 'Mata pelajaran tidak ditemukan.' }, { status: 404 });
	}
	if (locals.sekolah?.id && mapel.kelas.sekolahId !== locals.sekolah.id) {
		return json({ message: 'Mata pelajaran tidak ditemukan.' }, { status: 404 });
	}

	const kelas = mapel.kelas;
	const kelasLabel = `Kelas ${kelas.nama}${kelas.fase ? ` Fase ${kelas.fase}` : ''}`;
	const semesterAktif = kelas.semester?.nama?.trim() || '';

	try {
		const groups = await generateTujuanPembelajaran({
			apiKey: settings.apiKey,
			model: settings.model,
			baseUrl: settings.baseUrl,
			capaianPembelajaran,
			mapelNama: mapel.nama,
			kelasLabel,
			semesterAktif,
			maxLingkupMateri,
			maxTujuanPembelajaran
		});
		return json({ data: { groups }, message: 'Tujuan pembelajaran berhasil digenerate.' });
	} catch (err) {
		const message = (err as Error).message || 'Gagal generate tujuan pembelajaran.';
		return json({ message }, { status: 500 });
	}
};
