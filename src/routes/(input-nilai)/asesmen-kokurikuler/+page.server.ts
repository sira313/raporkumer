import db from '$lib/server/db';
import { ensureAsesmenKokurikulerSchema } from '$lib/server/db/ensure-asesmen-kokurikuler';
import {
	tableAsesmenKokurikuler,
	tableKokurikuler,
	tableMurid
} from '$lib/server/db/schema';
import {
	buildKokurikulerDeskripsi,
	isNilaiKategori,
	isProfilDimensionKey,
	nilaiKategoriLabelByValue,
	nilaiKategoriOptions,
	sanitizeDimensionList,
	type NilaiKategori
} from '$lib/kokurikuler';
import {
	profilPelajarPancasilaDimensionLabelByKey,
	type DimensiProfilLulusanKey
} from '$lib/statics';
import { unflattenFormData } from '$lib/utils';
import { fail, redirect } from '@sveltejs/kit';
import { asc, and, eq } from 'drizzle-orm';

const PER_PAGE = 20;

type KokurikulerOption = {
	id: number;
	kode: string;
	tujuan: string;
	dimensi: Array<{
		key: DimensiProfilLulusanKey;
		label: string;
	}>;
};

type NilaiRecordMap = Map<
	number,
	Map<
		DimensiProfilLulusanKey,
		{ kategori: NilaiKategori; timestamp: string | null }
	>
>;

function mapNilaiRecords(
	records: Array<{
		muridId: number;
		dimensi: string;
		kategori: string;
		dinilaiPada: string | null;
		updatedAt: string | null;
	}>
): NilaiRecordMap {
	const nilaiByMurid: NilaiRecordMap = new Map();
	for (const record of records) {
		if (!isProfilDimensionKey(record.dimensi) || !isNilaiKategori(record.kategori)) {
			continue;
		}
		let muridMap = nilaiByMurid.get(record.muridId);
		if (!muridMap) {
			muridMap = new Map();
			nilaiByMurid.set(record.muridId, muridMap);
		}
		const timestamp = record.dinilaiPada ?? record.updatedAt ?? null;
		muridMap.set(record.dimensi, { kategori: record.kategori, timestamp });
	}
	return nilaiByMurid;
}

