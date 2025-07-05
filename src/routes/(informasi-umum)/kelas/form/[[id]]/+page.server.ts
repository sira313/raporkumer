import db from '$lib/server/db/index.js';
import { tableKelas, tablePegawai } from '$lib/server/db/schema.js';
import { unflattenFormData } from '$lib/utils.js';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function load({ params }) {
	const meta: PageMeta = { title: 'Form Kelas' };
	if (!params?.id) return { meta };

	const kelas = await db.query.tableKelas.findFirst({
		where: eq(tableKelas.id, +params.id),
		with: { waliKelas: true }
	});
	if (!kelas) error(404, `Data kelas tidak ditemukan`);
	return { kelas, meta };
}

export const actions = {
	async save({ request, params, locals }) {
		const formKelas = unflattenFormData<Kelas>(await request.formData());

		// TODO: input validation

		await db.transaction(async (db) => {
			if (params.id) {
				const kelas = await db.query.tableKelas.findFirst({
					where: eq(tableKelas.id, +params.id),
					with: { waliKelas: true }
				});
				if (!kelas) error(404, `Data kelas tidak ditemukan`);

				await db
					.update(tablePegawai)
					.set(formKelas.waliKelas)
					.where(eq(tablePegawai.id, kelas.waliKelasId));

				formKelas.waliKelasId = kelas.waliKelasId;
				await db
					.update(tableKelas) //
					.set(formKelas)
					.where(eq(tableKelas.id, +params.id));
			} else {
				if (formKelas.waliKelas) {
					const [pegawai] = await db
						.insert(tablePegawai)
						.values(formKelas.waliKelas)
						.returning({ id: tablePegawai.id });
					formKelas.waliKelasId = pegawai?.id;
				}

				formKelas.sekolahId = locals.sekolah!.id;
				formKelas.updatedAt = new Date().toISOString();
				const [kelas] = await db
					.insert(tableKelas)
					.values(formKelas)
					.returning({ id: tableKelas.id });
				formKelas.id = kelas?.id;
			}
		});
		return { message: `Data kelas berhasil disimpan` };
	}
};
