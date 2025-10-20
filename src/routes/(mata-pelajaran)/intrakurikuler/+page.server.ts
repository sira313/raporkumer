import db from '$lib/server/db';
import { ensureAgamaMapelForClasses } from '$lib/server/mapel-agama';
import { tableMataPelajaran, tableTujuanPembelajaran, tableKelas } from '$lib/server/db/schema';
import { agamaVariantNames } from '$lib/statics';
import { eq, inArray } from 'drizzle-orm';

type MataPelajaranBase = Omit<MataPelajaran, 'tujuanPembelajaran'>;
type MataPelajaranWithTp = MataPelajaranBase & { tpCount: number };
type MataPelajaranList = MataPelajaranWithTp[];

const AGAMA_VARIANT_NAME_SET = new Set<string>(agamaVariantNames);

export async function load({ depends, url, parent }) {
	depends('app:mapel');
	const { kelasAktif, daftarKelas } = await parent();
	const daftarKelasEntries = daftarKelas as Array<{ id: number }> | undefined;
	await ensureAgamaMapelForClasses(daftarKelasEntries?.map((kelas) => kelas.id) ?? []);
	const fromQuery = url.searchParams.get('kelas_id');
	const kelasCandidate = fromQuery ? Number(fromQuery) : (kelasAktif?.id ?? null);
	const kelasId =
		kelasCandidate != null && daftarKelasEntries?.some((kelas) => kelas.id === kelasCandidate)
			? kelasCandidate
			: null;

	const mapel = kelasId
		? await db.query.tableMataPelajaran.findMany({
				where: eq(tableMataPelajaran.kelasId, kelasId)
			})
		: [];

	const tpCountByMapelId = new Map<number, number>();
	if (mapel.length > 0) {
		const mapelIds = mapel.map((item) => item.id);
		const tujuanList = await db.query.tableTujuanPembelajaran.findMany({
			columns: { mataPelajaranId: true },
			where: inArray(tableTujuanPembelajaran.mataPelajaranId, mapelIds)
		});
		for (const entry of tujuanList) {
			const current = tpCountByMapelId.get(entry.mataPelajaranId) ?? 0;
			tpCountByMapelId.set(entry.mataPelajaranId, current + 1);
		}
	}

	const mapelWithIndicator: MataPelajaranWithTp[] = mapel.map((item) => ({
		...item,
		tpCount: tpCountByMapelId.get(item.id) ?? 0
	}));

	const mapelTampil = mapelWithIndicator.filter((item) => !AGAMA_VARIANT_NAME_SET.has(item.nama));

	const { daftarWajib, daftarPilihan, daftarMulok } = mapelTampil.reduce(
		(acc, item) => {
			if (item.jenis === 'wajib') acc.daftarWajib.push(item);
			else if (item.jenis === 'pilihan') acc.daftarPilihan.push(item);
			else if (item.jenis === 'mulok') acc.daftarMulok.push(item);
			return acc;
		},
		{
			daftarWajib: <MataPelajaranList>[],
			daftarPilihan: <MataPelajaranList>[],
			daftarMulok: <MataPelajaranList>[]
		}
	);
	return { kelasId, mapel: { daftarWajib, daftarPilihan, daftarMulok } };
}

import { read, utils, write } from 'xlsx';
import { fail } from '@sveltejs/kit';
import { asc } from 'drizzle-orm';
import { cookieNames } from '$lib/utils';

const MAX_IMPORT_FILE_SIZE_MAPEL = 2 * 1024 * 1024; // 2MB

function normalizeCell(value: unknown) {
	if (value == null) return '';
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'number') return value.toString().trim();
	return String(value).trim();
}

function isXlsxMime(type: string | null | undefined) {
	if (!type) return false;
	return type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}

