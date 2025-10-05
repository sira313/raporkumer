import db from '$lib/server/db/index.js';
import { ensureAgamaMapelForClasses } from '$lib/server/mapel-agama.js';
import { tableMataPelajaran, tableTujuanPembelajaran } from '$lib/server/db/schema.js';
import { agamaMapelNames, agamaMapelOptions } from '$lib/statics';
import { unflattenFormData } from '$lib/utils';
import { fail } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { read, utils } from 'xlsx';

const MAX_IMPORT_FILE_SIZE = 2 * 1024 * 1024; // 2MB

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

export async function load({ depends, params, parent }) {
	depends('app:mapel_tp-rl');
	const { mapel } = await parent();

	await ensureAgamaMapelForClasses([mapel.kelasId]);

	const tujuanPembelajaran = await db.query.tableTujuanPembelajaran.findMany({
		where: eq(tableTujuanPembelajaran.mataPelajaranId, +params.id),
		orderBy: asc(tableTujuanPembelajaran.createdAt)
	});

	let agamaOptions: Array<{
		id: number;
		label: string;
		name: string;
		isActive: boolean;
	}> = [];

	const targetNames: string[] = [...agamaMapelNames];
	if (targetNames.includes(mapel.nama)) {
		const kelasAgamaMapel = await db.query.tableMataPelajaran.findMany({
			columns: { id: true, nama: true },
			where: and(
				eq(tableMataPelajaran.kelasId, mapel.kelasId),
				inArray(tableMataPelajaran.nama, targetNames)
			)
		});

		const mapelByName = new Map(kelasAgamaMapel.map((item) => [item.nama, item]));
		agamaOptions = agamaMapelOptions
			.filter((option) => option.key !== 'umum')
			.map((option) => {
				const variant = mapelByName.get(option.name);
				if (!variant) return null;
				return {
					id: variant.id,
					label: option.label,
					name: option.name,
					isActive: variant.id === mapel.id
				};
			})
			.filter((item): item is NonNullable<typeof item> => Boolean(item));
	}

	return {
		tujuanPembelajaran,
		agamaOptions,
		agamaSelection: agamaOptions.find((item) => item.isActive)?.id?.toString() ?? '',
		meta: { title: `Tujuan Pembelajaran - ${mapel.nama}` }
	};
}

