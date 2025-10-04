import db from '$lib/server/db';
import { ensureAsesmenSumatifSchema } from '$lib/server/db/ensure-asesmen-sumatif';
import {
	tableAsesmenSumatif,
	tableMataPelajaran,
	tableMurid
} from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';

const PER_PAGE = 20;

function formatScore(value: number | null | undefined) {
	if (value == null || Number.isNaN(value)) return null;
	return Number.parseFloat(value.toFixed(2));
}

const AGAMA_BASE_SUBJECT = 'Pendidikan Agama dan Budi Pekerti';

const AGAMA_VARIANT_MAP: Record<string, string> = {
	islam: 'Pendidikan Agama Islam dan Budi Pekerti',
	kristen: 'Pendidikan Agama Kristen dan Budi Pekerti',
	protestan: 'Pendidikan Agama Kristen dan Budi Pekerti',
	katolik: 'Pendidikan Agama Katolik dan Budi Pekerti',
	katholik: 'Pendidikan Agama Katolik dan Budi Pekerti',
	hindu: 'Pendidikan Agama Hindu dan Budi Pekerti',
	budha: 'Pendidikan Agama Buddha dan Budi Pekerti',
	buddha: 'Pendidikan Agama Buddha dan Budi Pekerti',
	buddhist: 'Pendidikan Agama Buddha dan Budi Pekerti',
	khonghucu: 'Pendidikan Agama Khonghucu dan Budi Pekerti',
	'khong hu cu': 'Pendidikan Agama Khonghucu dan Budi Pekerti',
	konghucu: 'Pendidikan Agama Khonghucu dan Budi Pekerti'
};

function normalizeText(value: string | null | undefined) {
	return value?.trim().toLowerCase() ?? '';
}

function isAgamaSubject(name: string) {
	return normalizeText(name).startsWith('pendidikan agama');
}

function resolveAgamaVariantName(agama: string | null | undefined) {
	const normalized = normalizeText(agama);
	return AGAMA_VARIANT_MAP[normalized] ?? null;
}

type MapelRecord = {
	id: number;
	nama: string;
};

function pickAgamaMapel(records: MapelRecord[], muridAgama: string | null | undefined) {
	const mapelByName = new Map(records.map((record) => [normalizeText(record.nama), record]));
	let baseMapel: MapelRecord | null = null;
	const variantMapel: MapelRecord[] = [];
	const regularMapel: MapelRecord[] = [];

	for (const record of records) {
		if (isAgamaSubject(record.nama)) {
			if (normalizeText(record.nama) === normalizeText(AGAMA_BASE_SUBJECT)) {
				baseMapel = record;
			} else {
				variantMapel.push(record);
			}
		} else {
			regularMapel.push(record);
		}
	}

	let chosenAgamaMapel: MapelRecord | null = null;
	const variantName = resolveAgamaVariantName(muridAgama);
	if (variantName) {
		chosenAgamaMapel = mapelByName.get(normalizeText(variantName)) ?? null;
	}
	if (!chosenAgamaMapel) {
		chosenAgamaMapel = baseMapel ?? variantMapel.at(0) ?? null;
	}

	const result = [...regularMapel];
	if (chosenAgamaMapel) {
		result.push(chosenAgamaMapel);
	}

	result.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
	return result;
}

type NilaiAkhirRow = {
	id: number;
	nama: string;
	nilaiRataRata: number | null;
	jumlahMapelDinilai: number;
	totalMapelRelevan: number;
	detailHref: string;
	peringkat: number;
};

type PageState = {
	search: string | null;
	currentPage: number;
	totalPages: number;
	totalItems: number;
	perPage: number;
};

type Summary = {
	totalMurid: number;
	totalMuridDinilai: number;
	totalMapel: number;
};

