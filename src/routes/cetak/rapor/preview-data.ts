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
import {
	jenisMapel,
	agamaMapelNames,
	agamaMapelOptions,
	agamaParentName,
	type DimensiProfilLulusanKey
} from '$lib/statics';
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

function determinePredikat(
	nilai: number,
	kkm: number | null | undefined,
	kritCukup?: number,
	kritBaik?: number
): PredikatDetail {
	// Apply the requested mathematical rules:
	// - Perlu bimbingan: nilai < KKM
	// - Cukup: KKM ≤ nilai ≤ kritCukup (default 85)
	// - Baik: (kritCukup + 1) ≤ nilai ≤ kritBaik (default 95)
	// - Sangat baik: nilai ≥ (kritBaik + 1)

	const numericKkm = typeof kkm === 'number' && Number.isFinite(kkm) ? Math.round(kkm) : 0;
	const baseKkm = Math.max(0, numericKkm);
	const cUpper =
		typeof kritCukup === 'number' && Number.isFinite(kritCukup) ? Math.round(kritCukup) : 85;
	const bUpper =
		typeof kritBaik === 'number' && Number.isFinite(kritBaik) ? Math.round(kritBaik) : 95;

	if (nilai < baseKkm) {
		return { key: 'perlu-bimbingan', label: 'Perlu Bimbingan', narrative: 'masih perlu bimbingan' };
	}

	// nilai is >= baseKkm here
	if (nilai <= cUpper) {
		return { key: 'cukup', label: 'Cukup', narrative: 'menunjukkan penguasaan yang cukup' };
	}

	if (nilai <= bUpper) {
		return { key: 'baik', label: 'Baik', narrative: 'menunjukkan penguasaan yang baik' };
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

	// Format khusus untuk predikat "Cukup"
	if (descriptor.predikat.key === 'cukup') {
		return `Ananda ${nama} cukup mampu ${descriptor.deskripsi}`;
	}

	return `Ananda ${nama} ${narrative} dalam ${descriptor.deskripsi}`;
}

function joinList(items: string[]): string {
	if (!items.length) return '';
	if (items.length === 1) return items[0];
	if (items.length === 2) return `${items[0]} dan ${items[1]}`;
	return items.slice(0, -1).join(', ') + ', dan ' + items.at(-1);
}

function capitalizeFirst(s: string) {
	if (!s) return s;
	return s.charAt(0).toUpperCase() + s.slice(1);
}

function buildCapaianKompetensi(
	muridNama: string,
	tujuanScores: TujuanScoreEntry[],
	kkm: number | null | undefined,
	mode: 'compact' | 'full' | 'full-desc' = 'compact',
	kritCukup?: number,
	kritBaik?: number
): string {
	if (!tujuanScores.length) {
		return 'Belum ada penilaian sumatif.';
	}

	const descriptors = tujuanScores.map<CapaianDescriptor>((entry) => ({
		...entry,
		predikat: determinePredikat(entry.nilai, kkm, kritCukup, kritBaik)
	}));

	const sorted = descriptors.slice().sort(compareDescriptorAscending);

	// If not full, keep previous compact behavior: show highest and lowest descriptors
	if (mode === 'compact') {
		const lowest = sorted[0];
		const highest = sorted.at(-1) ?? lowest;

		// Jika hanya 1 tujuan atau highest === lowest, tampilkan 1 kalimat saja
		if (sorted.length === 1 || highest.tujuanPembelajaranId === lowest.tujuanPembelajaranId) {
			return buildDeskripsiLine(muridNama, highest);
		}

		const highestLine = buildDeskripsiLine(muridNama, highest);
		const lowestLine = buildDeskripsiLine(muridNama, lowest);

		return `${highestLine}\n${lowestLine}`;
	}

	// Full mode: group all tujuan by predikat from highest to lowest and list each
	if (mode === 'full') {
		const groups: Record<PredikatKey, CapaianDescriptor[]> = {
			'sangat-baik': [],
			baik: [],
			cukup: [],
			'perlu-bimbingan': []
		};

		for (const d of sorted) {
			groups[d.predikat.key].push(d);
		}

		const order: PredikatKey[] = ['sangat-baik', 'baik', 'cukup', 'perlu-bimbingan'];
		const lines: string[] = [];

		for (const key of order) {
			const list = groups[key];
			if (!list.length) continue;

			// Map to heading phrases similar to examples
			let headingPhrase = '';
			if (key === 'sangat-baik') headingPhrase = 'Menunjukkan penguasaan yang sangat baik dalam:';
			else if (key === 'baik') headingPhrase = 'Menunjukkan penguasaan yang baik dalam:';
			else if (key === 'cukup') headingPhrase = 'Cukup menguasai dalam:';
			else headingPhrase = 'Masih perlu bimbingan dalam:';

			lines.push(headingPhrase);

			// Sort list by nilai descending then by id
			list.sort((a, b) => {
				if (a.nilai !== b.nilai) return b.nilai - a.nilai;
				return a.tujuanPembelajaranId - b.tujuanPembelajaranId;
			});

			for (const item of list) {
				lines.push(`- ${item.deskripsi}`);
			}

			// Blank line between groups
			lines.push('');
		}

		// Remove trailing blank if present
		if (lines.length > 0 && lines.at(-1) === '') lines.pop();

		// Prepend student name line? The example shows name then grouped sections; follow that
		return `Ananda ${muridNama}\n${lines.join('\n')}`;
	}

	// Full-desc mode: produce paragraph-style descriptive sentences grouped as
	// - "tercapai": includes 'sangat-baik', 'baik', 'cukup'
	// - "tidak tercapai": includes 'perlu-bimbingan'
	// Example output:
	//   Ananda Budi menunjukkan penguasaan yang sangat baik dalam tujuan a, tujuan b, dan tujuan c. Menunjukkan penguasaan yang baik dalam tujuan e, dan tujuan f. Cukup mampu tujuan g, tujuan h, dan tujuan i.
	//
	//   Ananda Budi masih perlu bimbingan dalam tujuan j, dan tujuan k.
	if (mode === 'full-desc') {
		const groups: Record<PredikatKey, CapaianDescriptor[]> = {
			'sangat-baik': [],
			baik: [],
			cukup: [],
			'perlu-bimbingan': []
		};
		for (const d of sorted) {
			groups[d.predikat.key].push(d);
		}

		const achievedOrder: PredikatKey[] = ['sangat-baik', 'baik', 'cukup'];
		const achievedSentences: string[] = [];

		// Build the "tercapai" paragraph by concatenating sentences for sangat-baik, baik, cukup
		for (let i = 0; i < achievedOrder.length; i++) {
			const key = achievedOrder[i];
			const list = groups[key];
			if (!list.length) continue;

			const descs = list.map((it) => it.deskripsi.replace(/[.!?]+$/gu, '').trim());
			const joined = joinList(descs);

			let phrase = '';
			if (key === 'sangat-baik')
				phrase = `menunjukkan penguasaan yang sangat baik dalam ${joined}.`;
			else if (key === 'baik') phrase = `menunjukkan penguasaan yang baik dalam ${joined}.`;
			else phrase = `cukup mampu ${joined}.`;

			if (achievedSentences.length === 0) {
				achievedSentences.push(`Ananda ${muridNama} ${phrase}`);
			} else {
				achievedSentences.push(capitalizeFirst(phrase));
			}
		}

		const achievedParagraph = achievedSentences.length ? achievedSentences.join(' ') : '';

		// Build the "tidak tercapai" paragraph for 'perlu-bimbingan' if any
		const needList = groups['perlu-bimbingan'];
		let notAchievedParagraph = '';
		if (needList.length) {
			const descs = needList.map((it) => it.deskripsi.replace(/[.!?]+$/gu, '').trim());
			const joined = joinList(descs);
			// use narrative 'masih perlu bimbingan' but make full sentence with name
			notAchievedParagraph = `Ananda ${muridNama} ${'masih perlu bimbingan'} dalam ${joined}.`;
		}

		if (achievedParagraph && notAchievedParagraph) {
			return `${achievedParagraph}\n\n${notAchievedParagraph}`;
		}
		if (achievedParagraph) return achievedParagraph;
		if (notAchievedParagraph) return notAchievedParagraph;
		return '';
	}

	// Fallback: return highest descriptor line
	const fallback = sorted.at(-1) ?? sorted[0];
	if (fallback) return buildDeskripsiLine(muridNama, fallback);
	return '';
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
	const explicit = sekolah.lokasiTandaTangan?.trim();
	if (explicit) return explicit;
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

	const fullTPParam = url.searchParams.get('full_tp');
	const fullTPParamStr = String(fullTPParam ?? '').toLowerCase();
	const tpMode: 'compact' | 'full' | 'full-desc' =
		fullTPParamStr === '1' || fullTPParamStr === 'true'
			? 'full'
			: fullTPParamStr === 'desc' || fullTPParamStr === 'full-desc'
				? 'full-desc'
				: 'compact';

	// read optional intrakurikuler criteria overrides from query params
	const kritCukupParam = url.searchParams.get('krit_cukup');
	const kritBaikParam = url.searchParams.get('krit_baik');
	const kritCukup = kritCukupParam ? Number(kritCukupParam) : undefined;
	const kritBaik = kritBaikParam ? Number(kritBaikParam) : undefined;

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

	const mapelJenisOrder: Record<string, number> = {
		wajib: 0,
		pilihan: 1,
		mulok: 2
	};

	const normalizeSubjectName = (value: string) => value.trim().toLocaleLowerCase(LOCALE_ID);

	const wajibSubjectPriority = [
		{
			core: 'pendidikan agama dan budi pekerti',
			matchers: agamaMapelNames.map((name) => normalizeSubjectName(name))
		},
		{
			core: 'pendidikan pancasila',
			matchers: ['pendidikan pancasila']
		},
		{
			core: 'bahasa indonesia',
			matchers: ['bahasa indonesia']
		},
		{
			core: 'matematika',
			matchers: ['matematika']
		}
	] as const;

	const muridAgamaSubjectName = (() => {
		const normalizedAgama = murid.agama ? normalizeSubjectName(murid.agama) : '';
		const matchedOption =
			agamaMapelOptions.find((option) => normalizeSubjectName(option.label) === normalizedAgama) ??
			agamaMapelOptions.find((option) => normalizeSubjectName(option.key) === normalizedAgama);
		return matchedOption?.name ?? agamaParentName;
	})();

	const agamaParentNameNormalized = normalizeSubjectName(agamaParentName);

	type WajibPriorityInfo = {
		order: number;
		core: string;
	};

	const getWajibPriorityInfo = (name: string): WajibPriorityInfo => {
		const normalized = normalizeSubjectName(name);
		for (let index = 0; index < wajibSubjectPriority.length; index += 1) {
			const entry = wajibSubjectPriority[index];
			if (
				entry.matchers.some((matcher) => normalized === matcher || normalized.includes(matcher))
			) {
				return { order: index, core: entry.core };
			}
		}
		if (normalized.startsWith('pendidikan agama') && normalized.includes('budi pekerti')) {
			return { order: 0, core: 'pendidikan agama dan budi pekerti' };
		}
		return { order: Number.POSITIVE_INFINITY, core: normalized };
	};

	const nilaiIntrakurikuler = asesmenSumatif
		.filter((item) => item.mataPelajaran)
		.map((item) => {
			const mapel = item.mataPelajaran!;
			const priority = mapel.jenis === 'wajib' ? getWajibPriorityInfo(mapel.nama) : null;
			const normalizedName = normalizeSubjectName(mapel.nama);
			const isAgamaCore = priority?.core === 'pendidikan agama dan budi pekerti';
			const tujuanScores = tujuanScoresByMapel.get(mapel.id) ?? [];
			const displayName =
				isAgamaCore && normalizedName === agamaParentNameNormalized
					? muridAgamaSubjectName
					: mapel.nama;
			return {
				mapel,
				priority,
				normalizedName,
				displayName,
				kelompok: jenisMapel[mapel.jenis] ?? null,
				nilaiAkhir: formatNilai(item.nilaiAkhir ?? null),
				deskripsi: buildCapaianKompetensi(
					muridNama,
					tujuanScores,
					mapel.kkm,
					tpMode,
					kritCukup,
					kritBaik
				)
			};
		})
		.sort((a, b) => {
			const orderA = mapelJenisOrder[a.mapel.jenis] ?? Number.POSITIVE_INFINITY;
			const orderB = mapelJenisOrder[b.mapel.jenis] ?? Number.POSITIVE_INFINITY;
			if (orderA !== orderB) return orderA - orderB;
			if (a.mapel.jenis === 'wajib' && b.mapel.jenis === 'wajib') {
				const priorityOrderA = a.priority?.order ?? Number.POSITIVE_INFINITY;
				const priorityOrderB = b.priority?.order ?? Number.POSITIVE_INFINITY;
				if (priorityOrderA !== priorityOrderB) {
					return priorityOrderA - priorityOrderB;
				}
				const coreA = a.priority?.core ?? a.normalizedName;
				const coreB = b.priority?.core ?? b.normalizedName;
				if (coreA !== coreB) {
					return coreA.localeCompare(coreB, LOCALE_ID);
				}
			}
			return a.displayName.localeCompare(b.displayName, LOCALE_ID);
		})
		.map((entry) => ({
			kelompok: entry.kelompok,
			mataPelajaran: entry.displayName,
			nilaiAkhir: entry.nilaiAkhir,
			deskripsi: entry.deskripsi
		}));

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
			deskripsi: buildEkstrakurikulerDeskripsi(entry.parts, murid.nama) ?? 'Belum ada catatan.'
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

	const hasKokurikuler = kokurikulerGroups.length > 0;

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
		hasKokurikuler,
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

	// include TP mode so the client can render compact/full differences
	raporData.tpMode = tpMode;

	return {
		meta: {
			title: `Rapor - ${murid.nama}`
		},
		raporData
	};
}
