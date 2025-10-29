import db from '$lib/server/db';
import {
	tableAsesmenFormatif,
	tableMataPelajaran,
	tableMurid,
	tableTujuanPembelajaran
} from '$lib/server/db/schema';
import { ensureAsesmenFormatifSchema } from '$lib/server/db/ensure-asesmen-formatif';
import { asc, and, eq, inArray } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

const CATEGORY_LABEL: Record<ProgressCategory, string> = {
	'sangat-baik': 'Sangat baik',
	baik: 'Baik',
	'perlu-pendalaman': 'Perlu pendalaman',
	'perlu-bimbingan': 'Perlu bimbingan'
};

const DEFAULT_LINGKUP = 'Tanpa lingkup materi';

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

type ProgressCategory = 'sangat-baik' | 'baik' | 'perlu-pendalaman' | 'perlu-bimbingan';

type ProgressSummaryPart = {
	kategori: ProgressCategory;
	kategoriLabel: string;
	lingkupMateri: string;
	tuntas: number;
	totalTujuan: number;
};

function resolveCategory(tuntas: number, total: number): ProgressCategory {
	if (total <= 0) return 'perlu-bimbingan';
	const ratio = tuntas / total;
	if (ratio >= 1) return 'sangat-baik';
	if (ratio >= 2 / 3) return 'baik';
	if (ratio >= 0.5) return 'perlu-pendalaman';
	return 'perlu-bimbingan';
}

