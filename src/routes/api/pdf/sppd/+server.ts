import { error } from '@sveltejs/kit';
import { and, eq, inArray, sql } from 'drizzle-orm';
import db from '$lib/server/db';
import { ensureSppdSchema } from '$lib/server/db/ensure-sppd';
import {
	tableAuthUser,
	tableSekolah,
	tableSppd,
	tableSppdPegawai,
	tableSppdPengikut
} from '$lib/server/db/schema';
import { renderPDF } from '$lib/server/pdf/pagedpdf';
import { renderSppdHTML, type SppdPrintData } from '$lib/server/pdf/templates/sppd';
import {
	fallbackTempat,
	formatTanggal,
	getLogoDinasSrc,
	getLogoSrc
} from '$lib/server/pdf/preview-utils';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) throw error(401, 'Unauthorized');
	if (user.type !== 'admin' && user.type !== 'kepala_sekolah') {
		throw error(403, 'Hanya admin yang dapat mencetak surat perintah perjalanan dinas.');
	}

	const id = Number(url.searchParams.get('id'));
	if (!Number.isInteger(id) || id <= 0) {
		throw error(400, 'ID tidak valid.');
	}

	await ensureSppdSchema();

	const sekolahId = locals.sekolah?.id;

	const sppd = await db.query.tableSppd.findFirst({
		where: and(eq(tableSppd.id, id), sekolahId ? eq(tableSppd.sekolahId, sekolahId) : undefined),
		with: {
			pegawai: {
				columns: { id: true, authUserId: true, nama: true, urutan: true },
				orderBy: [sql`${tableSppdPegawai.urutan} asc, ${tableSppdPegawai.id} asc`]
			},
			pengikut: {
				columns: { nama: true, tempatLahir: true, tanggalLahir: true },
				orderBy: [sql`${tableSppdPengikut.id} asc`]
			}
		}
	});

	if (!sppd) {
		throw error(404, 'Data dinas luar tidak ditemukan.');
	}

	const authUserIds = sppd.pegawai.map((p) => p.authUserId).filter((v): v is number => v != null);

	const users = authUserIds.length
		? await db.query.tableAuthUser.findMany({
				columns: {
					id: true,
					namaLengkap: true,
					pangkat: true,
					golongan: true,
					jabatan: true
				},
				with: { pegawai: { columns: { nama: true, nip: true } } },
				where: inArray(tableAuthUser.id, authUserIds)
			})
		: [];
	const userById = new Map(users.map((u) => [u.id, u]));

	// Treat placeholder '-' as empty so print output uses the same '—' fallback everywhere.
	const clean = (v: string | null | undefined) => (v === '-' ? '' : (v ?? ''));

	const pegawai = sppd.pegawai.map((p) => {
		const u = p.authUserId != null ? userById.get(p.authUserId) : undefined;
		return {
			nama: u?.namaLengkap?.trim() || p.nama,
			pangkat: clean(u?.pangkat),
			golongan: clean(u?.golongan),
			nip: clean(u?.pegawai?.nip),
			jabatan: clean(u?.jabatan),
			tingkatBiaya: clean(sppd.tingkatBiaya)
		};
	});

	const pengikut = sppd.pengikut.map((p) => ({
		nama: p.nama,
		tempatLahir: p.tempatLahir,
		tanggalLahir: formatTanggal(p.tanggalLahir)
	}));

	const sekolah = await db.query.tableSekolah.findFirst({
		columns: { logo: false, logoDinas: false },
		with: { alamat: true, kepalaSekolah: true },
		where: sekolahId ? eq(tableSekolah.id, sekolahId) : undefined
	});
	if (!sekolah) {
		throw error(404, 'Sekolah tidak ditemukan.');
	}

	const [logoSrc, logoDinasSrc] = await Promise.all([
		getLogoSrc(sekolah.id),
		getLogoDinasSrc(sekolah.id)
	]);

	const data: SppdPrintData = {
		sekolah: {
			id: sekolah.id,
			nama: sekolah.nama,
			jenjang: sekolah.jenjangPendidikan,
			npsn: sekolah.npsn,
			alamat: {
				jalan: sekolah.alamat?.jalan ?? '',
				desa: sekolah.alamat?.desa ?? '',
				kecamatan: sekolah.alamat?.kecamatan ?? '',
				kabupaten: sekolah.alamat?.kabupaten ?? ''
			},
			website: sekolah.website ?? null,
			email: sekolah.email ?? null,
			logoUrl: logoSrc,
			logoDinasUrl: logoDinasSrc
		},
		surat: {
			nomor: clean(sppd.nomorSuratTugas),
			tanggal: formatTanggal(sppd.tanggalSuratTugas) || formatTanggal(new Date()),
			dasar: clean(sppd.dasarSuratTugas),
			maksud: clean(sppd.maksud),
			alatAngkut: clean(sppd.alatAngkut),
			tempatBerangkat: clean(sppd.tempatBerangkat),
			tempatTujuan: clean(sppd.tempatTujuan),
			lamanya: clean(sppd.lamanya),
			tanggalBerangkat: formatTanggal(sppd.tanggalBerangkat),
			tanggalKembali: formatTanggal(sppd.tanggalKembali),
			keteranganPengikut: clean(sppd.keteranganPengikut),
			kodeRekening: clean(sppd.kodeRekening),
			keteranganLain: clean(sppd.keteranganLain)
		},
		pegawai,
		pengikut,
		ttd: {
			tempat: fallbackTempat(sekolah as unknown as NonNullable<App.Locals['sekolah']>),
			tanggal: formatTanggal(sppd.tanggalSuratTugas) || formatTanggal(new Date()),
			statusKepalaSekolah: sekolah.statusKepalaSekolah ?? 'definitif',
			nama: clean(sekolah.kepalaSekolah?.nama),
			nip: clean(sekolah.kepalaSekolah?.nip)
		}
	};

	let pdfBuffer: Uint8Array;
	try {
		pdfBuffer = await renderPDF(renderSppdHTML(data));
	} catch (e) {
		console.error('SPPD PDF generation failed:', e);
		throw error(500, 'Gagal menghasilkan PDF: ' + (e instanceof Error ? e.message : String(e)));
	}

	const slug = `sppd-${id}`;
	return new Response(new Blob([pdfBuffer as unknown as BlobPart], { type: 'application/pdf' }), {
		headers: {
			'Content-Disposition': `inline; filename="${slug}.pdf"`
		}
	});
};
