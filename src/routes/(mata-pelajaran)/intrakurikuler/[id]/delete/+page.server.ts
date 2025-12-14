import db from '$lib/server/db/index.js';
import { tableMataPelajaran, tableTujuanPembelajaran } from '$lib/server/db/schema.js';
import { eq, inArray, and, like } from 'drizzle-orm';
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
			// Get the mapel being deleted
			const mapel = await db.query.tableMataPelajaran.findFirst({
				columns: { id: true, nama: true, kelasId: true },
				where: eq(tableMataPelajaran.id, id)
			});

			if (!mapel) {
				return fail(404, { fail: 'Mata pelajaran tidak ditemukan.' });
			}

			// Check if this is parent PKS or parent Agama
			const isPksParent = mapel.nama === 'Pendalaman Kitab Suci';
			const isAgamaParent = mapel.nama === 'Pendidikan Agama dan Budi Pekerti';

			const idsToDelete: number[] = [id];

			// If deleting parent PKS or Agama, also delete all variants in the same kelas
			if (isPksParent || isAgamaParent) {
				const pattern = isPksParent ? 'Pendalaman Kitab Suci%' : 'Pendidikan Agama%';
				const variants = await db.query.tableMataPelajaran.findMany({
					columns: { id: true },
					where: and(
						eq(tableMataPelajaran.kelasId, mapel.kelasId),
						like(tableMataPelajaran.nama, pattern)
					)
				});
				idsToDelete.push(...variants.map((v) => v.id));
			}

			// Hapus Tujuan Pembelajaran yang terkait dulu agar tidak menabrak constraint
			await db
				.delete(tableTujuanPembelajaran)
				.where(inArray(tableTujuanPembelajaran.mataPelajaranId, idsToDelete));

			// lalu hapus mata pelajaran
			await db.delete(tableMataPelajaran).where(inArray(tableMataPelajaran.id, idsToDelete));

			const deletedCount = idsToDelete.length;
			const message =
				deletedCount > 1
					? `Data mata pelajaran beserta ${deletedCount - 1} varian telah dihapus`
					: `Data mata pelajaran telah dihapus`;

			return { message };
		} catch (error) {
			console.error('Gagal menghapus mata pelajaran:', error);
			return fail(500, { fail: 'Gagal menghapus mata pelajaran.' });
		}
	}
};