export async function load({ parent, url, depends }) {
	depends('app:asesmen-kokurikuler');
	const { kelasAktif } = await parent();
	const meta: PageMeta = { title: 'Asesmen Kokurikuler' };

	const requestedPageRaw = url.searchParams.get('page');
	let requestedPage = requestedPageRaw ? Number(requestedPageRaw) : 1;
	if (!Number.isInteger(requestedPage) || requestedPage < 1) {
		requestedPage = 1;
	}

	if (!kelasAktif?.id) {
		return {
			meta,
			kokurikulerList: [] satisfies KokurikulerOption[],
			selectedKokurikulerId: null,
			selectedKokurikuler: null,
			daftarMurid: [] as Array<{
				id: number;
				nama: string;
				no: number;
				deskripsi: string | null;
				nilaiByDimensi: Record<DimensiProfilLulusanKey, NilaiKategori | null>;
				hasNilai: boolean;
				lastUpdated: string | null;
			}>,
			summary: null,
			totalMurid: 0,
			muridCount: 0,
			kategoriOptions: nilaiKategoriOptions,
			search: null,
			page: {
				currentPage: 1,
				totalPages: 1,
				totalItems: 0,
				perPage: PER_PAGE,
				search: null
			}
		};
	}

	const kelasId = kelasAktif.id;

	const kokurikulerRaw = await db.query.tableKokurikuler.findMany({
		where: eq(tableKokurikuler.kelasId, kelasId),
		orderBy: asc(tableKokurikuler.createdAt)
	});

	const kokurikulerList: KokurikulerOption[] = kokurikulerRaw.map((item) => {
		const dimensi = sanitizeDimensionList(item.dimensi);
		return {
			id: item.id,
			kode: item.kode,
			tujuan: item.tujuan,
			dimensi: dimensi.map((key) => ({
				key,
				label: profilPelajarPancasilaDimensionLabelByKey[key] ?? key
			}))
		};
	});

	const requestedIdRaw = url.searchParams.get('kokurikuler_id');
	let requestedId = requestedIdRaw ? Number(requestedIdRaw) : null;
	if (requestedId != null && (!Number.isInteger(requestedId) || requestedId <= 0)) {
		requestedId = null;
	}

	const availableIds = new Set(kokurikulerList.map((item) => item.id));
	let selectedKokurikulerId = requestedId && availableIds.has(requestedId) ? requestedId : null;
	if (!selectedKokurikulerId && kokurikulerList.length === 1) {
		selectedKokurikulerId = kokurikulerList[0].id;
	}

	const selectedKokurikuler = selectedKokurikulerId
		? kokurikulerList.find((item) => item.id === selectedKokurikulerId) ?? null
		: null;

	const muridRaw = await db.query.tableMurid.findMany({
		columns: { id: true, nama: true },
		where: eq(tableMurid.kelasId, kelasId),
		orderBy: asc(tableMurid.nama)
	});

	const rawSearch = url.searchParams.get('q')?.trim() ?? '';
	const searchTerm = rawSearch ? rawSearch : null;
	const searchLower = searchTerm ? searchTerm.toLowerCase() : null;
	const filteredMurid = searchLower
		? muridRaw.filter((murid) => murid.nama.toLowerCase().includes(searchLower))
		: muridRaw;

	const totalMurid = filteredMurid.length;
	const totalPages = Math.max(1, Math.ceil(totalMurid / PER_PAGE));
	const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);
	const offset = (currentPage - 1) * PER_PAGE;
	const paginatedMurid = filteredMurid.slice(offset, offset + PER_PAGE);

	if (requestedPage !== currentPage) {
		const params = new URLSearchParams(url.searchParams);
		if (currentPage <= 1) {
			params.delete('page');
		} else {
			params.set('page', String(currentPage));
		}
		throw redirect(303, `${url.pathname}${params.size ? `?${params}` : ''}`);
	}

	let nilaiRecords: Array<{
		muridId: number;
		dimensi: string;
		kategori: string;
		dinilaiPada: string | null;
		updatedAt: string | null;
	}> = [];

	if (selectedKokurikulerId) {
		await ensureAsesmenKokurikulerSchema();
		nilaiRecords = await db.query.tableAsesmenKokurikuler.findMany({
			columns: {
				muridId: true,
				dimensi: true,
				kategori: true,
				dinilaiPada: true,
				updatedAt: true
			},
			where: eq(tableAsesmenKokurikuler.kokurikulerId, selectedKokurikulerId)
		});
	}

	const nilaiByMurid = mapNilaiRecords(nilaiRecords);

	const daftarMurid = paginatedMurid.map((murid, index) => {
		const nilaiMap = nilaiByMurid.get(murid.id) ?? new Map();
		const nilaiByDimensi = Object.create(null) as Record<
			DimensiProfilLulusanKey,
			NilaiKategori | null
		>;
		const parts: Array<{ kategori: NilaiKategori; dimensi: DimensiProfilLulusanKey }> = [];
		let lastUpdated: string | null = null;

		if (selectedKokurikuler) {
			for (const dim of selectedKokurikuler.dimensi) {
				const nilai = nilaiMap.get(dim.key);
				if (nilai) {
					nilaiByDimensi[dim.key] = nilai.kategori;
					parts.push({ kategori: nilai.kategori, dimensi: dim.key });
					if (nilai.timestamp && (!lastUpdated || nilai.timestamp > lastUpdated)) {
						lastUpdated = nilai.timestamp;
					}
				} else {
					nilaiByDimensi[dim.key] = null;
				}
			}
		}

		const deskripsi = parts.length ? buildKokurikulerDeskripsi(parts) : null;

		return {
			id: murid.id,
			nama: murid.nama,
			no: offset + index + 1,
			deskripsi,
			nilaiByDimensi,
			hasNilai: parts.length > 0,
			lastUpdated
		};
	});

	return {
		meta,
		kokurikulerList,
		selectedKokurikulerId,
		selectedKokurikuler,
		kategoriOptions: nilaiKategoriOptions,
		daftarMurid,
		search: searchTerm,
		totalMurid,
		muridCount: muridRaw.length,
		summary: selectedKokurikuler
			? {
				dimensiCount: selectedKokurikuler.dimensi.length,
				deskripsi: selectedKokurikuler.tujuan
			}
			: null,
		page: {
			currentPage,
			totalPages,
			totalItems: totalMurid,
			perPage: PER_PAGE,
			search: searchTerm
		}
	};
}

