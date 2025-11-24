import db from '$lib/server/db';
import { tableSekolah } from '$lib/server/db/schema';
import { isAuthorizedUser } from '../../../pengguna/permissions';
import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function GET({ locals }) {
	const sekolah = locals.sekolah ?? null;
	if (!sekolah) return json({ error: 'Sekolah tidak ditemukan.' }, { status: 401 });

	return json({
		cukup: Number(sekolah.raporKriteriaCukup ?? 85),
		baik: Number(sekolah.raporKriteriaBaik ?? 95)
	});
}

export async function PUT({ request, locals }) {
	if (!isAuthorizedUser(['sekolah_manage'], locals.user)) {
		return json({ error: 'Tidak memiliki izin.' }, { status: 403 });
	}

	const sekolah = locals.sekolah ?? null;
	if (!sekolah) return json({ error: 'Sekolah tidak ditemukan.' }, { status: 401 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Payload tidak valid.' }, { status: 400 });
	}

	const payload = body as Record<string, unknown>;
	const cukup = Number(payload['cukup'] ?? NaN);
	const baik = Number(payload['baik'] ?? NaN);

	if (!Number.isFinite(cukup) || !Number.isFinite(baik)) {
		return json({ error: 'Nilai kriteria harus angka.' }, { status: 400 });
	}

	let intCukup = Math.max(0, Math.min(100, Math.round(cukup)));
	let intBaik = Math.max(0, Math.min(100, Math.round(baik)));

	// ensure logical order: baik >= cukup
	if (intBaik < intCukup) {
		const tmp = intBaik;
		intBaik = intCukup;
		intCukup = tmp;
	}

	try {
		await db
			.update(tableSekolah)
			.set({
				raporKriteriaCukup: intCukup,
				raporKriteriaBaik: intBaik,
				updatedAt: new Date().toISOString()
			})
			.where(eq(tableSekolah.id, sekolah.id));
	} catch (err) {
		console.error('Gagal menyimpan kriteria rapor', err);
		return json({ error: 'Gagal menyimpan kriteria.' }, { status: 500 });
	}

	return json({ message: 'Kriteria rapor berhasil diperbarui.' });
}
