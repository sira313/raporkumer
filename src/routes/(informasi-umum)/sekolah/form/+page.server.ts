import db from '$lib/server/db/index.js';
import { tableAlamat, tablePegawai, tableSekolah } from '$lib/server/db/schema.js';
import { unflatten } from '$lib/utils';

export const actions = {
	async save({ cookies, request }) {
		const form = await request.formData();
		const data = unflatten<Sekolah>(Object.fromEntries(form));
		const logo = form.get('logo') as File;
		if (logo) data.logo = new Uint8Array(await logo.arrayBuffer());

		const sekolahId = await db.transaction(async (db) => {
			data.id = data.id ? +data.id : 0;

			// TODO: do upsert

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

			const [sekolah] = await db
				.insert(tableSekolah)
				.values(data)
				.returning({ id: tableSekolah.id });

			if (!sekolah.id) throw new Error('Gagal menyimpan data sekolah');
			return sekolah.id;
		});

		cookies.set('active_sekolah_id', String(sekolahId), { path: '/' });
		return { success: true };
	}
};
