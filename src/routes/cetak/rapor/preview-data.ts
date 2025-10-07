import { error } from '@sveltejs/kit';
import { asc, and, eq } from 'drizzle-orm';
import db from '$lib/server/db';
import {
	tableAsesmenEkstrakurikuler,
	tableAsesmenKokurikuler,
	tableAsesmenSumatif,
	tableAsesmenSumatifTujuan,
	tableMurid
} from '$lib/server/db/schema';
import { jenisMapel, type DimensiProfilLulusanKey } from '$lib/statics';
import {
	buildKokurikulerNarrative,
	DEFAULT_KOKURIKULER_MESSAGE,
	type NilaiKategori,
	isNilaiKategori as isKokurikulerNilaiKategori,
	isProfilDimensionKey
} from '$lib/kokurikuler';
import {
	buildEkstrakurikulerDeskripsi,
	isEkstrakurikulerNilaiKategori,
	type EkstrakurikulerNilaiKategori
} from '$lib/ekstrakurikuler';

const LOCALE_ID = 'id-ID';

export type RaporContext = {
	locals: App.Locals;
	url: URL;
};

type PredikatKey = 'perlu-bimbingan' | 'cukup' | 'baik' | 'sangat-baik';

type TujuanScoreEntry = {
	tujuanPembelajaranId: number;
	deskripsi: string;
	nilai: number;
};

type PredikatDetail = {
	key: PredikatKey;
	label: string;
	narrative: string;
};

type CapaianDescriptor = TujuanScoreEntry & {
	predikat: PredikatDetail;
};

const PREDIKAT_ORDER: Record<PredikatKey, number> = {
	'perlu-bimbingan': 0,
	cukup: 1,
	baik: 2,
	'sangat-baik': 3
};

function determinePredikat(nilai: number, kkm: number | null | undefined): PredikatDetail {
	const numericKkm = typeof kkm === 'number' && Number.isFinite(kkm) ? kkm : 0;
	const baseKkm = Math.max(0, numericKkm);
	const thresholdCukup = baseKkm * 1.15;
	const thresholdBaik = baseKkm * 1.3;
	if (nilai < baseKkm) {
		return {
			key: 'perlu-bimbingan',
			label: 'Perlu Bimbingan',
			narrative: 'masih perlu bimbingan'
		};
	}
	if (nilai < thresholdCukup) {
		return {
			key: 'cukup',
			label: 'Cukup',
			narrative: 'menunjukkan penguasaan yang cukup'
		};
	}
	if (nilai < thresholdBaik) {
		return {
			key: 'baik',
			label: 'Baik',
			narrative: 'menunjukkan penguasaan yang baik'
		};
	}
	return {
		key: 'sangat-baik',
		label: 'Sangat Baik',
		narrative: 'menunjukkan penguasaan yang sangat baik'
	};
}

function compareDescriptorAscending(a: CapaianDescriptor, b: CapaianDescriptor): number {
	const predikatDiff = PREDIKAT_ORDER[a.predikat.key] - PREDIKAT_ORDER[b.predikat.key];
	if (predikatDiff !== 0) return predikatDiff;
	if (a.nilai !== b.nilai) return a.nilai - b.nilai;
	if (a.tujuanPembelajaranId !== b.tujuanPembelajaranId) {
		return a.tujuanPembelajaranId - b.tujuanPembelajaranId;
	}
	return a.deskripsi.localeCompare(b.deskripsi, LOCALE_ID);
}

function buildDeskripsiLine(muridNama: string, descriptor: CapaianDescriptor): string {
	const nama = muridNama.trim().length > 0 ? muridNama.trim() : muridNama;
	const narrative = descriptor.predikat.narrative;
	return `Ananda ${nama} ${narrative} dalam ${descriptor.deskripsi}`;
}

function buildCapaianKompetensi(
	muridNama: string,
	tujuanScores: TujuanScoreEntry[],
	kkm: number | null | undefined
): string {
	if (!tujuanScores.length) {
		return 'Belum ada penilaian sumatif.';
	}

	const descriptors = tujuanScores.map<CapaianDescriptor>((entry) => ({
		...entry,
		predikat: determinePredikat(entry.nilai, kkm)
	}));

	const sorted = descriptors.slice().sort(compareDescriptorAscending);
	const lowest = sorted[0];
	const highest = sorted.at(-1) ?? lowest;
	const highestLine = buildDeskripsiLine(muridNama, highest);
	const lowestLine = buildDeskripsiLine(muridNama, lowest);

	if (sorted.length === 1) {
		return `${highestLine}\n${lowestLine}`;
	}

	return `${highestLine}\n${lowestLine}`;
}

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
	if (Number.isNaN(value)) return '—';
	const rounded = Math.round(value);
	return new Intl.NumberFormat(LOCALE_ID, {
		maximumFractionDigits: 0,
		minimumFractionDigits: 0
	}).format(rounded);
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

