import db from '$lib/server/db';
import { ensureAsesmenSumatifSchema } from '$lib/server/db/ensure-asesmen-sumatif';
import { tableAsesmenSumatif, tableMataPelajaran, tableMurid } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

const AGAMA_BASE_SUBJECT = 'Pendidikan Agama dan Budi Pekerti';
const AGAMA_MAPEL_VALUE = 'agama';

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

function formatScore(value: number | null | undefined) {
	if (value == null || Number.isNaN(value)) return null;
	return Number.parseFloat(value.toFixed(2));
}

type MapelOption = { value: string; nama: string };

type MuridRow = {
	id: number;
	no: number;
	nama: string;
	nilaiAkhir: number | null;
	naLingkup: number | null;
	sas: number | null;
	nilaiHref: string | null;
};

type PageState = {
	search: string | null;
	currentPage: number;
	totalPages: number;
	totalItems: number;
	perPage: number;
};

export async function load({ parent, url, depends }) {
	depends('app:asesmen-sumatif');
	const { kelasAktif } = await parent();
	const meta: PageMeta = { title: 'Asesmen Sumatif' };

	const searchParam = url.searchParams.get('q');
	const searchTrimmed = searchParam ? searchParam.trim() : '';
	const search = searchTrimmed.length ? searchTrimmed : null;
	const perPage = 20;
	const requestedPage = Number(url.searchParams.get('page')) || 1;
	const pageNumber =
		Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

	if (!kelasAktif?.id) {
		const pageState: PageState = {
			search,
			currentPage: 1,
			totalPages: 1,
			totalItems: 0,
			perPage
		};
		return {
			meta,
			mapelList: [] as MapelOption[],
			selectedMapelValue: null as string | null,
			selectedMapel: null as { id: number | null; nama: string } | null,
			daftarMurid: [] as MuridRow[],
			page: pageState
		};
	}

	const mapelRecords = await db.query.tableMataPelajaran.findMany({
		columns: { id: true, nama: true },
		where: eq(tableMataPelajaran.kelasId, kelasAktif.id),
		orderBy: asc(tableMataPelajaran.nama)
	});

	const mapelByName = new Map(mapelRecords.map((record) => [normalizeText(record.nama), record]));

	let agamaBaseMapel: (typeof mapelRecords)[number] | null = null;
	const agamaVariantRecords: typeof mapelRecords = [];
	const regularOptions: MapelOption[] = [];

	for (const record of mapelRecords) {
		if (isAgamaSubject(record.nama)) {
			if (normalizeText(record.nama) === normalizeText(AGAMA_BASE_SUBJECT)) {
				agamaBaseMapel = record;
			} else {
				agamaVariantRecords.push(record);
			}
		} else {
			regularOptions.push({ value: String(record.id), nama: record.nama });
		}
	}

	regularOptions.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

	const mapelOptions: MapelOption[] = [...regularOptions];
	if (agamaBaseMapel || agamaVariantRecords.length) {
		const exists = mapelOptions.some(
			(option) => normalizeText(option.nama) === normalizeText(AGAMA_BASE_SUBJECT)
		);
		if (!exists) {
			mapelOptions.unshift({ value: AGAMA_MAPEL_VALUE, nama: AGAMA_BASE_SUBJECT });
		}
	}

	const requestedValue = url.searchParams.get('mapel_id');
	let selectedMapelValue = requestedValue ?? null;
	if (selectedMapelValue && !mapelOptions.some((option) => option.value === selectedMapelValue)) {
		selectedMapelValue = null;
	}
	if (!selectedMapelValue && mapelOptions.length) {
		selectedMapelValue = mapelOptions[0].value;
	}

	const isAgamaSelected = selectedMapelValue === AGAMA_MAPEL_VALUE;
	const selectedMapelRecord =
		!isAgamaSelected && selectedMapelValue
			? (mapelRecords.find((record) => String(record.id) === selectedMapelValue) ?? null)
			: null;

	const selectedMapel = isAgamaSelected
		? agamaBaseMapel
			? { id: agamaBaseMapel.id, nama: agamaBaseMapel.nama }
			: { id: null, nama: AGAMA_BASE_SUBJECT }
		: selectedMapelRecord
			? { id: selectedMapelRecord.id, nama: selectedMapelRecord.nama }
			: null;

	const muridFilter = and(
		eq(tableMurid.kelasId, kelasAktif.id),
		search ? sql`${tableMurid.nama} LIKE ${'%' + search + '%'} COLLATE NOCASE` : undefined
	);

	const [{ totalItems }] = await db
		.select({ totalItems: sql<number>`count(*)` })
		.from(tableMurid)
		.where(muridFilter);

	const total = totalItems ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / perPage));
	const currentPage = Math.min(Math.max(pageNumber, 1), totalPages);
	const offset = (currentPage - 1) * perPage;
	const pageState: PageState = {
		search,
		currentPage,
		totalPages,
		totalItems: total,
		perPage
	};

	const muridRecords = await db.query.tableMurid.findMany({
		columns: { id: true, nama: true, agama: true },
		where: muridFilter,
		orderBy: asc(tableMurid.nama),
		limit: perPage,
		offset
	});

	if (pageNumber !== currentPage) {
		const params = new URLSearchParams(url.searchParams);
		if (currentPage <= 1) {
			params.delete('page');
		} else {
			params.set('page', String(currentPage));
		}
		throw redirect(303, `${url.pathname}${params.size ? `?${params}` : ''}`);
	}

	const baseList: MuridRow[] = muridRecords.map((murid, index) => ({
		id: murid.id,
		no: offset + index + 1,
		nama: murid.nama,
		nilaiAkhir: null,
		naLingkup: null,
		sas: null,
		nilaiHref: null
	}));

	if (!selectedMapelValue) {
		return {
			meta,
			mapelList: mapelOptions,
			selectedMapelValue,
			selectedMapel,
			daftarMurid: baseList,
			page: pageState
		};
	}

	await ensureAsesmenSumatifSchema();

	const agamaMapelIds = [
		...agamaVariantRecords.map((record) => record.id),
		...(agamaBaseMapel ? [agamaBaseMapel.id] : [])
	];
	const relevantMapelIds = isAgamaSelected
		? Array.from(new Set(agamaMapelIds))
		: selectedMapelRecord
			? [selectedMapelRecord.id]
			: [];

	const muridIds = muridRecords.map((murid) => murid.id);

	const sumatifRecords =
		relevantMapelIds.length && muridIds.length
			? await db.query.tableAsesmenSumatif.findMany({
					columns: {
						muridId: true,
						mataPelajaranId: true,
						naLingkup: true,
						sas: true,
						nilaiAkhir: true
					},
					where: and(
						inArray(tableAsesmenSumatif.mataPelajaranId, relevantMapelIds),
						inArray(tableAsesmenSumatif.muridId, muridIds)
					)
				})
			: [];

	const sumatifByMurid = new Map<number, Map<number, (typeof sumatifRecords)[number]>>();
	for (const record of sumatifRecords) {
		let map = sumatifByMurid.get(record.muridId);
		if (!map) {
			map = new Map();
			sumatifByMurid.set(record.muridId, map);
		}
		map.set(record.mataPelajaranId, record);
	}

	const pickMapelIdForMurid = (muridAgama: string | null | undefined): number | null => {
		if (!isAgamaSelected) {
			return selectedMapelRecord?.id ?? null;
		}
		const variantName = resolveAgamaVariantName(muridAgama);
		if (variantName) {
			const variantRecord = mapelByName.get(normalizeText(variantName));
			if (variantRecord) {
				return variantRecord.id;
			}
		}
		if (agamaBaseMapel) {
			return agamaBaseMapel.id;
		}
		return agamaVariantRecords[0]?.id ?? null;
	};

	const daftarMurid: MuridRow[] = muridRecords.map((murid, index) => {
		const targetMapelId = pickMapelIdForMurid(murid.agama);
		const sumatif = targetMapelId
			? (sumatifByMurid.get(murid.id)?.get(targetMapelId) ?? null)
			: null;

		return {
			id: murid.id,
			no: offset + index + 1,
			nama: murid.nama,
			nilaiAkhir: formatScore(sumatif?.nilaiAkhir),
			naLingkup: formatScore(sumatif?.naLingkup),
			sas: formatScore(sumatif?.sas),
			nilaiHref: targetMapelId
				? `/asesmen-sumatif/formulir-asesmen?murid_id=${murid.id}&mapel_id=${targetMapelId}`
				: null
		};
	});

	return {
		meta,
		mapelList: mapelOptions,
		selectedMapelValue,
		selectedMapel,
		daftarMurid,
		page: pageState
	};
}
