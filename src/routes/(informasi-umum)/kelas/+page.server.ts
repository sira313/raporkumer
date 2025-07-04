import db from '$lib/server/db';
import { tableKelas } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export async function load({ locals }) {
	const daftarKelas = await db.query.tableKelas.findMany({
		where: eq(tableKelas.sekolahId, locals.sekolah?.id || 0),
		with: { waliKelas: true }
	});
	return { daftarKelas };
}
