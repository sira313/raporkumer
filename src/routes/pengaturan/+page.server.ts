import db from '$lib/server/db';
import { tableSekolah } from '$lib/server/db/schema';
import { cookieNames } from '$lib/utils';
import { desc, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const meta: PageMeta = {
		title: 'Pengaturan',
		description: 'Pengaturan Aplikasi E-Rapor Kurikulum Merdeka'
	};

	const sekolahList = await db.query.tableSekolah.findMany({
		columns: { logo: false },
		orderBy: [desc(tableSekolah.id)]
	});

	return {
		meta,
		sekolahList,
		activeSekolahId: locals.sekolah?.id ?? null
	};
};

export const actions: Actions = {
	switch: async ({ request, cookies, locals }) => {
		const formData = await request.formData();
		const sekolahIdRaw = formData.get('sekolahId');

		const sekolahId = Number(sekolahIdRaw);
		if (!sekolahIdRaw || Number.isNaN(sekolahId)) {
			error(400, 'Identitas sekolah tidak valid');
		}

		const sekolah = await db.query.tableSekolah.findFirst({
			columns: { id: true },
			where: eq(tableSekolah.id, sekolahId)
		});

		if (!sekolah) {
			error(404, 'Data sekolah tidak ditemukan');
		}

		cookies.set(cookieNames.ACTIVE_SEKOLAH_ID, String(sekolah.id), { path: '/' });
		locals.sekolahDirty = true;

		return { message: 'Sekolah aktif diperbarui' };
	}
};