export async function getRaporPreviewPayload({ locals, url }: RaporContext) {
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

	const [asesmenSumatif, asesmenEkstrakurikuler, asesmenKokurikuler, asesmenSumatifTujuan] =
		await Promise.all([
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
				where: eq(tableAsesmenKokurikuler.muridId, murid.id),
				with: {
					kokurikuler: true
				}
			}),
			db.query.tableAsesmenSumatifTujuan.findMany({
				where: eq(tableAsesmenSumatifTujuan.muridId, murid.id),
				with: {
					tujuanPembelajaran: {
						columns: {
							deskripsi: true
						}
					}
				},
				orderBy: [
					asc(tableAsesmenSumatifTujuan.mataPelajaranId),
					asc(tableAsesmenSumatifTujuan.tujuanPembelajaranId)
				]
			})
		]);

	const tujuanScoresByMapel = new Map<number, TujuanScoreEntry[]>();

	for (const item of asesmenSumatifTujuan) {
		const deskripsi = item.tujuanPembelajaran?.deskripsi?.trim();
		if (!deskripsi) continue;
		const nilai = typeof item.nilai === 'number' && Number.isFinite(item.nilai) ? item.nilai : null;
		if (nilai == null) continue;
		const list = tujuanScoresByMapel.get(item.mataPelajaranId) ?? [];
		list.push({
			tujuanPembelajaranId: item.tujuanPembelajaranId,
			deskripsi,
			nilai
		});
		tujuanScoresByMapel.set(item.mataPelajaranId, list);
	}

	const muridNamaTrimmed = murid.nama.trim();
	const muridNama = muridNamaTrimmed.length > 0 ? muridNamaTrimmed : murid.nama;

	const nilaiIntrakurikuler = asesmenSumatif
		.filter((item) => item.mataPelajaran)
		.map((item) => {
			const mapel = item.mataPelajaran!;
			const tujuanScores = tujuanScoresByMapel.get(mapel.id) ?? [];
			return {
				kelompok: jenisMapel[mapel.jenis] ?? null,
				mataPelajaran: mapel.nama,
				nilaiAkhir: formatNilai(item.nilaiAkhir ?? null),
				deskripsi: buildCapaianKompetensi(muridNama, tujuanScores, mapel.kkm)
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

	const sanitizeTujuan = (value: string | null | undefined) =>
		value?.replace(/[.!?]+$/gu, '').trim() ?? '';
	const buildTujuanKey = (tujuan: string, dimensi: DimensiProfilLulusanKey) =>
		tujuan.length > 0 ? tujuan.toLocaleLowerCase(LOCALE_ID) : `__${dimensi}`;

	const kokurikulerGroups: Array<{
		tujuan: string;
		entries: Array<{ kategori: NilaiKategori; dimensi: DimensiProfilLulusanKey }>;
	}> = [];
	const kokurikulerByTujuan = new Map<
		string,
		{ tujuan: string; entries: Map<DimensiProfilLulusanKey, NilaiKategori> }
	>();
	for (const item of asesmenKokurikuler) {
		if (!isKokurikulerNilaiKategori(item.kategori)) continue;
		if (!isProfilDimensionKey(item.dimensi)) continue;
		const tujuanSanitized = sanitizeTujuan(item.kokurikuler?.tujuan ?? null);
		const tujuanKey = buildTujuanKey(tujuanSanitized, item.dimensi);
		const group = kokurikulerByTujuan.get(tujuanKey);
		if (group) {
			if (!group.tujuan && tujuanSanitized) {
				group.tujuan = tujuanSanitized;
			}
			if (!group.entries.has(item.dimensi)) {
				group.entries.set(item.dimensi, item.kategori);
			}
			continue;
		}
		const entries = new Map<DimensiProfilLulusanKey, NilaiKategori>();
		entries.set(item.dimensi, item.kategori);
		kokurikulerByTujuan.set(tujuanKey, {
			tujuan: tujuanSanitized,
			entries
		});
	}

	for (const { tujuan, entries } of kokurikulerByTujuan.values()) {
		const entryList = Array.from(entries.entries()).map(([dimensi, kategori]) => ({
			kategori,
			dimensi
		}));
		kokurikulerGroups.push({ tujuan, entries: entryList });
	}

	const kokurikuler =
		buildKokurikulerNarrative({
			studentName: murid.nama,
			groups: kokurikulerGroups
		}) ?? DEFAULT_KOKURIKULER_MESSAGE;

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
			tahunPelajaran: murid.kelas?.tahunAjaran?.nama ?? murid.semester?.nama ?? '',
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
}
