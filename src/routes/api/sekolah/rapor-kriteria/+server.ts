import db from '$lib/server/db';
import { tableSekolah, tableKelas } from '$lib/server/db/schema';
import { isAuthorizedUser } from '../../../pengguna/permissions';
import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

const DEFAULT_CUKUP = 85;
const DEFAULT_BAIK = 95;

function parseKelasId(value: string | null): number | null {
	if (!value) return null;
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Wali kelas may only manage criteria for a class they own. Admin, kepala
 * sekolah, and users with the `informasi_umum_sekolah` permission may manage
 * any class (or the school-wide fallback when no class is given).
 */
async function canManageKelas(user: NonNullable<App.Locals['user']>, kelasId: number) {
	if (user.type === 'admin' || user.type === 'kepala_sekolah') return true;
	if (user.type === 'wali_kelas' && user.pegawaiId) {
		const kelas = await db.query.tableKelas.findFirst({
			columns: { waliKelasId: true },
			where: eq(tableKelas.id, kelasId)
		});
		return kelas?.waliKelasId === user.pegawaiId;
	}
	return isAuthorizedUser(['informasi_umum_sekolah'], user);
}

export async function GET({ url, locals }) {
	const sekolah = locals.sekolah ?? null;
	if (!sekolah) return json({ error: 'Sekolah tidak ditemukan.' }, { status: 401 });

	const kelasId = parseKelasId(url.searchParams.get('kelas_id'));

	if (kelasId) {
		const kelas = await db.query.tableKelas.findFirst({
			columns: { id: true, sekolahId: true, raporKriteriaCukup: true, raporKriteriaBaik: true },
			where: eq(tableKelas.id, kelasId)
		});
		if (!kelas || kelas.sekolahId !== sekolah.id) {
			return json({ error: 'Kelas tidak ditemukan.' }, { status: 404 });
		}
		return json({
			cukup: Number(kelas.raporKriteriaCukup ?? sekolah.raporKriteriaCukup ?? DEFAULT_CUKUP),
			baik: Number(kelas.raporKriteriaBaik ?? sekolah.raporKriteriaBaik ?? DEFAULT_BAIK)
		});
	}

	return json({
		cukup: Number(sekolah.raporKriteriaCukup ?? DEFAULT_CUKUP),
		baik: Number(sekolah.raporKriteriaBaik ?? DEFAULT_BAIK)
	});
}

export async function PUT({ request, locals }) {
	const user = locals.user ?? null;
	if (!user) return json({ error: 'Autentikasi diperlukan.' }, { status: 401 });

	const sekolah = locals.sekolah ?? null;
	if (!sekolah) return json({ error: 'Sekolah tidak ditemukan.' }, { status: 401 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Payload tidak valid.' }, { status: 400 });
	}

	const payload = body as Record<string, unknown>;
	const cukupRaw = payload['cukup'];
	const baikRaw = payload['baik'];
	const clearing = cukupRaw == null && baikRaw == null;

	let intCukup = 85;
	let intBaik = 95;
	if (!clearing) {
		const cukup = Number(cukupRaw ?? NaN);
		const baik = Number(baikRaw ?? NaN);

		if (!Number.isFinite(cukup) || !Number.isFinite(baik)) {
			return json({ error: 'Nilai kriteria harus angka.' }, { status: 400 });
		}

		intCukup = Math.max(0, Math.min(100, Math.round(cukup)));
		intBaik = Math.max(0, Math.min(100, Math.round(baik)));

		// ensure logical order: baik >= cukup
		if (intBaik < intCukup) {
			const tmp = intBaik;
			intBaik = intCukup;
			intCukup = tmp;
		}
	}

	const kelasId = parseKelasId(payload['kelas_id'] == null ? null : String(payload['kelas_id']));

	try {
		if (kelasId) {
			const kelas = await db.query.tableKelas.findFirst({
				columns: { id: true, sekolahId: true },
				where: eq(tableKelas.id, kelasId)
			});
			if (!kelas || kelas.sekolahId !== sekolah.id) {
				return json({ error: 'Kelas tidak ditemukan.' }, { status: 404 });
			}
			if (!(await canManageKelas(user, kelasId))) {
				return json({ error: 'Tidak memiliki izin.' }, { status: 403 });
			}
			// null, null clears the class override so it falls back to school-level values
			await db
				.update(tableKelas)
				.set(
					clearing
						? {
								raporKriteriaCukup: null,
								raporKriteriaBaik: null,
								updatedAt: new Date().toISOString()
							}
						: {
								raporKriteriaCukup: intCukup,
								raporKriteriaBaik: intBaik,
								updatedAt: new Date().toISOString()
							}
				)
				.where(eq(tableKelas.id, kelasId));
			return json({
				message: clearing
					? 'Kriteria kelas dikembalikan ke setelan sekolah.'
					: 'Kriteria rapor kelas berhasil diperbarui.'
			});
		}

		if (clearing) {
			return json({ error: 'Setelan sekolah tidak dapat dihapus.' }, { status: 400 });
		}
		if (!isAuthorizedUser(['informasi_umum_sekolah'], user)) {
			return json({ error: 'Tidak memiliki izin.' }, { status: 403 });
		}
		await db
			.update(tableSekolah)
			.set({
				raporKriteriaCukup: intCukup,
				raporKriteriaBaik: intBaik,
				updatedAt: new Date().toISOString()
			})
			.where(eq(tableSekolah.id, sekolah.id));
		return json({ message: 'Kriteria rapor berhasil diperbarui.' });
	} catch (err) {
		console.error('Gagal menyimpan kriteria rapor', err);
		return json({ error: 'Gagal menyimpan kriteria.' }, { status: 500 });
	}
}
