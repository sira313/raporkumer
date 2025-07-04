import db from '$lib/server/db';
import { tableKelas } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';

export async function load({ locals, url }) {
	const daftarKelas = await db.query.tableKelas.findMany({
		where: eq(tableKelas.sekolahId, locals.sekolah!.id),
		orderBy: asc(tableKelas.nama)
	});

	if (daftarKelas.length && !url.searchParams.get('kelas_id')) {
		redirect(303, `/murid?kelas_id=${daftarKelas[0].id}`);
	}

	return { daftarKelas };
}
