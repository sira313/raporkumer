import db from '$lib/server/db/index.js';
import { tableAlamat, tableMurid, tableWaliMurid } from '$lib/server/db/schema.js';
import { unflattenFormData } from '$lib/utils.js';
import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function load({ params }) {
	const meta: PageMeta = { title: 'Form Murid' };
	if (!params.id) return { meta };

	const murid = await db.query.tableMurid.findFirst({
		where: eq(tableMurid.id, +params.id),
		with: { alamat: true, ibu: true, ayah: true, wali: true }
	});
	if (!murid) error(404, `Data murid tidak ditemukan`);
	return { murid, meta };
}

export const actions = {
	async save({ locals, request, params }) {
		const formMurid = unflattenFormData<Murid>(await request.formData());
		formMurid.sekolahId = locals.sekolah!.id;

		await db.transaction(async (db) => {
			if (params.id) {
				// update
				const murid = await db.query.tableMurid.findFirst({
					where: eq(tableMurid.id, +params.id)
				});
				if (!murid) error(404, `Data murid tidak ditemukan`);

				await db
					.update(tableAlamat)
					.set(formMurid.alamat)
					.where(eq(tableAlamat.id, murid.alamatId));

				formMurid.alamatId = murid.alamatId;
				formMurid.ibuId = await upsertWaliMurid(db, formMurid.ibu, murid.ibuId);
				formMurid.ayahId = await upsertWaliMurid(db, formMurid.ayah, murid.ayahId);
				formMurid.waliId = await upsertWaliMurid(db, formMurid.wali, murid.waliId);
				await db.update(tableMurid).set(formMurid).where(eq(tableMurid.id, +params.id));
			} else {
				// insert
				if (formMurid.alamat?.jalan) {
					const [alamat] = await db
						.insert(tableAlamat)
						.values(formMurid.alamat)
						.returning({ id: tableAlamat.id });
					formMurid.alamatId = alamat?.id;
				}

				formMurid.ibuId = await upsertWaliMurid(db, formMurid.ibu);
				formMurid.ayahId = await upsertWaliMurid(db, formMurid.ayah);
				formMurid.waliId = await upsertWaliMurid(db, formMurid.wali);
				formMurid.updatedAt = new Date().toISOString();
				const [murid] = await db
					.insert(tableMurid)
					.values(formMurid)
					.returning({ id: tableMurid.id });
				formMurid.id = murid?.id;
			}
		});

		if (formMurid.id) redirect(303, `/murid/form/${formMurid.id}`);

		return { message: `Data murid berhasil disimpan` };
	}
};

async function upsertWaliMurid(db: DBTransaction, wali: WaliMurid, waliId?: number | null) {
	if (waliId) {
		await db
			.update(tableWaliMurid) //
			.set(wali)
			.where(eq(tableWaliMurid.id, waliId));
	} else {
		const [newWali] = await db
			.insert(tableWaliMurid) //
			.values(wali)
			.returning({ id: tableWaliMurid.id });
		waliId = newWali?.id;
	}
	return waliId;
}
