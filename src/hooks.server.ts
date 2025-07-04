import db from '$lib/server/db';
import { tableSekolah } from '$lib/server/db/schema';
import { cookieNames } from '$lib/utils';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { desc, eq } from 'drizzle-orm';

const cookieParser: Handle = async ({ event, resolve }) => {
	const sekolahId = event.cookies.get(cookieNames.ACTIVE_SEKOLAH_ID) || '';
	const [sekolah] = await db.query.tableSekolah.findMany({
		with: { alamat: true, kepalaSekolah: true },
		where: +sekolahId ? eq(tableSekolah.id, +sekolahId) : undefined,
		limit: 1,
		orderBy: [desc(tableSekolah.id)]
	});

	if (!sekolahId && sekolah?.id) {
		event.cookies.set(cookieNames.ACTIVE_SEKOLAH_ID, String(sekolah.id), { path: '/' });
	}

	if (!sekolah?.id && event.route.id != '/(informasi-umum)/sekolah/form') {
		redirect(303, `/sekolah/form?init`);
	}

	event.locals.sekolah = sekolah;
	return resolve(event);
};

export const handle = sequence(cookieParser);
