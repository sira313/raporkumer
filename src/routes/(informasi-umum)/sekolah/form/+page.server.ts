import db from '$lib/server/db/index.js';
import { tableAlamat, tablePegawai, tableSekolah } from '$lib/server/db/schema.js';
import { unflatten } from '$lib/utils';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export const actions = {
	async save({ cookies, request }) {
		const form = await request.formData();
		const data = unflatten<Omit<Sekolah, 'id'> & { id?: number }>(Object.fromEntries(form));
		const logo = form.get('logo') as File;
		if (logo) data.logo = new Uint8Array(await logo.arrayBuffer());

		await db.transaction(async (db) => {
			if (data.id) {
				const sekolah = await db.query.tableSekolah.findFirst({
					where: eq(tableSekolah.id, +data.id),
					with: { alamat: true, kepalaSekolah: true }
				});
				if (!sekolah) error(404, `Data sekolah tidak ditemukan`);

				await db
					.update(tableAlamat) //
					.set(data.alamat)
					.where(eq(tableAlamat.id, sekolah.alamatId));

				await db
					.update(tablePegawai)
					.set(data.kepalaSekolah)
					.where(eq(tablePegawai.id, sekolah.kepalaSekolahId));

				await db
					.update(tableSekolah)
					.set({ ...data, alamatId: sekolah.alamatId, kepalaSekolahId: sekolah.kepalaSekolahId })
					.where(eq(tableSekolah.id, data.id));
			} else {
				delete data.id;
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

				const [newSekolah] = await db
					.insert(tableSekolah)
					.values(data)
					.returning({ id: tableSekolah.id });
				data.id = newSekolah.id;
			}
		});

		cookies.set('active_sekolah_id', String(data.id), { path: '/' });
		return { success: true };
	}
};
