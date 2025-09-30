import db from '$lib/server/db/index.js';
import { ensureAgamaMapelForClasses } from '$lib/server/mapel-agama.js';
import { tableMataPelajaran, tableTujuanPembelajaran } from '$lib/server/db/schema.js';
import { agamaMapelNames, agamaMapelOptions } from '$lib/statics';
import { unflattenFormData } from '$lib/utils';
import { fail } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';

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
				? [payload.entries]
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

		const hasDeskripsi = entries.some((entry) => entry.deskripsi.length > 0);
		if (!hasDeskripsi) {
			return fail(400, { fail: 'Minimal satu tujuan pembelajaran harus diisi.' });
		}

		const toInsert = entries.filter((entry) => !entry.id && entry.deskripsi.length > 0);
		const toUpdate = entries.filter((entry) => entry.id && entry.deskripsi.length > 0);
		const toDeleteIds = entries
			.filter((entry) => entry.id && entry.deskripsi.length === 0)
			.map((entry) => entry.id as number);

		if (mode === 'create') {
			if (toInsert.length === 0) {
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
		const ids = idsRaw
			.map((value) => Number(value))
			.filter((value) => Number.isFinite(value));

		if (ids.length === 0) {
			return fail(400, { fail: `Data tujuan pembelajaran tidak ditemukan.` });
		}

		await db.delete(tableTujuanPembelajaran).where(inArray(tableTujuanPembelajaran.id, ids));
		return { message: `Lingkup materi dan tujuan pembelajaran telah dihapus.` };
	}
};
