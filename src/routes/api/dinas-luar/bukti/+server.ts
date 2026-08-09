import { ensureDinasLuarSchema } from '$lib/server/db/ensure-dinas-luar';
import { tableDinasLuarBukti, tableSppd } from '$lib/server/db/schema';
import db from '$lib/server/db';
import { deleteBuktiFile, saveGambarFile, saveSppdFile } from '$lib/server/dinas-luar';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const MAX_PDF_BYTES = 10 * 1024 * 1024;
const MAX_FOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_FOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FOTO_COUNT = 3;
const MAX_PDF_COUNT = 1;

type UploadedFile = {
	buffer: Buffer;
	name: string;
	type: string;
};

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, { message: 'Harus login terlebih dahulu' });

	await ensureDinasLuarSchema();

	const formData = await request.formData();
	const idParam = formData.get('sppdId');
	const sppdId = Number(idParam);
	if (!Number.isInteger(sppdId) || sppdId <= 0) {
		throw error(400, { message: 'ID SPPD tidak valid' });
	}

	const sppd = await db.query.tableSppd.findFirst({
		where: eq(tableSppd.id, sppdId),
		columns: { id: true, sekolahId: true }
	});
	if (!sppd) throw error(404, { message: 'Perjalanan dinas tidak ditemukan' });
	if (locals.sekolah?.id && sppd.sekolahId !== locals.sekolah.id) {
		throw error(403, { message: 'Tidak dapat mengunggah bukti untuk sekolah lain' });
	}

	// Items the client wants removed as part of this save (replacement flow).
	const rawRemove = formData.get('removeIds');
	let removeIds: number[] = [];
	if (typeof rawRemove === 'string' && rawRemove.trim()) {
		try {
			const parsed = JSON.parse(rawRemove);
			if (!Array.isArray(parsed)) throw new Error('not an array');
			removeIds = parsed.filter((v) => Number.isInteger(v) && (v as number) > 0);
		} catch {
			throw error(400, { message: 'Daftar bukti yang dihapus tidak valid' });
		}
	}

	// Count existing bukti to enforce the 1 PDF / 3 foto limit.
	const existingRows = await db.query.tableDinasLuarBukti.findMany({
		where: eq(tableDinasLuarBukti.sppdId, sppdId),
		columns: { id: true, jenis: true, authUserId: true, namaFile: true }
	});
	const existingById = new Map(existingRows.map((e) => [e.id, e]));

	// Validate the removed items belong to this SPPD and the user may delete them.
	for (const id of removeIds) {
		const target = existingById.get(id);
		if (!target) throw error(404, { message: 'Bukti yang dihapus tidak ditemukan' });
		if (locals.user.type !== 'admin' && locals.user.type !== 'kepala_sekolah') {
			if (target.authUserId !== locals.user.id) {
				throw error(403, { message: 'Tidak dapat menghapus bukti pengguna lain' });
			}
		}
	}

	const existingPdf = existingRows.filter((e) => e.jenis === 'pdf').length;
	const existingFoto = existingRows.filter((e) => e.jenis === 'foto').length;
	const removedPdf = removeIds.filter((id) => existingById.get(id)?.jenis === 'pdf').length;
	const removedFoto = removeIds.filter((id) => existingById.get(id)?.jenis === 'foto').length;

	const pdfs: UploadedFile[] = [];
	const fotos: UploadedFile[] = [];

	for (const key of ['pdf', 'foto1', 'foto2', 'foto3']) {
		const value = formData.get(key);
		if (!value || typeof value === 'string') continue;
		const f = value as File;
		if (f.size === 0) continue;

		const isPdf = f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf');
		const isFoto = ALLOWED_FOTO_TYPES.includes(f.type);

		if (isPdf) {
			pdfs.push({ buffer: Buffer.from(await f.arrayBuffer()), name: f.name, type: f.type });
		} else if (isFoto) {
			fotos.push({ buffer: Buffer.from(await f.arrayBuffer()), name: f.name, type: f.type });
		} else {
			throw error(400, {
				message: 'Format file tidak didukung; hanya PDF dan foto (JPG/PNG/WebP)'
			});
		}
	}

	if (pdfs.length + fotos.length === 0 && removeIds.length === 0) {
		throw error(400, { message: 'Tidak ada perubahan yang disimpan' });
	}
	if (existingPdf - removedPdf + pdfs.length > MAX_PDF_COUNT) {
		throw error(400, { message: `Maksimal ${MAX_PDF_COUNT} file PDF untuk satu perjalanan dinas` });
	}
	if (existingFoto - removedFoto + fotos.length > MAX_FOTO_COUNT) {
		throw error(400, { message: `Maksimal ${MAX_FOTO_COUNT} foto untuk satu perjalanan dinas` });
	}
	for (const pdf of pdfs) {
		if (pdf.buffer.length > MAX_PDF_BYTES) {
			throw error(400, { message: 'Ukuran file PDF tidak boleh lebih dari 10MB' });
		}
	}
	for (const foto of fotos) {
		if (foto.buffer.length > MAX_FOTO_BYTES) {
			throw error(400, { message: 'Ukuran foto tidak boleh lebih dari 5MB' });
		}
	}

	const timestamp = Date.now();
	const savedRelPaths: string[] = [];
	const accountName = locals.user.username ?? `user_${locals.user.id}`;
	try {
		// 1. Unggah file baru terlebih dahulu agar bukti lama tidak hilang
		//    bila upload gagal di tengah jalan.
		let pdfIndex = 0;
		for (const pdf of pdfs) {
			const filename = `${locals.user.id}_${timestamp}_pdf${pdfIndex++}.pdf`;
			const rel = await saveSppdFile(sppdId, filename, pdf.buffer);
			savedRelPaths.push(rel);
			await db.insert(tableDinasLuarBukti).values({
				sppdId,
				authUserId: locals.user.id,
				jenis: 'pdf',
				namaFile: rel
			});
		}
		let fotoIndex = 0;
		for (const foto of fotos) {
			const ext = foto.type === 'image/png' ? 'png' : foto.type === 'image/webp' ? 'webp' : 'jpg';
			const filename = `${locals.user.id}_${timestamp}_foto${fotoIndex++}.${ext}`;
			const rel = await saveGambarFile(accountName, sppdId, filename, foto.buffer);
			savedRelPaths.push(rel);
			await db.insert(tableDinasLuarBukti).values({
				sppdId,
				authUserId: locals.user.id,
				jenis: 'foto',
				namaFile: rel
			});
		}

		// 2. Hapus bukti yang ditandai (setelah upload berhasil).
		for (const id of removeIds) {
			const target = existingById.get(id);
			if (!target) continue;
			await deleteBuktiFile(target.namaFile);
			await db.delete(tableDinasLuarBukti).where(eq(tableDinasLuarBukti.id, id));
		}

		return json({ message: 'Bukti perjalanan dinas berhasil diunggah' });
	} catch (e) {
		console.error('[api/dinas-luar/bukti] gagal menyimpan:', e);
		for (const rel of savedRelPaths) {
			await deleteBuktiFile(rel).catch(() => {});
		}
		throw error(500, { message: 'Gagal mengunggah bukti' });
	}
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, { message: 'Harus login terlebih dahulu' });

	await ensureDinasLuarSchema();

	const idParam = url.searchParams.get('id');
	const id = Number(idParam);
	if (!Number.isInteger(id) || id <= 0) {
		throw error(400, { message: 'ID tidak valid' });
	}

	const bukti = await db.query.tableDinasLuarBukti.findFirst({
		where: eq(tableDinasLuarBukti.id, id),
		columns: { id: true, sppdId: true, authUserId: true, namaFile: true }
	});
	if (!bukti) throw error(404, { message: 'Bukti tidak ditemukan' });

	if (locals.user.type !== 'admin' && locals.user.type !== 'kepala_sekolah') {
		if (bukti.authUserId !== locals.user.id) {
			throw error(403, { message: 'Tidak dapat menghapus bukti pengguna lain' });
		}
	} else {
		const sppd = await db.query.tableSppd.findFirst({
			where: eq(tableSppd.id, bukti.sppdId),
			columns: { sekolahId: true }
		});
		if (locals.sekolah?.id && sppd?.sekolahId !== locals.sekolah.id) {
			throw error(403, { message: 'Tidak dapat menghapus bukti sekolah lain' });
		}
	}

	await deleteBuktiFile(bukti.namaFile);
	await db.delete(tableDinasLuarBukti).where(eq(tableDinasLuarBukti.id, id));

	return json({ message: 'Bukti perjalanan dinas berhasil dihapus' });
};
