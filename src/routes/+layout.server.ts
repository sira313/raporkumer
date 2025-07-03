import db from '$lib/server/db';
import { tableSekolah } from '$lib/server/db/schema.js';
import { findTitleByPath } from '$lib/utils.js';
import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function load({ url, cookies, route }) {
	const sekolah_id = +(cookies.get('active_sekolah_id') || '1');
	const sekolah = await db.query.tableSekolah.findFirst({
		where: eq(tableSekolah.id, sekolah_id),
		with: { alamat: true, kepalaSekolah: true }
	});

	if (!sekolah && route.id != '/(informasi-umum)/sekolah/form') {
		redirect(303, `/sekolah/form`);
	}

	const meta: PageMeta = {
		title: findTitleByPath(url.pathname),
		description: ''
	};
	return { sekolah, meta };
}
