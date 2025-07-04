import db from '$lib/server/db';
import { tableMataPelajaran } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function load({ url }) {
	const kelasId = url.searchParams.get('kelas_id');
	if (!kelasId) return {};

	const mapel = await db.query.tableMataPelajaran.findMany({
		where: eq(tableMataPelajaran.kelasId, +kelasId)
	});
	return { mapel };
}
