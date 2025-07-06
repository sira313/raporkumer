import db from '$lib/server/db';
import { tableKelas } from '$lib/server/db/schema.js';
import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';

export async function load({ depends, locals }) {
	depends('app:kelas');
	const daftarKelas = await db.query.tableKelas.findMany({
		where: eq(tableKelas.sekolahId, locals.sekolah?.id || 0),
		with: { waliKelas: true }
	});
	return { daftarKelas };
}

export const actions = {
	async delete({ request }) {
		const formData = await request.formData();
		const kelasId = formData.get('id')?.toString();
		if (!kelasId) return fail(400, { fail: `ID kelas kosong, hapus kelas gagal.` });

		await db.delete(tableKelas).where(eq(tableKelas.id, +kelasId));
		return { message: `Kelas berhasil dihapus` };
	}
};
