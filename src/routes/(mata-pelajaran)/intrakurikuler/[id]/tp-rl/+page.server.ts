import db from '$lib/server/db/index.js';
import { tableTujuanPembelajaran } from '$lib/server/db/schema.js';
import { unflattenFormData } from '$lib/utils';
import { fail } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';

export async function load({ depends, params }) {
	depends('app:mapel_tp-rl');
	const tujuanPembelajaran = await db.query.tableTujuanPembelajaran.findMany({
		where: eq(tableTujuanPembelajaran.mataPelajaranId, +params.id),
		orderBy: asc(tableTujuanPembelajaran.createdAt)
	});
	return { tujuanPembelajaran, meta: { title: `Tujuan Pembelajaran` } };
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
