import db from '$lib/server/db';
import { tableSekolah } from '$lib/server/db/schema';
import { cookieNames } from '$lib/utils';
import { redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { desc, eq } from 'drizzle-orm';

const cookieParser: Handle = async ({ event, resolve }) => {
	const sekolahId = event.cookies.get(cookieNames.ACTIVE_SEKOLAH_ID) || '';
	if (+sekolahId == event.locals.sekolah?.id && !event.locals.sekolahDirty) {
		return resolve(event);
	}

	const [sekolah] = await db.query.tableSekolah.findMany({
		columns: { logo: false },
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

const sqliteErrors = {
	SQLITE_CONSTRAINT_UNIQUE: 'Terdapat duplikasi data',
	SQLITE_CONSTRAINT_FOREIGNKEY: 'Data memiliki relasi ke data lainnya yang masih utuh'
};

export const handleError = ({ error, message, status }) => {
	console.error(error);
	if (status >= 500) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const code = (error as any)?.cause?.code as keyof typeof sqliteErrors;
		const customMessage = sqliteErrors[code] || message;
		return { message: customMessage };
	}
	return { message };
};
