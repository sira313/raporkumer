import db from '$lib/server/db';
import { tableSekolah } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const sekolahList = await db.query.tableSekolah.findMany({
		columns: { logo: false },
		with: { alamat: true, kepalaSekolah: true },
		orderBy: [desc(tableSekolah.id)]
	});

	return {
		sekolahList,
		sekolah: locals.sekolah,
		meta: { title: 'Data Sekolah', logoUrl: '/sekolah/logo' }
	};
};