function buildSummarySentence(parts: ProgressSummaryPart[]): string | null {
	if (!parts.length) return null;
	const formatted = parts.map((part, index) => {
		const kategoriLabel = index === 0 ? part.kategoriLabel : part.kategoriLabel.toLowerCase();
		const lingkup = part.lingkupMateri.toLowerCase();
		return `${kategoriLabel} dalam materi ${lingkup} (${part.tuntas}/${part.totalTujuan} TP)`;
	});
	let sentence = '';
	if (formatted.length === 1) {
		sentence = formatted[0];
	} else if (formatted.length === 2) {
		sentence = `${formatted[0]} dan ${formatted[1]}`;
	} else {
		sentence = `${formatted.slice(0, -1).join(', ')}, dan ${formatted.at(-1)}`;
	}
	if (!sentence) return null;
	const capitalized = sentence.charAt(0).toUpperCase() + sentence.slice(1);
	return capitalized.endsWith('.') ? capitalized : `${capitalized}.`;
}
export async function load({ parent, url, depends }) {
	depends('app:asesmen-formatif');
	const { kelasAktif, user } = await parent();
	const meta: PageMeta = { title: 'Asesmen Formatif' };
	const perPage = 20;
	const requestedPage = Number(url.searchParams.get('page')) || 1;
	const pageNumber =
		Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

	if (!kelasAktif?.id) {
		return {
			meta,
			mapelList: [],
			selectedMapelValue: null,
			selectedMapel: null,
			tujuanGroups: [] as Array<{ lingkupMateri: string; totalTujuan: number }>,
			jumlahTujuan: 0,
			daftarMurid: [],
			search: null,
			page: {
				currentPage: 1,
				totalPages: 1,
				totalItems: 0,
				perPage,
				search: null
			}
		};
	}

	let mapelRecords = await db.query.tableMataPelajaran.findMany({
		columns: { id: true, nama: true },
		where: eq(tableMataPelajaran.kelasId, kelasAktif.id),
		orderBy: asc(tableMataPelajaran.nama)
	});

	// If the logged-in user is a simple 'user' and has an assigned mataPelajaranId,
	// prefer the subject with the same name in the active kelas (so subject exists
	// across multiple kelas rows with same name).
	const maybeUser = user as unknown as { type?: string; mataPelajaranId?: number } | undefined;
	if (maybeUser && maybeUser.type === 'user' && maybeUser.mataPelajaranId) {
		try {
			const assigned = await db.query.tableMataPelajaran.findFirst({
				columns: { id: true, nama: true },
				where: eq(tableMataPelajaran.id, Number(maybeUser.mataPelajaranId))
			});
			if (assigned && assigned.nama) {
				const norm = (assigned.nama || '').trim().toLowerCase();
				mapelRecords = mapelRecords.filter((r) => (r.nama || '').trim().toLowerCase() === norm);
			} else {
				mapelRecords = mapelRecords.filter((r) => r.id === Number(maybeUser.mataPelajaranId));
			}
		} catch (err) {
			console.warn('[asesmen-formatif] Failed to resolve assigned mapel name', err);
		}
	}

	const mapelByName = new Map(mapelRecords.map((record) => [normalizeText(record.nama), record]));

	// Determine if the logged-in user is assigned to a local mapel in this kelas
	// and whether that assigned mapel is an agama variant. This is used to
	// restrict grading links so a guru mapel agama assigned to a variant only
	// grades students of their agama.
	let assignedLocalMapelId: number | null = null;
	let assignedIsAgamaVariant = false;
	if (maybeUser && maybeUser.type === 'user' && maybeUser.mataPelajaranId) {
		try {
			const assigned = await db.query.tableMataPelajaran.findFirst({
				columns: { id: true, nama: true },
				where: eq(tableMataPelajaran.id, Number(maybeUser.mataPelajaranId))
			});
			if (assigned && assigned.nama) {
				const norm = normalizeText(assigned.nama);
				// detect agama variant
				assignedIsAgamaVariant =
					norm.startsWith('pendidikan agama') && norm !== normalizeText(AGAMA_BASE_SUBJECT);
				const found = mapelRecords.find((r) => normalizeText(r.nama) === norm);
				if (found) assignedLocalMapelId = found.id;
			} else {
				// fallback: if the assigned id exists in this kelas records, use it
				const foundById = mapelRecords.find((r) => r.id === Number(maybeUser.mataPelajaranId));
				if (foundById) assignedLocalMapelId = foundById.id;
			}
		} catch (err) {
			console.warn(
				'[asesmen-formatif] Failed to resolve assigned mapel for access restriction',
				err
			);
		}
	}

	let agamaBaseMapel: (typeof mapelRecords)[number] | null = null;
	const agamaVariantRecords: typeof mapelRecords = [];
	const regularOptions: Array<{ value: string; nama: string }> = [];

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

	const mapelOptions = [...regularOptions];
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
	// If user is locked to a mapel and no explicit query param is provided, default to user's mapel
	if (!selectedMapelValue && maybeUser && maybeUser.type === 'user' && maybeUser.mataPelajaranId) {
		selectedMapelValue = String(maybeUser.mataPelajaranId);
	}
	if (selectedMapelValue && !mapelOptions.some((option) => option.value === selectedMapelValue)) {
		selectedMapelValue = null;
	}
	if (!selectedMapelValue && mapelOptions.length) {
		selectedMapelValue = mapelOptions[0].value;
	}
	// If user is locked to a mapel and no explicit query param is provided, default to user's mapel
	if (
		(!requestedValue || requestedValue === '') &&
		maybeUser &&
		maybeUser.type === 'user' &&
		maybeUser.mataPelajaranId
	) {
		// try to find a mapel in this kelas with the same name and set it
		try {
			const assigned = await db.query.tableMataPelajaran.findFirst({
				columns: { id: true, nama: true },
				where: eq(tableMataPelajaran.id, Number(maybeUser.mataPelajaranId))
			});
			if (assigned && assigned.nama) {
				const norm = (assigned.nama || '').trim().toLowerCase();
				const found = mapelRecords.find((r) => (r.nama || '').trim().toLowerCase() === norm);
				if (found) selectedMapelValue = String(found.id);
			}
		} catch (err) {
			console.warn('[asesmen-formatif] Failed to default to assigned mapel', err);
		}
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
		: selectedMapelRecord;

	const muridRecords = await db.query.tableMurid.findMany({
		columns: { id: true, nama: true, agama: true },
		where: eq(tableMurid.kelasId, kelasAktif.id),
		orderBy: asc(tableMurid.nama)
	});

	const rawSearch = url.searchParams.get('q')?.trim() ?? '';
	const searchTerm = rawSearch ? rawSearch : null;
	const searchLower = searchTerm ? searchTerm.toLowerCase() : null;
	const filteredMuridRecords = searchLower
		? muridRecords.filter((murid) => murid.nama.toLowerCase().includes(searchLower))
		: muridRecords;

	const totalItems = filteredMuridRecords.length;
	const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
	const currentPage = Math.min(Math.max(pageNumber, 1), totalPages);
	const offset = (currentPage - 1) * perPage;
	const paginatedMuridRecords = filteredMuridRecords.slice(offset, offset + perPage);

	if (pageNumber !== currentPage) {
		const params = new URLSearchParams(url.searchParams);
		if (currentPage <= 1) {
			params.delete('page');
		} else {
			params.set('page', String(currentPage));
		}
		throw redirect(303, `${url.pathname}${params.size ? `?${params}` : ''}`);
	}

	if (!selectedMapelValue) {
		return {
			meta,
			mapelList: mapelOptions,
			selectedMapelValue: null,
			selectedMapel: null,
			tujuanGroups: [] as Array<{ lingkupMateri: string; totalTujuan: number }>,
			jumlahTujuan: 0,
			daftarMurid: paginatedMuridRecords.map((murid, index) => ({
				id: murid.id,
				nama: murid.nama,
				no: offset + index + 1,
				progressText: null,
				progressSummaryParts: [] as ProgressSummaryPart[],
				hasPenilaian: false,
				nilaiHref: null
			})),
			search: searchTerm,
			page: {
				currentPage,
				totalPages,
				totalItems,
				perPage,
				search: searchTerm
			}
		};
	}

	await ensureAsesmenFormatifSchema();

	const agamaMapelIds = [
		...agamaVariantRecords.map((record) => record.id),
		...(agamaBaseMapel ? [agamaBaseMapel.id] : [])
	];
	const relevantMapelIds = isAgamaSelected
		? Array.from(new Set(agamaMapelIds))
		: selectedMapelRecord
			? [selectedMapelRecord.id]
			: [];

	const tujuanRecords = relevantMapelIds.length
		? await db.query.tableTujuanPembelajaran.findMany({
				columns: { id: true, lingkupMateri: true, mataPelajaranId: true },
				where: inArray(tableTujuanPembelajaran.mataPelajaranId, relevantMapelIds),
				orderBy: [
					asc(tableTujuanPembelajaran.mataPelajaranId),
					asc(tableTujuanPembelajaran.lingkupMateri),
					asc(tableTujuanPembelajaran.id)
				]
			})
		: [];

	const tujuanByMapel = new Map<number, typeof tujuanRecords>();
	const groupedTujuanByMapel = new Map<number, Map<string, typeof tujuanRecords>>();
	for (const tujuan of tujuanRecords) {
		const list = tujuanByMapel.get(tujuan.mataPelajaranId);
		if (list) {
			list.push(tujuan);
		} else {
			tujuanByMapel.set(tujuan.mataPelajaranId, [tujuan]);
		}
		const lingkup = tujuan.lingkupMateri?.trim() || DEFAULT_LINGKUP;
		let map = groupedTujuanByMapel.get(tujuan.mataPelajaranId);
		if (!map) {
			map = new Map();
			groupedTujuanByMapel.set(tujuan.mataPelajaranId, map);
		}
		const groupList = map.get(lingkup);
		if (groupList) {
			groupList.push(tujuan);
		} else {
			map.set(lingkup, [tujuan]);
		}
	}

	const tujuanIds = tujuanRecords.map((record) => record.id);
	const muridIds = filteredMuridRecords.map((murid) => murid.id);

	const asesmenRecords =
		relevantMapelIds.length && tujuanIds.length && muridIds.length
			? await db.query.tableAsesmenFormatif.findMany({
					columns: {
						muridId: true,
						mataPelajaranId: true,
						tujuanPembelajaranId: true,
						tuntas: true
					},
					where: and(
						inArray(tableAsesmenFormatif.mataPelajaranId, relevantMapelIds),
						inArray(tableAsesmenFormatif.muridId, muridIds),
						inArray(tableAsesmenFormatif.tujuanPembelajaranId, tujuanIds)
					)
				})
			: [];

	const asesmenByMurid = new Map<number, Map<number, boolean>>();
	for (const record of asesmenRecords) {
		let muridMap = asesmenByMurid.get(record.muridId);
		if (!muridMap) {
			muridMap = new Map();
			asesmenByMurid.set(record.muridId, muridMap);
		}
		muridMap.set(record.tujuanPembelajaranId, Boolean(record.tuntas));
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

	const daftarMurid = paginatedMuridRecords.map((murid, index) => {
		const targetMapelId = pickMapelIdForMurid(murid.agama);
		const asesmen = asesmenByMurid.get(murid.id) ?? new Map();
		const tujuanList = targetMapelId ? (tujuanByMapel.get(targetMapelId) ?? []) : [];
		const groupedTujuan = targetMapelId
			? (groupedTujuanByMapel.get(targetMapelId) ?? new Map<string, typeof tujuanRecords>())
			: new Map<string, typeof tujuanRecords>();
		const parts: ProgressSummaryPart[] = [];

		for (const [lingkupMateri, tujuan] of groupedTujuan.entries()) {
			const totalTujuan = tujuan.length;
			const tuntas = tujuan.reduce((count, item) => count + (asesmen.get(item.id) ? 1 : 0), 0);
			const kategori = resolveCategory(tuntas, totalTujuan);
			parts.push({
				kategori,
				kategoriLabel: CATEGORY_LABEL[kategori],
				lingkupMateri,
				tuntas,
				totalTujuan
			});
		}

		const hasPenilaian = tujuanList.some((tujuan) => asesmen.has(tujuan.id));
		let progressText: string | null = null;
		let progressSummaryParts = parts.filter((part) => part.totalTujuan > 0);

		if (!targetMapelId) {
			progressText = `Mata pelajaran agama untuk agama ${murid.agama ?? 'tidak diketahui'} belum tersedia.`;
			progressSummaryParts = [];
		} else if (!tujuanList.length) {
			progressText = 'Belum ada tujuan pembelajaran pada mata pelajaran ini.';
			progressSummaryParts = [];
		} else if (!hasPenilaian) {
			progressText = 'Belum ada nilai.';
			progressSummaryParts = [];
		} else if (!progressSummaryParts.length) {
			progressText = 'Belum ada nilai.';
		}

		if (!progressText && progressSummaryParts.length) {
			progressText = buildSummarySentence(progressSummaryParts) ?? 'Belum ada nilai.';
		}

		const canAccess = (() => {
			if (!maybeUser || maybeUser.type !== 'user' || !maybeUser.mataPelajaranId) return true;
			// Only restrict when the assigned mapel is an agama variant.
			if (!assignedIsAgamaVariant) return true;
			// If we couldn't resolve an assigned local mapel id in this kelas,
			// deny access to grading links (safe default).
			if (!assignedLocalMapelId) return false;
			return targetMapelId === assignedLocalMapelId;
		})();

		return {
			id: murid.id,
			nama: murid.nama,
			no: offset + index + 1,
			progressText,
			progressSummaryParts,
			hasPenilaian,
			nilaiHref:
				targetMapelId && canAccess
					? `/asesmen-formatif/formulir-asesmen?murid_id=${murid.id}&mapel_id=${targetMapelId}`
					: null
		};
	});

	const tujuanGroups =
		!isAgamaSelected && selectedMapelRecord
			? Array.from(
					(groupedTujuanByMapel.get(selectedMapelRecord.id) ?? new Map()).entries(),
					([lingkupMateri, tujuan]) => ({
						lingkupMateri,
						totalTujuan: tujuan.length
					})
				)
			: [];

	const jumlahTujuan =
		!isAgamaSelected && selectedMapelRecord
			? (tujuanByMapel.get(selectedMapelRecord.id)?.length ?? 0)
			: 0;

	return {
		meta,
		mapelList: mapelOptions,
		selectedMapelValue,
		selectedMapel,
		tujuanGroups,
		jumlahTujuan,
		daftarMurid,
		search: searchTerm,
		page: {
			currentPage,
			totalPages,
			totalItems,
			perPage,
			search: searchTerm
		}
	};
}
