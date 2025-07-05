import db from '$lib/server/db';
import { tableKelas } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';

export async function load({ locals }) {
	const daftarKelas = await db.query.tableKelas.findMany({
		where: eq(tableKelas.sekolahId, locals.sekolah!.id),
		orderBy: asc(tableKelas.nama)
	});
	return { daftarKelas };
}
