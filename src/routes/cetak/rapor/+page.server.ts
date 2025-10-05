import { error } from '@sveltejs/kit';
import { asc, and, eq } from 'drizzle-orm';
import db from '$lib/server/db';
import {
	tableAsesmenEkstrakurikuler,
	tableAsesmenKokurikuler,
	tableAsesmenSumatif,
	tableMurid
} from '$lib/server/db/schema';
import { jenisMapel, type DimensiProfilLulusanKey } from '$lib/statics';
import {
	buildKokurikulerDeskripsi,
	isNilaiKategori as isKokurikulerNilaiKategori,
	isProfilDimensionKey,
	type NilaiKategori
} from '$lib/kokurikuler';
import {
	buildEkstrakurikulerDeskripsi,
	isEkstrakurikulerNilaiKategori,
	type EkstrakurikulerNilaiKategori
} from '$lib/ekstrakurikuler';
import type { PageServerLoad } from './$types';

const LOCALE_ID = 'id-ID';

function requireInteger(paramName: string, value: string | null): number {
	if (!value) {
		throw error(400, `Parameter ${paramName} wajib diisi.`);
	}
	const parsed = Number(value);
	if (!Number.isInteger(parsed)) {
		throw error(400, `Parameter ${paramName} tidak valid.`);
	}
	return parsed;
}

function optionalInteger(paramName: string, value: string | null): number | null {
	if (!value) return null;
	const parsed = Number(value);
	if (!Number.isInteger(parsed)) {
		throw error(400, `Parameter ${paramName} tidak valid.`);
	}
	return parsed;
}

function composeAlamat(sekolah: NonNullable<App.Locals['sekolah']>): string {
	const alamat = sekolah.alamat;
	if (!alamat) return '';
	const parts = [alamat.jalan, alamat.desa, alamat.kecamatan, alamat.kabupaten, alamat.provinsi]
		.map((part) => (part ?? '').trim())
		.filter(Boolean);
	return parts.join(', ');
}

function formatNilai(value: number | null | undefined): string {
	if (value === null || value === undefined) return '—';
	return new Intl.NumberFormat(LOCALE_ID, {
		maximumFractionDigits: Number.isInteger(value) ? 0 : 2
	}).format(value);
}

function formatTanggal(value: string | null | undefined): string {
	if (!value) return '';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return '';
	return new Intl.DateTimeFormat(LOCALE_ID, {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	}).format(parsed);
}

function fallbackTempat(sekolah: NonNullable<App.Locals['sekolah']>): string {
	const alamat = sekolah.alamat;
	if (!alamat) return '';
	return alamat.kabupaten || alamat.kecamatan || alamat.desa || '';
}

