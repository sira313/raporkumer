import db from '$lib/server/db/index.js';
import { tableAlamat, tablePegawai, tableSekolah } from '$lib/server/db/schema.js';
import { cookieNames, unflattenFormData } from '$lib/utils';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { authority } from '../../../pengguna/utils.server';

export async function load({ url, locals }) {
	authority('sekolah_manage');
	const isInit = url.searchParams.has('init');
	const isNew = url.searchParams.get('mode') === 'new';
	const sekolahIdParam = url.searchParams.get('sekolahId');

	// Jika ada parameter sekolahId, load sekolah tersebut
	let sekolahToEdit: Sekolah | Omit<Sekolah, 'logo'> | undefined = undefined;
	if (sekolahIdParam && !isNew) {
		const sekolahId = Number(sekolahIdParam);
		if (Number.isInteger(sekolahId) && sekolahId > 0) {
			const sekolah = await db.query.tableSekolah.findFirst({
				where: eq(tableSekolah.id, sekolahId),
				with: {
					alamat: true,
					kepalaSekolah: true
				}
			});
			if (!sekolah) {
				error(404, 'Sekolah tidak ditemukan');
			}
			// Exclude logo and logoDinas from form init (can't populate file inputs anyway)
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { logo, logoType, logoDinas, logoDinasType, ...sekolahData } = sekolah;
			sekolahToEdit = sekolahData as Sekolah;
		}
	} else if (!isNew) {
		// Jika tidak ada parameter sekolahId dan bukan mode new, gunakan sekolah aktif
		// locals.sekolah already has logo excluded by type
		sekolahToEdit = locals.sekolah;
	}

	return {
		isInit,
		isNew,
		sekolah: sekolahToEdit,
		meta: { title: isNew ? 'Tambah Sekolah' : 'Form Sekolah' }
	};
}

export const actions = {
	async save({ locals, cookies, request }) {
		authority('sekolah_manage');

		const formData = await request.formData();
		const formSekolah = unflattenFormData<Sekolah>(formData);

		// TODO: input validation

		// Prepare update data - exclude logo fields if not provided
		const updateData: Partial<typeof formSekolah> = { ...formSekolah };

		const logo = formData.get('logo') as File;
		if (logo?.size) {
			updateData.logo = new Uint8Array(await logo.arrayBuffer());
			updateData.logoType = logo.type;
		} else {
			// Jika tidak ada file baru di-upload, jangan ubah nilai logo yang ada
			delete updateData.logo;
			delete updateData.logoType;
		}

		const logoDinas = formData.get('logoDinas') as File;
		if (logoDinas?.size) {
			updateData.logoDinas = new Uint8Array(await logoDinas.arrayBuffer());
			updateData.logoDinasType = logoDinas.type;
		} else {
			// Jika tidak ada file baru di-upload, jangan ubah nilai logoDinas yang ada
			delete updateData.logoDinas;
			delete updateData.logoDinasType;
		}

		// Use updateData for further processing
		const formSekolahFinal = updateData as typeof formSekolah;

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
						...formSekolahFinal,
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
					// also attach to the final insert payload so inserted sekolah gets the foreign key
					formSekolahFinal.alamatId = alamat?.id;
				}

				if (formSekolah.kepalaSekolah) {
					const [pegawai] = await db
						.insert(tablePegawai)
						.values(formSekolah.kepalaSekolah)
						.returning({ id: tablePegawai.id });
					formSekolah.kepalaSekolahId = pegawai?.id;
					formSekolahFinal.kepalaSekolahId = pegawai?.id;
				}

				const [newSekolah] = await db
					.insert(tableSekolah)
					.values(formSekolahFinal)
					.returning({ id: tableSekolah.id });
				formSekolah.id = newSekolah?.id;
			}

			if (!formSekolah.id) error(409, `Gagal simpan data sekolah`);
		});

		locals.sekolahDirty = true;
		const secure = locals.requestIsSecure ?? false;
		cookies.set(cookieNames.ACTIVE_SEKOLAH_ID, String(formSekolah.id), {
			path: '/',
			secure
		});
		return { message: 'Data sekolah berhasil disimpan' };
	}
};
