import db from '$lib/server/db/index.js';
import { tableMataPelajaran, tableTujuanPembelajaran } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';

export async function load() {
	return { meta: { title: 'Hapus Mata Pelajaran' } };
}

export const actions = {
	async delete({ params, request }) {
		const form = await request.formData();
		if (!form.get('confirm')) {
			return fail(400, { fail: 'Konfirmasi penghapusan diperlukan.' });
		}

		const id = +params.id;
		try {
			// Hapus Tujuan Pembelajaran yang terkait dulu agar tidak menabrak constraint
			await db
				.delete(tableTujuanPembelajaran)
				.where(eq(tableTujuanPembelajaran.mataPelajaranId, id));

			// lalu hapus mata pelajaran
			await db.delete(tableMataPelajaran).where(eq(tableMataPelajaran.id, id));

			return { message: `Data mata pelajaran telah dihapus` };
		} catch (error) {
			console.error('Gagal menghapus mata pelajaran:', error);
			return fail(500, { fail: 'Gagal menghapus mata pelajaran.' });
		}
	}
};