export const load = (async ({ locals, url, depends }) => {
	depends('app:cetak-rapor');

	const sekolah = locals.sekolah;
	if (!sekolah?.id) {
		throw error(404, 'Sekolah tidak ditemukan.');
	}

	const muridId = requireInteger('murid_id', url.searchParams.get('murid_id'));
	const kelasId = optionalInteger('kelas_id', url.searchParams.get('kelas_id'));

	const murid = await db.query.tableMurid.findFirst({
		where: and(
			eq(tableMurid.id, muridId),
			eq(tableMurid.sekolahId, sekolah.id),
			kelasId ? eq(tableMurid.kelasId, kelasId) : undefined
		),
		with: {
			kelas: {
				with: {
					waliKelas: true,
					tahunAjaran: true,
					semester: true
				}
			},
			semester: true,
			kehadiran: true,
			catatanWali: true
		}
	});

	if (!murid) {
		throw error(404, 'Data murid tidak ditemukan.');
	}

	if (kelasId && murid.kelasId !== kelasId) {
		throw error(400, 'Murid tidak terdaftar pada kelas yang diminta.');
	}

	const [asesmenSumatif, asesmenEkstrakurikuler, asesmenKokurikuler] = await Promise.all([
		db.query.tableAsesmenSumatif.findMany({
			where: eq(tableAsesmenSumatif.muridId, murid.id),
			with: {
				mataPelajaran: true
			},
			orderBy: [asc(tableAsesmenSumatif.mataPelajaranId)]
		}),
		db.query.tableAsesmenEkstrakurikuler.findMany({
			where: eq(tableAsesmenEkstrakurikuler.muridId, murid.id),
			with: {
				ekstrakurikuler: true,
				tujuan: true
			},
			orderBy: [
				asc(tableAsesmenEkstrakurikuler.ekstrakurikulerId),
				asc(tableAsesmenEkstrakurikuler.tujuanId)
			]
		}),
		db.query.tableAsesmenKokurikuler.findMany({
			where: eq(tableAsesmenKokurikuler.muridId, murid.id)
		})
	]);

	const nilaiIntrakurikuler = asesmenSumatif
		.filter((item) => item.mataPelajaran)
		.map((item) => {
			const mapel = item.mataPelajaran!;
			return {
				kelompok: jenisMapel[mapel.jenis] ?? null,
				mataPelajaran: mapel.nama,
				nilaiAkhir: formatNilai(item.nilaiAkhir ?? null),
				deskripsi: '—'
			};
		})
		.sort((a, b) => a.mataPelajaran.localeCompare(b.mataPelajaran, LOCALE_ID));

	const ekstrakurikulerGrouped = new Map<
		number,
		{
			nama: string;
			parts: Array<{ kategori: EkstrakurikulerNilaiKategori; tujuan: string }>;
		}
	>();

	for (const item of asesmenEkstrakurikuler) {
		const kegiatan = item.ekstrakurikuler;
		if (!kegiatan) continue;
		if (!isEkstrakurikulerNilaiKategori(item.kategori)) continue;
		const tujuan = item.tujuan?.deskripsi?.trim();
		if (!tujuan) continue;
		const group = ekstrakurikulerGrouped.get(kegiatan.id) ?? {
			nama: kegiatan.nama,
			parts: []
		};
		group.parts.push({ kategori: item.kategori, tujuan });
		ekstrakurikulerGrouped.set(kegiatan.id, group);
	}

	const ekstrakurikuler = Array.from(ekstrakurikulerGrouped.values())
		.map((entry) => ({
			nama: entry.nama,
			deskripsi: buildEkstrakurikulerDeskripsi(entry.parts) ?? 'Belum ada catatan.'
		}))
		.sort((a, b) => a.nama.localeCompare(b.nama, LOCALE_ID));

	const kokurikulerParts: Array<{ kategori: NilaiKategori; dimensi: DimensiProfilLulusanKey }> = [];
	for (const item of asesmenKokurikuler) {
		if (!isKokurikulerNilaiKategori(item.kategori)) continue;
		if (!isProfilDimensionKey(item.dimensi)) continue;
		kokurikulerParts.push({ kategori: item.kategori, dimensi: item.dimensi });
	}

	const kokurikuler =
		buildKokurikulerDeskripsi(kokurikulerParts) ??
		'Belum ada catatan kokurikuler.';

	const ttdTanggal = formatTanggal(murid.semester?.tanggalBagiRaport);

	const raporData: RaporPrintData = {
		sekolah: {
			nama: sekolah.nama,
			alamat: composeAlamat(sekolah),
			logoUrl: null
		},
		murid: {
			nama: murid.nama,
			nis: murid.nis,
			nisn: murid.nisn
		},
		rombel: {
			nama: murid.kelas?.nama ?? '',
			fase: murid.kelas?.fase ?? ''
		},
		periode: {
			tahunPelajaran:
				murid.kelas?.tahunAjaran?.nama ?? murid.semester?.nama ?? '',
			semester: murid.semester?.nama ?? murid.semester?.tipe ?? ''
		},
		waliKelas: {
			nama: murid.kelas?.waliKelas?.nama ?? '',
			nip: murid.kelas?.waliKelas?.nip ?? null
		},
		kepalaSekolah: {
			nama: sekolah.kepalaSekolah?.nama ?? '',
			nip: sekolah.kepalaSekolah?.nip ?? null
		},
		nilaiIntrakurikuler,
		kokurikuler,
		ekstrakurikuler,
		ketidakhadiran: {
			sakit: murid.kehadiran?.sakit ?? 0,
			izin: murid.kehadiran?.izin ?? 0,
			tanpaKeterangan: murid.kehadiran?.alfa ?? 0
		},
		catatanWali: murid.catatanWali?.catatan?.trim() ?? '',
		tanggapanOrangTua: '',
		ttd: {
			tempat: fallbackTempat(sekolah),
			tanggal: ttdTanggal
		}
	};

	return {
		meta: {
			title: `Rapor - ${murid.nama}`
		},
		raporData
	};
}) satisfies PageServerLoad;
