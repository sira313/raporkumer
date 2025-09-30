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
		const formTpRl = unflattenFormData<TujuanPembelajaran>(await request.formData());
		formTpRl.mataPelajaranId = +params.id;

		// TODO: validation
		if (formTpRl.id) {
			await db
				.update(tableTujuanPembelajaran)
				.set(formTpRl)
				.where(eq(tableTujuanPembelajaran.id, +formTpRl.id));
		} else {
			await db.insert(tableTujuanPembelajaran).values(formTpRl);
		}

		return { message: `Tujuan pembelajaran berhasil disimpan` };
	},

	async delete({ request }) {
		const formData = await request.formData();
		const tpId = formData.get('id')?.toString();
		if (!tpId) return fail(400, { fail: `ID kosong, tujuan pembelajaran gagal dihapus.` });

		await db.delete(tableTujuanPembelajaran).where(eq(tableTujuanPembelajaran.id, +tpId));
		return { message: `Tujuan pembelajaran telah dihapus` };
	}
};
