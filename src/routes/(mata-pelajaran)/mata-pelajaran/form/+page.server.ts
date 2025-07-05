import db from '$lib/server/db/index.js';
import { tableMataPelajaran } from '$lib/server/db/schema';
import { unflattenFormData } from '$lib/utils';

export async function load() {
	return { meta: { title: `Form Mata Pelajaran` } };
}

export const actions = {
	async add({ request }) {
		const formMapel = unflattenFormData<MataPelajaran>(await request.formData());

		// TODO: validation
		await db.insert(tableMataPelajaran).values(formMapel);
		return { message: `Data mata pelajaran berhasil ditambah` };
	}
};
