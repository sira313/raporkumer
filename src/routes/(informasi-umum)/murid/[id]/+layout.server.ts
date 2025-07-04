import db from '$lib/server/db/index.js';
import { tableMurid } from '$lib/server/db/schema.js';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function load({ params }) {
	const murid = await db.query.tableMurid.findFirst({
		where: eq(tableMurid.id, +params.id),
		with: { kelas: true, alamat: true, ibu: true, ayah: true, wali: true }
	});
	if (!murid) error(404, `Data murid tidak ditemukan`);
	return { murid, meta: { title: 'Detail Murid' } };
}