export const actions = {
	async save({ params, request }) {
		const formData = await request.formData();
		const payload = unflattenFormData<{
			mode?: string;
			lingkupMateri?: string;
			entries?:
				| Array<{ id?: string | number; deskripsi?: string }>
				| { id?: string | number; deskripsi?: string };
		}>(formData);

		const mode = payload.mode === 'edit' ? 'edit' : 'create';
		const mataPelajaranId = Number(params.id);
		if (!Number.isFinite(mataPelajaranId)) {
			return fail(400, { fail: 'Mata pelajaran tidak valid.' });
		}

		const lingkupMateri = (payload.lingkupMateri ?? '').trim();
		if (!lingkupMateri) {
			return fail(400, { fail: 'Lingkup materi wajib diisi.' });
		}

		const rawEntries = Array.isArray(payload.entries)
			? payload.entries
			: payload.entries
				? Object.values(
						payload.entries as Record<string, { id?: string | number; deskripsi?: string }>
					)
				: [];

		const entries = rawEntries
			.map((entry) => {
				const idRaw = typeof entry.id === 'string' ? entry.id.trim() : entry.id;
				const id =
					typeof idRaw === 'number'
						? idRaw
						: typeof idRaw === 'string' && idRaw !== ''
							? Number(idRaw)
							: undefined;
				return {
					id: Number.isFinite(id) ? (id as number) : undefined,
					deskripsi: typeof entry.deskripsi === 'string' ? entry.deskripsi.trim() : ''
				};
			})
			.filter((entry) => entry.deskripsi !== '' || entry.id !== undefined);

		const toInsert = entries.filter((entry) => !entry.id && entry.deskripsi.length > 0);
		const toUpdate = entries.filter((entry) => entry.id && entry.deskripsi.length > 0);
		const toDeleteIds = entries
			.filter((entry) => entry.id && entry.deskripsi.length === 0)
			.map((entry) => entry.id as number);

		const hasDeskripsi = entries.some((entry) => entry.deskripsi.length > 0);

		if (mode === 'create') {
			if (!hasDeskripsi || toInsert.length === 0) {
				return fail(400, { fail: 'Minimal satu tujuan pembelajaran harus diisi.' });
			}

			await db.insert(tableTujuanPembelajaran).values(
				toInsert.map((entry) => ({
					lingkupMateri,
					deskripsi: entry.deskripsi,
					mataPelajaranId
				}))
			);

			return { message: `Tujuan pembelajaran berhasil ditambahkan` };
		}

		if (!hasDeskripsi && toDeleteIds.length === 0) {
			return fail(400, { fail: 'Minimal satu tujuan pembelajaran harus diisi.' });
		}

		if (toUpdate.length === 0 && toInsert.length === 0 && toDeleteIds.length === 0) {
			return { message: `Tidak ada perubahan pada tujuan pembelajaran` };
		}

		if (toUpdate.length > 0) {
			await Promise.all(
				toUpdate.map((entry) =>
					entry.id
						? db
								.update(tableTujuanPembelajaran)
								.set({ lingkupMateri, deskripsi: entry.deskripsi, mataPelajaranId })
								.where(eq(tableTujuanPembelajaran.id, entry.id))
						: Promise.resolve()
				)
			);
		}

		if (toInsert.length > 0) {
			await db.insert(tableTujuanPembelajaran).values(
				toInsert.map((entry) => ({
					lingkupMateri,
					deskripsi: entry.deskripsi,
					mataPelajaranId
				}))
			);
		}

		if (toDeleteIds.length > 0) {
			await db
				.delete(tableTujuanPembelajaran)
				.where(inArray(tableTujuanPembelajaran.id, toDeleteIds));
		}

		return { message: `Tujuan pembelajaran berhasil diperbarui` };
	},

	async delete({ request }) {
		const formData = await request.formData();
		const idsRaw = formData.getAll('ids');
		const ids = idsRaw.map((value) => Number(value)).filter((value) => Number.isFinite(value));

		if (ids.length === 0) {
			return fail(400, { fail: `Data tujuan pembelajaran tidak ditemukan.` });
		}

		await db.delete(tableTujuanPembelajaran).where(inArray(tableTujuanPembelajaran.id, ids));
		return { message: `Lingkup materi dan tujuan pembelajaran telah dihapus.` };
	},

	async import({ params, request }) {
		const mataPelajaranId = Number(params.id);
		if (!Number.isFinite(mataPelajaranId)) {
			return fail(400, { fail: 'Mata pelajaran tidak valid.' });
		}

		const formData = await request.formData();
		const file = formData.get('file');
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { fail: 'File Excel belum dipilih.' });
		}

		if (file.size > MAX_IMPORT_FILE_SIZE) {
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
		if (!firstSheetName) {
			return fail(400, { fail: 'File Excel kosong.' });
		}

		const worksheet = workbook.Sheets[firstSheetName];
		const rawRows = utils.sheet_to_json<(string | number | null | undefined)[]>(worksheet, {
			header: 1,
			blankrows: false
		});

		if (!Array.isArray(rawRows) || rawRows.length === 0) {
			return fail(400, { fail: 'File Excel tidak berisi data.' });
		}

		let headerIndex = -1;
		for (let index = 0; index < rawRows.length; index += 1) {
			const row = rawRows[index];
			const colA = normalizeCell(row?.[0] ?? '');
			const colB = normalizeCell(row?.[1] ?? '');
			if (colA.toLowerCase().includes('lingkup') && colB.toLowerCase().includes('tujuan')) {
				headerIndex = index;
				break;
			}
		}

		if (headerIndex === -1) {
			return fail(400, {
				fail: 'Template tidak valid. Pastikan terdapat kolom "Lingkup Materi" dan "Tujuan Pembelajaran".'
			});
		}

		const dataRows = rawRows.slice(headerIndex + 1);
		let currentLingkup = '';
		const groupOrder: Array<{ lingkupMateri: string; deskripsi: string[] }> = [];
		const groupMap = new Map<string, { lingkupMateri: string; deskripsi: string[] }>();

		for (const row of dataRows) {
			if (!row) continue;
			const lingkupValue = normalizeCell(row[0] ?? '');
			const tujuanValue = normalizeCell(row[1] ?? '');

			if (lingkupValue) {
				currentLingkup = lingkupValue;
			}

			if (!currentLingkup) {
				continue;
			}

			if (!tujuanValue) {
				continue;
			}

			const key = currentLingkup.toLowerCase();
			let group = groupMap.get(key);
			if (!group) {
				group = { lingkupMateri: currentLingkup, deskripsi: [] };
				groupMap.set(key, group);
				groupOrder.push(group);
			}

			if (!group.deskripsi.some((entry) => entry.toLowerCase() === tujuanValue.toLowerCase())) {
				group.deskripsi.push(tujuanValue);
			}
		}

		const cleanedGroups = groupOrder
			.map((group) => ({
				lingkupMateri: group.lingkupMateri,
				deskripsi: group.deskripsi.filter((entry) => entry.length > 0)
			}))
			.filter((group) => group.deskripsi.length > 0);

		if (cleanedGroups.length === 0) {
			return fail(400, { fail: 'Tidak ada tujuan pembelajaran yang ditemukan dalam file.' });
		}

		const existingEntries = await db.query.tableTujuanPembelajaran.findMany({
			columns: { lingkupMateri: true, deskripsi: true },
			where: eq(tableTujuanPembelajaran.mataPelajaranId, mataPelajaranId)
		});

		const existingKeys = new Set(
			existingEntries.map(
				(entry) =>
					`${normalizeCell(entry.lingkupMateri).toLowerCase()}::${normalizeCell(entry.deskripsi).toLowerCase()}`
			)
		);

		const toInsert: Array<{ lingkupMateri: string; deskripsi: string; mataPelajaranId: number }> =
			[];
		let duplicateCount = 0;

		for (const group of cleanedGroups) {
			const normalizedLingkup = normalizeCell(group.lingkupMateri);
			for (const deskripsi of group.deskripsi) {
				const normalizedDeskripsi = normalizeCell(deskripsi);
				const key = `${normalizedLingkup.toLowerCase()}::${normalizedDeskripsi.toLowerCase()}`;
				if (existingKeys.has(key)) {
					duplicateCount += 1;
					continue;
				}
				existingKeys.add(key);
				toInsert.push({
					lingkupMateri: normalizedLingkup,
					deskripsi: normalizedDeskripsi,
					mataPelajaranId
				});
			}
		}

		if (toInsert.length === 0) {
			return {
				message:
					duplicateCount > 0
						? 'Semua tujuan pembelajaran pada file sudah tersedia.'
						: 'Tidak ada tujuan pembelajaran baru yang ditemukan.'
			};
		}

		await db.insert(tableTujuanPembelajaran).values(toInsert);

		const parts = [`Berhasil mengimpor ${toInsert.length} tujuan pembelajaran.`];
		if (duplicateCount > 0) {
			parts.push(`${duplicateCount} data diabaikan karena sudah ada.`);
		}

		return { message: parts.join(' ') };
	}
};
