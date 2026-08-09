import { ensureDinasLuarSchema } from '$lib/server/db/ensure-dinas-luar';
import { tableDinasLuarBukti, tableSppd } from '$lib/server/db/schema';
import db from '$lib/server/db';
import { readBuktiFile } from '$lib/server/dinas-luar';
import { renderPDF } from '$lib/server/pdf/pagedpdf';
import { renderBuktiFotoHTML } from '$lib/server/pdf/templates/bukti-foto';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { PDFDocument } from 'pdf-lib';
import type { RequestHandler } from './$types';

function fotoMime(filename: string): string {
	const lower = filename.toLowerCase();
	if (lower.endsWith('.png')) return 'image/png';
	if (lower.endsWith('.webp')) return 'image/webp';
	return 'image/jpeg';
}

export const GET: RequestHandler = async ({ locals, url }) => {
	if (!locals.user) throw error(401, { message: 'Harus login terlebih dahulu' });

	await ensureDinasLuarSchema();

	const idParam = url.searchParams.get('sppdId');
	const sppdId = Number(idParam);
	if (!Number.isInteger(sppdId) || sppdId <= 0) {
		throw error(400, { message: 'ID SPPD tidak valid' });
	}

	const sppd = await db.query.tableSppd.findFirst({
		where: eq(tableSppd.id, sppdId),
		columns: { id: true, sekolahId: true, maksud: true }
	});
	if (!sppd) throw error(404, { message: 'Perjalanan dinas tidak ditemukan' });
	if (locals.sekolah?.id && sppd.sekolahId !== locals.sekolah.id) {
		throw error(403, { message: 'Tidak dapat mengakses bukti sekolah lain' });
	}

	const buktiRows = await db.query.tableDinasLuarBukti.findMany({
		where: eq(tableDinasLuarBukti.sppdId, sppdId),
		columns: { id: true, jenis: true, namaFile: true },
		orderBy: (t, { asc }) => [asc(t.id)]
	});
	if (buktiRows.length === 0) {
		throw error(404, { message: 'Belum ada bukti perjalanan dinas' });
	}

	const pdfBuffers: Uint8Array[] = [];
	const fotos = buktiRows.filter((b) => b.jenis === 'foto');
	const pdfs = buktiRows.filter((b) => b.jenis === 'pdf');

	// 1. Compile semua foto ke satu halaman PDF agar mudah dicetak.
	if (fotos.length > 0) {
		const fotoSlots: { src: string; nama: string }[] = [];
		for (const foto of fotos) {
			const buf = await readBuktiFile(foto.namaFile);
			if (!buf) continue;
			const mime = fotoMime(foto.namaFile);
			const filename = foto.namaFile.split('/').pop() ?? 'foto';
			fotoSlots.push({
				src: `data:${mime};base64,${Buffer.from(buf).toString('base64')}`,
				nama: filename
			});
		}
		if (fotoSlots.length > 0) {
			const html = renderBuktiFotoHTML({ kegiatan: sppd.maksud, fotos: fotoSlots });
			pdfBuffers.push(await renderPDF(html));
		}
	}

	// 2. Ambil file PDF bukti yang sudah diunggah.
	for (const pdf of pdfs) {
		const buf = await readBuktiFile(pdf.namaFile);
		if (buf) pdfBuffers.push(buf);
	}

	if (pdfBuffers.length === 0) {
		throw error(404, { message: 'File bukti tidak ditemukan' });
	}

	// 3. Gabungkan semuanya menjadi satu PDF.
	const merged = await PDFDocument.create();
	for (const buf of pdfBuffers) {
		const src = await PDFDocument.load(buf);
		const pages = await merged.copyPages(src, src.getPageIndices());
		for (const page of pages) merged.addPage(page);
	}
	const result = await merged.save();

	return new Response(new Uint8Array(result), {
		headers: {
			'Content-Type': 'application/pdf',
			'Content-Disposition': `inline; filename="bukti-perjalanan-dinas-${sppdId}.pdf"`,
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