export const actions = {
	async import_mapel({ request, cookies, locals }) {
	const kelasIdCookie = cookies.get(cookieNames.ACTIVE_KELAS_ID) || null;
	const kelasId = kelasIdCookie ? Number(kelasIdCookie) : null;
		if (!kelasId || !Number.isFinite(kelasId)) {
			return fail(400, { fail: 'Pilih kelas aktif terlebih dahulu.' });
		}

		const sekolahId = locals.sekolah?.id;
		if (!sekolahId) return fail(400, { fail: 'Pilih sekolah aktif terlebih dahulu.' });

		const formData = await request.formData();
		const file = formData.get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { fail: 'File Excel belum dipilih.' });
		}

		if (file.size > MAX_IMPORT_FILE_SIZE_MAPEL) {
			return fail(400, { fail: 'Ukuran file melebihi 2MB.' });
		}

		const filename = (file.name ?? '').toLowerCase();
		if (!filename.endsWith('.xlsx') && !isXlsxMime(file.type)) {
			return fail(400, { fail: 'Format file harus .xlsx.' });
		}

		let workbook;
		try {
			const buffer = Buffer.from(await file.arrayBuffer());
			workbook = read(buffer, { type: 'buffer' });
		} catch (error) {
			console.error('Gagal membaca file Excel', error);
			return fail(400, { fail: 'Gagal membaca file Excel. Pastikan format sesuai.' });
		}

		const firstSheetName = workbook.SheetNames[0];
		if (!firstSheetName) return fail(400, { fail: 'File Excel kosong.' });

		const worksheet = workbook.Sheets[firstSheetName];
		const rawRows = utils.sheet_to_json<(string | number | null | undefined)[]>(worksheet, {
			header: 1,
			blankrows: false,
			defval: ''
		});

		if (!Array.isArray(rawRows) || rawRows.length === 0) {
			return fail(400, { fail: 'File Excel tidak berisi data.' });
		}

		// Expect header row containing: Mata Pelajaran, Lingkup Materi, Tujuan Pembelajaran
		const headerIndex = rawRows.findIndex((row) => {
			const cols = (row ?? []).map((c) => normalizeCell(c).toLowerCase());
			return (
				(cols.some((c) => c.includes('mata pelajaran') || c === 'mapel' || c === 'mata pelajaran')) &&
				cols.some((c) => c.includes('lingkup')) &&
				cols.some((c) => c.includes('tujuan'))
			);
		});

		if (headerIndex === -1) {
			return fail(400, { fail: 'Template tidak valid. Pastikan kolom Mata Pelajaran, Lingkup Materi, dan Tujuan Pembelajaran tersedia.' });
		}

		const dataRows = rawRows.slice(headerIndex + 1).filter(Boolean);
		if (!dataRows.length) return fail(400, { fail: 'Tidak ada data pada file.' });

		// Parse rows into mapel -> meta (jenis, kkm) -> groups of lingkup -> tujuan
		type ParsedEntry = { lingkup: string; deskripsi: string };
		type ParsedMapel = { jenis?: string; kkm?: number | null; entries: ParsedEntry[] };

		const parsed = new Map<string, ParsedMapel>();
		let currentMapel = '';
		let currentJenis = '';
		let currentKkmRaw = '';
		let currentLingkup = '';

		for (const row of dataRows as (string | number | null | undefined)[][]) {
			const col0 = normalizeCell(row?.[0] ?? ''); // Mata Pelajaran
			const col1 = normalizeCell(row?.[1] ?? ''); // Jenis
			const col2 = normalizeCell(row?.[2] ?? ''); // KKM
			const col3 = normalizeCell(row?.[3] ?? ''); // Lingkup Materi
			const col4 = normalizeCell(row?.[4] ?? ''); // Tujuan Pembelajaran

			if (col0) {
				currentMapel = col0;
				currentJenis = '';
				currentKkmRaw = '';
				currentLingkup = '';
			}
			if (!currentMapel) {
				// skip rows before first mapel name
				continue;
			}
			if (col1) currentJenis = col1;
			if (col2) currentKkmRaw = col2;
			if (col3) currentLingkup = col3;
			if (!col4) continue; // no tujuan

			const key = currentMapel;
			let entry = parsed.get(key);
			if (!entry) {
				const parsedKkm = currentKkmRaw ? (Number.isFinite(Number(currentKkmRaw)) ? Number(currentKkmRaw) : null) : undefined;
				entry = { jenis: currentJenis || undefined, kkm: parsedKkm ?? undefined, entries: [] };
				parsed.set(key, entry);
			} else {
				// update meta if new values provided in subsequent rows
				if (currentJenis) entry.jenis = currentJenis;
				if (currentKkmRaw) {
					const parsedKkm = Number.isFinite(Number(currentKkmRaw)) ? Number(currentKkmRaw) : null;
					if (parsedKkm !== null) entry.kkm = parsedKkm;
				}
			}

			entry.entries.push({ lingkup: currentLingkup, deskripsi: col4 });
		}

		if (parsed.size === 0) return fail(400, { fail: 'Tidak ada tujuan pembelajaran yang ditemukan.' });

		// Persist into DB: create new mapel when not found, otherwise insert tujuan pembelajaran
		// for existing mapel. Avoid duplicate TP entries. Also update existing mapel's jenis/kkm if provided.
		let insertedMapel = 0;
		let updatedMapel = 0;
		let insertedTp = 0;
		let skippedTp = 0;

		await db.transaction(async (tx) => {
			// fetch existing mapel for kelas (case-insensitive matching will be done in JS)
			const existingMapel = await tx.query.tableMataPelajaran.findMany({
				where: eq(tableMataPelajaran.kelasId, kelasId)
			});

			const mapelByName = new Map<string, number>();
			for (const m of existingMapel) mapelByName.set((m.nama ?? '').toLowerCase(), m.id);

			for (const [mapelName, meta] of parsed.entries()) {
				const lower = mapelName.toLowerCase();
				let mapelId = mapelByName.get(lower) ?? null;
				if (!mapelId) {
					// create the mapel automatically using provided jenis/kkm if available
					const insertValues = {
						nama: mapelName,
						jenis: (meta.jenis as 'wajib' | 'pilihan' | 'mulok') ?? 'wajib',
						kkm: typeof meta.kkm === 'number' ? meta.kkm : 0,
						kelasId
					};
					const insertRes = await tx.insert(tableMataPelajaran).values(insertValues).returning({ id: tableMataPelajaran.id });
					mapelId = insertRes?.[0]?.id ?? null;
					if (mapelId) {
						insertedMapel += 1;
						mapelByName.set(lower, mapelId);
					}
				} else {
					// update existing mapel jika ada meta baru berbeda
					const updates: Record<string, unknown> = {};
					if (meta.jenis && meta.jenis !== undefined) updates.jenis = meta.jenis;
					if (typeof meta.kkm === 'number') updates.kkm = meta.kkm;
					if (Object.keys(updates).length > 0) {
						await tx.update(tableMataPelajaran).set(updates).where(eq(tableMataPelajaran.id, mapelId));
						updatedMapel += 1;
					}
				}
				if (!mapelId) continue; // defensive

				// fetch existing tujuan for this mapel
				const existingTp = await tx.query.tableTujuanPembelajaran.findMany({
					columns: { lingkupMateri: true, deskripsi: true },
					where: eq(tableTujuanPembelajaran.mataPelajaranId, mapelId)
				});
				const existingKeys = new Set(
					existingTp.map((t) => `${normalizeCell(t.lingkupMateri).toLowerCase()}::${normalizeCell(t.deskripsi).toLowerCase()}`)
				);

				const toInsertTp: Array<{ lingkupMateri: string; deskripsi: string; mataPelajaranId: number }> = [];
				for (const entry of meta.entries) {
					const key = `${normalizeCell(entry.lingkup).toLowerCase()}::${normalizeCell(entry.deskripsi).toLowerCase()}`;
					if (existingKeys.has(key)) {
						skippedTp += 1;
						continue;
					}
					existingKeys.add(key);
					toInsertTp.push({ lingkupMateri: entry.lingkup, deskripsi: entry.deskripsi, mataPelajaranId: mapelId });
				}

				if (toInsertTp.length) {
					await tx.insert(tableTujuanPembelajaran).values(toInsertTp);
					insertedTp += toInsertTp.length;
				}
			}
		});

		const parts = [`Impor selesai: ${insertedMapel} mapel baru, ${updatedMapel} mapel diperbarui, ${insertedTp} tujuan pembelajaran ditambahkan.`];
		if (skippedTp > 0) parts.push(`${skippedTp} entri diabaikan karena sudah ada.`);
		return { message: parts.join(' ') };
	},

	async export_mapel({ cookies }) {
		const kelasIdCookie = cookies.get('active_kelas_id') || cookies.get('ACTIVE_KELAS_ID') || null;
		const kelasId = kelasIdCookie ? Number(kelasIdCookie) : null;
		if (!kelasId || !Number.isFinite(kelasId)) {
			return fail(400, { fail: 'Pilih kelas aktif terlebih dahulu.' });
		}

		// fetch mapel and their tujuan
		const mapelRows = await db.query.tableMataPelajaran.findMany({
			where: eq(tableMataPelajaran.kelasId, kelasId),
			orderBy: [asc(tableMataPelajaran.jenis), asc(tableMataPelajaran.nama)]
		});

		const tpRows = await db.query.tableTujuanPembelajaran.findMany({
			where: inArray(tableTujuanPembelajaran.mataPelajaranId, mapelRows.map((m) => m.id)),
			orderBy: [asc(tableTujuanPembelajaran.mataPelajaranId), asc(tableTujuanPembelajaran.id)]
		});

		// Build workbook with one sheet grouped by Mata Pelajaran -> Lingkup -> Tujuan
		const header = ['Mata Pelajaran', 'Lingkup Materi', 'Tujuan Pembelajaran'];

		// group tujuan by mapel and lingkup preserving order
		const mapelOrder = mapelRows.map((m) => ({ id: m.id, nama: m.nama }));
		const tpByMapel = new Map<number, Array<{ lingkup: string; deskripsi: string }>>();
		for (const tp of tpRows) {
			const list = tpByMapel.get(tp.mataPelajaranId) ?? [];
			list.push({ lingkup: tp.lingkupMateri ?? '', deskripsi: tp.deskripsi ?? '' });
			tpByMapel.set(tp.mataPelajaranId, list);
		}

		const rows: Array<Array<string>> = [header];
		for (const m of mapelOrder) {
			const entries = tpByMapel.get(m.id) ?? [];
			if (entries.length === 0) {
				rows.push([m.nama, '', '']);
				continue;
			}
			// First entry includes mapel name
			let first = true;
			let lastLingkup = '';
			for (const e of entries) {
				if (first) {
					rows.push([m.nama, e.lingkup || '', e.deskripsi || '']);
					first = false;
					lastLingkup = e.lingkup || '';
					continue;
				}
				// If the lingkup is same as last and empty mapel row desired
				const mapelCell = '';
				const lingkupCell = e.lingkup && e.lingkup !== lastLingkup ? e.lingkup : '';
				rows.push([mapelCell, lingkupCell, e.deskripsi || '']);
				lastLingkup = e.lingkup || lastLingkup;
			}
		}

		const workbook = utils.book_new();
		const ws = utils.aoa_to_sheet(rows);
		utils.book_append_sheet(workbook, ws, 'Mapel & Tujuan');

		const buffer = write(workbook, { bookType: 'xlsx', type: 'buffer' });

		// try to include kelas name in filename (sanitize whitespace and dangerous chars)
		let kelasLabel = `kelas-${kelasId}`;
		try {
			const kelasRow = await db.query.tableKelas.findFirst({
				columns: { nama: true },
				where: eq(tableKelas.id, kelasId)
			});
			if (kelasRow?.nama) kelasLabel = kelasRow.nama;
		} catch {
			// ignore and fallback to kelasId
		}
	// compact label: remove dangerous chars and remove spaces so filename becomes mapel-KelasV.xlsx
	const safeLabel = kelasLabel.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '').trim();
	const filename = `mapel-${safeLabel}.xlsx`;

		return new Response(Buffer.from(buffer), {
			status: 200,
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	}
};
