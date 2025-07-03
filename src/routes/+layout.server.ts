import db from '$lib/server/db';
import { tableSekolah } from '$lib/server/db/schema.js';
import { findTitleByPath } from '$lib/utils.js';
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function load({ url, cookies, route }) {
	const rawSekolahId = cookies.get('active_sekolah_id') || '';
	const [sekolah] = await db.query.tableSekolah.findMany({
		with: { alamat: true, kepalaSekolah: true },
		where: +rawSekolahId ? eq(tableSekolah.id, +rawSekolahId) : undefined,
		limit: 1
	});

	if (!sekolah?.id && route.id != '/(informasi-umum)/sekolah/form') {
		redirect(303, `/sekolah/form`);
	}

	if (sekolah?.id) {
		cookies.set('active_sekolah_id', String(sekolah.id), { path: '/' });
	}

	const meta: PageMeta = {
		title: findTitleByPath(url.pathname),
		description: ''
	};
	return { sekolah, meta };
}
