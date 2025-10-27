import db from '$lib/server/db';
import { tableAuthUser } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import { authority } from './utils.server';

const u = tableAuthUser;

export async function load({ url }) {
	authority('user_list');

	// TODO: implement pagination
	const q = url.searchParams.get('q');

	const users = await db
		.select({
			id: u.id,
			username: u.username,
			createdAt: u.createdAt
		})
		.from(u)
		.where(q ? sql` lower(${u.username}) like ${'%' + q.toLowerCase() + '%'}` : sql` true`)
		.limit(100);

	return { meta: { title: 'Manajemen Pengguna' }, users };
}
