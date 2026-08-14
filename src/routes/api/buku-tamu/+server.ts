import { ensureBukuTamuSchema } from '$lib/server/db/ensure-buku-tamu';
import { tableBukuTamu, tableTahunAjaran, tableSemester } from '$lib/server/db/schema';
import db from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import { deleteSignatureFile, saveSignatureFile } from '$lib/server/ttd';
import { isBukuTamuUnlocked, resolveBukuTamuSekolahId } from '$lib/server/buku-tamu-pass';
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

export const POST = (async ({ request, locals, cookies }) => {
	await ensureBukuTamuSchema();

	// Enforce the passkey gate (if configured) on direct API submissions too.
	const sekolahId = await resolveBukuTamuSekolahId(locals.sekolah?.id);
	if (sekolahId && !(await isBukuTamuUnlocked(cookies, sekolahId))) {
		throw error(403, { message: 'Passkey buku tamu diperlukan untuk mengisi buku tamu.' });
	}

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

	const rawTandaTangan =
		typeof tandaTangan === 'string' && tandaTangan.trim() ? tandaTangan.trim() : null;
	const storedSignature = rawTandaTangan
		? await saveSignatureFile(
				'tamu',
				`tamu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.png`,
				rawTandaTangan
			)
		: null;

	try {
		await db.insert(tableBukuTamu).values({
			...ctx,
			nama: trimmedNama,
			asalInstansi: trimmedAsal,
			nip: typeof nip === 'string' && nip.trim() ? nip.trim() : null,
			keperluan: trimmedKeperluan,
			pesanKesan: typeof pesanKesan === 'string' && pesanKesan.trim() ? pesanKesan.trim() : null,
			tandaTangan: storedSignature
		});
	} catch (e) {
		// Don't leave an orphan file behind if the DB insert fails.
		if (storedSignature) {
			await deleteSignatureFile(storedSignature);
		}
		throw e;
	}

	return json({ message: 'Buku tamu berhasil disimpan. Terima kasih!' });
}) satisfies RequestHandler;

export const DELETE = (async ({ url, locals }) => {
	if (!locals.user || (locals.user.type !== 'admin' && locals.user.type !== 'kepala_sekolah')) {
		throw error(403, { message: 'Hanya admin yang dapat menghapus data' });
	}

	await ensureBukuTamuSchema();

	const idParam = url.searchParams.get('id');
	const id = Number(idParam);
	if (!Number.isInteger(id) || id <= 0) {
		throw error(400, { message: 'ID tidak valid' });
	}

	const existing = await db.query.tableBukuTamu.findFirst({
		columns: { tandaTangan: true },
		where: eq(tableBukuTamu.id, id)
	});

	await db.delete(tableBukuTamu).where(eq(tableBukuTamu.id, id));

	// Legacy data-URL values are skipped by deleteSignatureFile (invalid rel path).
	if (existing?.tandaTangan) {
		await deleteSignatureFile(existing.tandaTangan);
	}

	return json({ message: 'Data tamu berhasil dihapus' });
}) satisfies RequestHandler;
