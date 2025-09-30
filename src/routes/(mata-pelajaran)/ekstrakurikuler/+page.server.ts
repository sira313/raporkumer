import db from '$lib/server/db/index.js';
import { tableEkstrakurikuler } from '$lib/server/db/schema.js';
import { unflattenFormData } from '$lib/utils.js';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function load({ depends, url, parent }) {
	depends('app:ekstrakurikuler');
	const { daftarKelas = [], kelasAktif } = await parent();
	const kelasParam = url.searchParams.get('kelas_id') ?? (kelasAktif ? String(kelasAktif.id) : null);
	const kelasId =
		kelasParam && daftarKelas.some((kelas) => kelas.id === Number(kelasParam))
			? String(kelasParam)
			: null;
	const ekskul = kelasId
		? await db.query.tableEkstrakurikuler.findMany({
			where: eq(tableEkstrakurikuler.kelasId, +kelasId)
		  })
		: [];
	return { kelasId, ekskul };
}

export const actions = {
	async add({ request }) {
		const formEkskul = unflattenFormData<Ekstrakurikuler>(await request.formData());
		if (!formEkskul.kelasId || !formEkskul.nama) {
			return fail(400, { fail: `Harap lengkapi data` });
		}
		await db.insert(tableEkstrakurikuler).values(formEkskul);
		return { message: `Data ekstrakurikuler berhasil ditambahkan` };
	},

	async delete({ request }) {
		const formData = await request.formData();
		const eksId = formData.get('id')?.toString();
		if (!eksId) return fail(400, { fail: `ID kosong, ekstrakurikuler gagal dihapus` });
		await db.delete(tableEkstrakurikuler).where(eq(tableEkstrakurikuler.id, +eksId));
		return { message: `Data ekstrakurikuler telah dihapus` };
	}
};
