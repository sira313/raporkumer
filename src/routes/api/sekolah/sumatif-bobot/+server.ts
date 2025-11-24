import db from '$lib/server/db';
import { tableSekolah } from '$lib/server/db/schema';
import { isAuthorizedUser } from '../../../pengguna/permissions';
import { json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function GET({ locals }) {
	const sekolah = locals.sekolah ?? null;
	if (!sekolah) return json({ error: 'Sekolah tidak ditemukan.' }, { status: 401 });

	return json({
		lingkup: Number(sekolah.sumatifBobotLingkup ?? 60),
		sts: Number(sekolah.sumatifBobotSts ?? 20),
		sas: Number(sekolah.sumatifBobotSas ?? 20)
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
	const lingkup = Number(payload['lingkup'] ?? NaN);
	const sts = Number(payload['sts'] ?? NaN);
	const sas = Number(payload['sas'] ?? NaN);

	if (!Number.isFinite(lingkup) || !Number.isFinite(sts) || !Number.isFinite(sas)) {
		return json({ error: 'Nilai bobot harus angka.' }, { status: 400 });
	}

	const intLingkup = Math.max(0, Math.min(100, Math.round(lingkup)));
	const intSts = Math.max(0, Math.min(100, Math.round(sts)));
	const intSas = Math.max(0, Math.min(100, Math.round(sas)));

	if (intLingkup + intSts + intSas !== 100) {
		return json({ error: 'Jumlah bobot harus berjumlah 100.' }, { status: 400 });
	}

	try {
		await db
			.update(tableSekolah)
			.set({
				sumatifBobotLingkup: intLingkup,
				sumatifBobotSts: intSts,
				sumatifBobotSas: intSas,
				updatedAt: new Date().toISOString()
			})
			.where(eq(tableSekolah.id, sekolah.id));
	} catch (err) {
		console.error('Gagal menyimpan bobot sumatif', err);
		return json({ error: 'Gagal menyimpan bobot.' }, { status: 500 });
	}

	return json({ message: 'Bobot sumatif berhasil diperbarui.' });
}
