import db from '$lib/server/db/index.js';
import { tableAlamat, tablePegawai, tableSekolah } from '$lib/server/db/schema.js';
import { unflatten } from '$lib/utils';

export async function load() {
	return {};
}

export const actions = {
	async save({ request }) {
		const form = await request.formData();
		const data = unflatten<Sekolah>(Object.fromEntries(form));
		const logo = form.get('logo') as File;
		if (logo) data.logo = new Uint8Array(await logo.arrayBuffer());

		await db.transaction(async (db) => {
			if (data.alamat) {
				const [alamat] = await db
					.insert(tableAlamat)
					.values(data.alamat)
					.returning({ id: tableAlamat.id });
				data.alamatId = alamat.id;
			}

			if (data.kepalaSekolah) {
				const [pegawai] = await db
					.insert(tablePegawai)
					.values(data.kepalaSekolah)
					.returning({ id: tablePegawai.id });
				data.kepalaSekolahId = pegawai.id;
			}

			await db.insert(tableSekolah).values(data);
		});

		return { success: true };
	}
};
