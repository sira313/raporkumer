import db from '$lib/server/db';
import { tableAuthUser, tablePegawai, tableKelas } from '$lib/server/db/schema';
import { sql, eq, and } from 'drizzle-orm';
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
				createdAt: u.createdAt,
				type: u.type,
				pegawaiId: u.pegawaiId,
				pegawaiName: tablePegawai.nama,
				kelasId: u.kelasId,
				kelasName: tableKelas.nama
			})
			.from(u)
			.leftJoin(tablePegawai, eq(u.pegawaiId, tablePegawai.id))
			.leftJoin(tableKelas, eq(u.kelasId, tableKelas.id))
				.where(
					and(
						// exclude admin users from the listing
						sql`${u.type} != ${'admin'}`,
						q ? sql` lower(${u.username}) like ${'%' + q.toLowerCase() + '%'}` : sql` true`
					)
				)
			.limit(100);

	return { meta: { title: 'Manajemen Pengguna' }, users };
}