export async function load({ parent, locals, url, depends }) {
	depends('app:nilai-akhir');

	const meta: PageMeta = { title: 'Rekapitulasi Nilai Akhir' };
	const { kelasAktif } = await parent();
	const sekolahId = locals.sekolah?.id ?? null;

	const searchParam = url.searchParams.get('q');
	const searchTrimmed = searchParam ? searchParam.trim() : '';
	const search = searchTrimmed.length ? searchTrimmed : null;
	const requestedPage = Number(url.searchParams.get('page')) || 1;
	const pageNumber =
		Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

	const defaultState: PageState = {
		search,
		currentPage: 1,
		totalPages: 1,
		totalItems: 0,
		perPage: PER_PAGE
	};

	if (!sekolahId || !kelasAktif?.id) {
		return {
			meta,
			daftarNilai: [] as NilaiAkhirRow[],
			page: defaultState,
			summary: {
				totalMurid: 0,
				totalMuridDinilai: 0,
				totalMapel: 0
			} satisfies Summary
		};
	}

	const muridRecords = await db.query.tableMurid.findMany({
		columns: { id: true, nama: true, agama: true },
		where: and(eq(tableMurid.sekolahId, sekolahId), eq(tableMurid.kelasId, kelasAktif.id)),
		orderBy: asc(tableMurid.nama)
	});

	const muridIds = muridRecords.map((murid) => murid.id);

	const rawMapelRecords = await db.query.tableMataPelajaran.findMany({
		columns: { id: true, nama: true },
		where: eq(tableMataPelajaran.kelasId, kelasAktif.id)
	});
	const mapelIds = rawMapelRecords.map((mapel) => mapel.id);

	await ensureAsesmenSumatifSchema();

	const sumatifRecords =
		muridIds.length && mapelIds.length
			? await db.query.tableAsesmenSumatif.findMany({
					columns: {
						muridId: true,
						mataPelajaranId: true,
						nilaiAkhir: true
					},
					where: and(
						inArray(tableAsesmenSumatif.muridId, muridIds),
						inArray(tableAsesmenSumatif.mataPelajaranId, mapelIds)
					)
				})
			: [];

	const sumatifByMurid = new Map<number, Map<number, number | null>>();
	for (const record of sumatifRecords) {
		let map = sumatifByMurid.get(record.muridId);
		if (!map) {
			map = new Map();
			sumatifByMurid.set(record.muridId, map);
		}
		map.set(record.mataPelajaranId, record.nilaiAkhir);
	}

	const rows = muridRecords.map((murid) => {
		const relevantMapel = pickAgamaMapel(rawMapelRecords, murid.agama);
		let total = 0;
		let countDinilai = 0;

		for (const mapel of relevantMapel) {
			const nilai = sumatifByMurid.get(murid.id)?.get(mapel.id) ?? null;
			if (nilai != null) {
				total += nilai;
				countDinilai += 1;
			} else {
				total += 0;
			}
		}

		const rataRata = relevantMapel.length
			? formatScore(total / relevantMapel.length)
			: null;

		return {
			id: murid.id,
			nama: murid.nama,
			nilaiRataRata: rataRata,
			jumlahMapelDinilai: countDinilai,
			totalMapelRelevan: relevantMapel.length,
			detailHref: `/nilai-akhir/daftar-nilai?murid_id=${murid.id}`
		};
	});

	rows.sort((a, b) => {
		const aScore = a.nilaiRataRata;
		const bScore = b.nilaiRataRata;
		if (aScore == null && bScore == null) {
			return a.nama.localeCompare(b.nama, 'id');
		}
		if (aScore == null) return 1;
		if (bScore == null) return -1;
		const diff = bScore - aScore;
		if (Math.abs(diff) > 0.0001) return diff;
		return a.nama.localeCompare(b.nama, 'id');
	});

	let lastRankScore: number | null = null;
	let lastRank = 0;

	const rankedRows = rows.map((row, index) => {
		const score = row.nilaiRataRata;
		let peringkat = index + 1;
		if (score != null) {
			if (lastRankScore != null && Math.abs(lastRankScore - score) <= 0.0001) {
				peringkat = lastRank;
			} else {
				lastRankScore = score;
				lastRank = peringkat;
			}
		} else {
			lastRankScore = null;
			lastRank = peringkat;
		}
		return { ...row, peringkat } satisfies NilaiAkhirRow;
	});

	const lowerSearch = search ? search.toLowerCase() : null;
	const filteredRows = lowerSearch
		? rankedRows.filter((row) => row.nama.toLowerCase().includes(lowerSearch))
		: rankedRows;

	const totalItems = filteredRows.length;
	const totalPages = Math.max(1, Math.ceil(totalItems / PER_PAGE));
	const currentPage = Math.min(Math.max(pageNumber, 1), totalPages);
	const offset = (currentPage - 1) * PER_PAGE;

	if (pageNumber !== currentPage) {
		const params = new URLSearchParams(url.searchParams);
		if (currentPage <= 1) {
			params.delete('page');
		} else {
			params.set('page', String(currentPage));
		}
		throw redirect(303, `${url.pathname}${params.size ? `?${params}` : ''}`);
	}

	const daftarNilai = filteredRows.slice(offset, offset + PER_PAGE);
	const page: PageState = {
		search,
		currentPage,
		totalPages,
		totalItems,
		perPage: PER_PAGE
	};

	const uniqueMapelCount = new Set(rawMapelRecords.map((mapel) => mapel.nama)).size;
	const summary: Summary = {
		totalMurid: rankedRows.length,
		totalMuridDinilai: rankedRows.filter((row) => row.jumlahMapelDinilai > 0).length,
		totalMapel: uniqueMapelCount
	};

	return { meta, daftarNilai, page, summary };
}
