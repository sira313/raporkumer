import db from '$lib/server/db/index.js';
import { tableMurid } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export async function load() {
	return { meta: { title: 'Hapus Murid' } };
}

export const actions = {
	async delete({ params }) {
		await db.delete(tableMurid).where(eq(tableMurid.id, +params.id));
		return { message: `Data murid berhasil dihapus` };
	}
};
