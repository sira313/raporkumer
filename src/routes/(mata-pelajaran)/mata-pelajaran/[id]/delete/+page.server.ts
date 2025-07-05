import db from '$lib/server/db/index.js';
import { tableMataPelajaran } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export async function load() {
	return { meta: { title: 'Hapus Mata Pelajaran' } };
}

export const actions = {
	async delete({ params }) {
		await db.delete(tableMataPelajaran).where(eq(tableMataPelajaran.id, +params.id));
		return { message: `Data mata pelajaran telah dihapus` };
	}
};
