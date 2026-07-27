import { error } from '@sveltejs/kit';
import { and, asc, eq, sql } from 'drizzle-orm';
import db from '$lib/server/db';
import { ensureBukuTamuSchema } from '$lib/server/db/ensure-buku-tamu';
import { tableBukuTamu, tableSekolah } from '$lib/server/db/schema';
import { renderPDF } from '$lib/server/pdf/pagedpdf';
import { renderBukuTamuHTML } from '$lib/server/pdf/templates/buku-tamu';
import { formatTanggal } from '$lib/server/pdf/preview-utils';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, url }) => {
	const sekolahId = locals.sekolah?.id;
	if (!sekolahId || !locals.user) {
		throw error(401, 'Unauthorized');
	}

	await ensureBukuTamuSchema();

	const tanggalMulai = url.searchParams.get('tanggal_mulai');
	const tanggalSelesai = url.searchParams.get('tanggal_selesai');

	if (!tanggalMulai || !tanggalSelesai) {
		throw error(400, 'Parameter tanggal_mulai dan tanggal_selesai wajib diisi');
	}

	const rows = await db
		.select({
			id: tableBukuTamu.id,
			nama: tableBukuTamu.nama,
			asalInstansi: tableBukuTamu.asalInstansi,
			nip: tableBukuTamu.nip,
			keperluan: tableBukuTamu.keperluan,
			pesanKesan: tableBukuTamu.pesanKesan,
			tandaTangan: tableBukuTamu.tandaTangan,
			createdAt: tableBukuTamu.createdAt
		})
		.from(tableBukuTamu)
		.where(
			and(
				sql`date(${tableBukuTamu.createdAt}) >= ${tanggalMulai}`,
				sql`date(${tableBukuTamu.createdAt}) <= ${tanggalSelesai}`
			)
		)
		.orderBy(asc(tableBukuTamu.createdAt));

	const sekolah = await db.query.tableSekolah.findFirst({
		columns: { nama: true },
		where: eq(tableSekolah.id, sekolahId)
	});

	const printRows = rows.map((row, i) => ({
		no: i + 1,
		tanggal: formatTanggal(row.createdAt),
		nama: row.nama,
		asalInstansi: row.asalInstansi,
		nip: row.nip ?? '',
		keperluan: row.keperluan,
		pesanKesan: row.pesanKesan ?? '',
		tandaTangan: row.tandaTangan ?? ''
	}));

	const printData = {
		sekolah: {
			nama: sekolah?.nama ?? ''
		},
		periode: {
			tanggalMulai: formatTanggal(tanggalMulai),
			tanggalSelesai: formatTanggal(tanggalSelesai)
		},
		rows: printRows,
		totalKunjungan: rows.length
	};

	const html = renderBukuTamuHTML(printData);
	const pdf = await renderPDF(html);
	const pdfBuffer = Buffer.from(pdf);

	return new Response(new Blob([pdfBuffer], { type: 'application/pdf' }), {
		headers: {
			'Content-Disposition': `inline; filename="buku-tamu.pdf"`
		}
	});
}) satisfies RequestHandler;
