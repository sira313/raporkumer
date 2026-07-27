import { ensureBukuTamuSchema } from '$lib/server/db/ensure-buku-tamu';
import { tableBukuTamu, tableSekolah, tableTahunAjaran, tableSemester } from '$lib/server/db/schema';
import db from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function resolveSekolahContext(sekolahId?: number) {
	let sid: number;
	if (sekolahId) {
		sid = sekolahId;
	} else {
		const sekolah = await db.query.tableSekolah.findFirst();
		if (!sekolah) throw error(500, { message: 'Belum ada data sekolah' });
		sid = sekolah.id;
	}

	let tahunAjaranId: number | null = null;
	let semesterId: number | null = null;

	const ta = await db.query.tableTahunAjaran.findFirst({
		where: eq(tableTahunAjaran.sekolahId, sid),
		orderBy: [desc(tableTahunAjaran.id)]
	});
	if (ta) {
		tahunAjaranId = ta.id;
		const smt = await db.query.tableSemester.findFirst({
			where: eq(tableSemester.tahunAjaranId, ta.id),
			orderBy: [desc(tableSemester.id)]
		});
		if (smt) semesterId = smt.id;
	}

	return { sekolahId: sid, tahunAjaranId, semesterId };
}

export const POST = (async ({ request, locals }) => {
	await ensureBukuTamuSchema();

	const body = await request.json();
	const { nama, asalInstansi, nip, keperluan, pesanKesan, tandaTangan } = body ?? {};

	const trimmedNama = typeof nama === 'string' ? nama.trim() : '';
	const trimmedAsal = typeof asalInstansi === 'string' ? asalInstansi.trim() : '';
	const trimmedKeperluan = typeof keperluan === 'string' ? keperluan.trim() : '';

	if (!trimmedNama) {
		throw error(400, { message: 'Nama wajib diisi' });
	}
	if (!trimmedAsal) {
		throw error(400, { message: 'Asal/Instansi wajib diisi' });
	}
	if (!trimmedKeperluan) {
		throw error(400, { message: 'Keperluan wajib diisi' });
	}

	const ctx = await resolveSekolahContext(locals.sekolah?.id);

	await db.insert(tableBukuTamu).values({
		...ctx,
		nama: trimmedNama,
		asalInstansi: trimmedAsal,
		nip: typeof nip === 'string' && nip.trim() ? nip.trim() : null,
		keperluan: trimmedKeperluan,
		pesanKesan: typeof pesanKesan === 'string' && pesanKesan.trim() ? pesanKesan.trim() : null,
		tandaTangan: typeof tandaTangan === 'string' && tandaTangan.trim() ? tandaTangan.trim() : null
	});

	return json({ message: 'Buku tamu berhasil disimpan. Terima kasih!' });
}) satisfies RequestHandler;

export const DELETE = (async ({ url, locals }) => {
	if (!locals.user || locals.user.type !== 'admin') {
		throw error(403, { message: 'Hanya admin yang dapat menghapus data' });
	}

	await ensureBukuTamuSchema();

	const idParam = url.searchParams.get('id');
	const id = Number(idParam);
	if (!Number.isInteger(id) || id <= 0) {
		throw error(400, { message: 'ID tidak valid' });
	}

	await db.delete(tableBukuTamu).where(eq(tableBukuTamu.id, id));

	return json({ message: 'Data tamu berhasil dihapus' });
}) satisfies RequestHandler;
