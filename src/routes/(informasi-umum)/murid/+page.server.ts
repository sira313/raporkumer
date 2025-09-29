import db from '$lib/server/db/index.js';
import { tableMurid } from '$lib/server/db/schema.js';
import { fail } from '@sveltejs/kit';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

export async function load({ locals, url, depends }) {
	depends('app:murid');
	const search = url.searchParams.get('q');
	const kelasId = url.searchParams.get('kelas_id');
	const daftarMurid = await db.query.tableMurid.findMany({
		where: and(
			eq(tableMurid.sekolahId, locals.sekolah!.id),
			kelasId ? eq(tableMurid.kelasId, +kelasId) : undefined,
			search ? sql`${tableMurid.nama} LIKE ${'%' + search + '%'} COLLATE NOCASE` : undefined
		),
		orderBy: asc(tableMurid.nama)
	});
	return { daftarMurid, page: { kelasId, search } };
}

export const actions = {
	async deleteSelected({ request, locals }) {
		const sekolahId = locals.sekolah?.id;
		if (!sekolahId) {
			return fail(401, { fail: 'Sekolah tidak ditemukan' });
		}

		const formData = await request.formData();
		const rawIds = formData.getAll('muridIds');
		const muridIds = rawIds
			.map((id) => Number(id))
			.filter((id) => Number.isInteger(id) && id > 0);

		if (!muridIds.length) {
			return fail(400, { fail: 'Pilih minimal satu murid untuk dihapus' });
		}

		await db
			.delete(tableMurid)
			.where(and(eq(tableMurid.sekolahId, sekolahId), inArray(tableMurid.id, muridIds)));

		return { message: `${muridIds.length} murid berhasil dihapus` };
	}
};
