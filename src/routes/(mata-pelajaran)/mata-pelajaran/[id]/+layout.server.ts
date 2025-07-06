import db from '$lib/server/db';
import { tableMataPelajaran } from '$lib/server/db/schema.js';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function load({ params }) {
	const mapel = await db.query.tableMataPelajaran.findFirst({
		where: eq(tableMataPelajaran.id, +params.id),
		with: { kelas: true }
	});
	if (!mapel) error(404, `Data mata pelajar tidak ditemukan`);
	return {
		mapel,
		meta: { title: `Mata Pelajaran - ${mapel.nama}` }
	};
}