export const actions = {
	nilai: async ({ request }) => {
		const formData = await request.formData();
		const muridIdRaw = formData.get('muridId');
		const kokurikulerIdRaw = formData.get('kokurikulerId');

		if (!muridIdRaw || !kokurikulerIdRaw) {
			return fail(400, { fail: 'Data murid atau kokurikuler tidak lengkap' });
		}

		const muridId = Number(muridIdRaw);
		const kokurikulerId = Number(kokurikulerIdRaw);
		if (!Number.isInteger(muridId) || muridId <= 0) {
			return fail(400, { fail: 'Murid tidak valid' });
		}
		if (!Number.isInteger(kokurikulerId) || kokurikulerId <= 0) {
			return fail(400, { fail: 'Kokurikuler tidak valid' });
		}

		const muridRecord = await db.query.tableMurid.findFirst({
			columns: { id: true, kelasId: true },
			where: eq(tableMurid.id, muridId)
		});
		if (!muridRecord) {
			return fail(404, { fail: 'Data murid tidak ditemukan' });
		}

		const kokurikulerRecord = await db.query.tableKokurikuler.findFirst({
			columns: { id: true, kelasId: true, dimensi: true },
			where: eq(tableKokurikuler.id, kokurikulerId)
		});
		if (!kokurikulerRecord) {
			return fail(404, { fail: 'Data kokurikuler tidak ditemukan' });
		}

		if (muridRecord.kelasId !== kokurikulerRecord.kelasId) {
			return fail(400, { fail: 'Murid dan kokurikuler tidak berada pada kelas yang sama' });
		}

		const dimensiList = sanitizeDimensionList(kokurikulerRecord.dimensi);
		const dimensiSet = new Set(dimensiList);

		const payload = unflattenFormData<{ nilai?: Record<string, FormDataEntryValue> }>(
			formData,
			false
		);
		const nilaiEntries = payload.nilai ?? {};

		const sanitizedEntries: Array<{
			dimensi: DimensiProfilLulusanKey;
			kategori: NilaiKategori;
		}> = [];

		for (const [dimKey, rawValue] of Object.entries(nilaiEntries)) {
			if (!isProfilDimensionKey(dimKey)) continue;
			if (!dimensiSet.has(dimKey)) continue;
			const value = typeof rawValue === 'string' ? rawValue : String(rawValue ?? '');
			if (!value) continue;
			if (!isNilaiKategori(value)) continue;
			sanitizedEntries.push({ dimensi: dimKey, kategori: value });
		}

		await ensureAsesmenKokurikulerSchema();

		await db.transaction(async (tx) => {
			await tx
				.delete(tableAsesmenKokurikuler)
				.where(
					and(
						eq(tableAsesmenKokurikuler.muridId, muridId),
						eq(tableAsesmenKokurikuler.kokurikulerId, kokurikulerId)
					)
				);

			if (sanitizedEntries.length) {
				const now = new Date().toISOString();
				await tx.insert(tableAsesmenKokurikuler).values(
					sanitizedEntries.map((entry) => ({
						muridId,
						kokurikulerId,
						dimensi: entry.dimensi,
						kategori: entry.kategori,
						dinilaiPada: now,
						updatedAt: now
					}))
				);
			}
		});

		const message = sanitizedEntries.length
			? 'Nilai kokurikuler berhasil disimpan'
			: 'Nilai kokurikuler dibersihkan';

		return {
			message,
			updated: sanitizedEntries.map((entry) => ({
				dimensi: entry.dimensi,
				kategori: entry.kategori,
				kategoriLabel: nilaiKategoriLabelByValue[entry.kategori]
			}))
		};
	}
};
