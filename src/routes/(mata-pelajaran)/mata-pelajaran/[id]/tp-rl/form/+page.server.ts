import db from '$lib/server/db';
import { tableTujuanPembelajaran } from '$lib/server/db/schema';
import { unflattenFormData } from '$lib/utils';

export async function load({ params }) {
	return { mapelId: +params.id, meta: { title: `Tambah Tujuan Pembelajaran` } };
}

export const actions = {
	async add({ params, request }) {
		const formTpRl = unflattenFormData<TujuanPembelajaran>(await request.formData());
		formTpRl.mataPelajaranId = +params.id;

		// TODO: validation

		await db.insert(tableTujuanPembelajaran).values(formTpRl);
		return { message: `Tujuan pembelajaran berhasil disimpan` };
	}
};
