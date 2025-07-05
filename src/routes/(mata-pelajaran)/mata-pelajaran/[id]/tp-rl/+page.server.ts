import db from '$lib/server/db/index.js';
import { tableMataPelajaran } from '$lib/server/db/schema.js';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function load({ depends, params }) {
	depends('app:mapel_tp-rl');
	const mapel = await db.query.tableMataPelajaran.findFirst({
		with: { tujuanPembelajaran: true },
		where: eq(tableMataPelajaran.id, +params.id)
	});
	if (!mapel) error(404, `Data mata pelajar tidak ditemukan`);
	return {
		mapel,
		meta: {
			title: `Tujuan Pembelajaran - ${mapel.nama}`
		}
	};
}
