import db from '$lib/server/db/index.js';
import { tableMurid } from '$lib/server/db/schema.js';
import { and, asc, eq, sql } from 'drizzle-orm';

export async function load({ locals, url, depends }) {
	depends('app:murid');
	const search = url.searchParams.get('q');
	const kelasId = url.searchParams.get('kelas_id');
	const daftarMurid = await db.query.tableMurid.findMany({
		where: and(
			eq(tableMurid.sekolahId, locals.sekolah!.id),
			kelasId ? eq(tableMurid.kelasId, +kelasId) : undefined,
			search ? sql`${tableMurid.nama} LIKE ${'%' + search + '%'} COLLATE NOCASE` : undefined
		),
		orderBy: asc(tableMurid.nama)
	});
	return { daftarMurid, page: { kelasId, search } };
}
