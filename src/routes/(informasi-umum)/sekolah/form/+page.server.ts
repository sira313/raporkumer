import db from '$lib/server/db/index.js';
import { tableAlamat, tablePegawai, tableSekolah } from '$lib/server/db/schema.js';
import { cookieNames, unflattenFormData } from '$lib/utils';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export function load({ url }) {
	const isInit = url.searchParams.has('init');
	const isNew = url.searchParams.get('mode') === 'new';
	return { isInit, isNew, meta: { title: isNew ? 'Tambah Sekolah' : 'Form Sekolah' } };
}

export const actions = {
	async save({ locals, cookies, request }) {
		const formData = await request.formData();
		const formSekolah = unflattenFormData<Sekolah>(formData);

		// TODO: input validation

		const logo = formData.get('logo') as File;
		if (logo?.size) {
			formSekolah.logo = new Uint8Array(await logo.arrayBuffer());
			formSekolah.logoType = logo.type;
		} else {
			formSekolah.logo = null;
		}

		await db.transaction(async (db) => {
			if (formSekolah.id) {
				const sekolah = await db.query.tableSekolah.findFirst({
					where: eq(tableSekolah.id, +formSekolah.id)
				});
				if (!sekolah) error(404, `Data sekolah tidak ditemukan`);

				await db
					.update(tableAlamat) //
					.set(formSekolah.alamat)
					.where(eq(tableAlamat.id, sekolah.alamatId));

				await db
					.update(tablePegawai)
					.set(formSekolah.kepalaSekolah)
					.where(eq(tablePegawai.id, sekolah.kepalaSekolahId));

				await db
					.update(tableSekolah)
					.set({
						...formSekolah,
						alamatId: sekolah.alamatId,
						kepalaSekolahId: sekolah.kepalaSekolahId,
						updatedAt: new Date().toISOString()
					})
					.where(eq(tableSekolah.id, formSekolah.id));
			} else {
				if (formSekolah.alamat) {
					const [alamat] = await db
						.insert(tableAlamat)
						.values(formSekolah.alamat)
						.returning({ id: tableAlamat.id });
					formSekolah.alamatId = alamat?.id;
				}

				if (formSekolah.kepalaSekolah) {
					const [pegawai] = await db
						.insert(tablePegawai)
						.values(formSekolah.kepalaSekolah)
						.returning({ id: tablePegawai.id });
					formSekolah.kepalaSekolahId = pegawai?.id;
				}

				const [newSekolah] = await db
					.insert(tableSekolah)
					.values(formSekolah)
					.returning({ id: tableSekolah.id });
				formSekolah.id = newSekolah?.id;
			}

			if (!formSekolah.id) error(409, `Gagal simpan data sekolah`);
		});

		locals.sekolahDirty = true;
		cookies.set(cookieNames.ACTIVE_SEKOLAH_ID, String(formSekolah.id), { path: '/' });
		return { message: 'Data sekolah berhasil disimpan' };
	}
};
