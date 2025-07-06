import db from '$lib/server/db/index.js';
import { tableEkstrakurikuler } from '$lib/server/db/schema.js';
import { unflattenFormData } from '$lib/utils.js';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function load({ depends, url }) {
	depends('app:ekstrakurikuler');
	const kelasId = url.searchParams.get('kelas_id');
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
	}
};
