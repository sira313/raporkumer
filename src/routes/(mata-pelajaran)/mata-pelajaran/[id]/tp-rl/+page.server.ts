import db from '$lib/server/db/index.js';
import { tableTujuanPembelajaran } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export async function load({ depends, params }) {
	depends('app:mapel_tp-rl');
	const tujuanPembelajaran = await db.query.tableTujuanPembelajaran.findMany({
		where: eq(tableTujuanPembelajaran.mataPelajaranId, +params.id)
	});
	return { tujuanPembelajaran, meta: { title: `Tujuan Pembelajaran` } };
}
