import db from '$lib/server/db';
import { tableKelas } from '$lib/server/db/schema';
import { findTitleByPath } from '$lib/utils.js';
import { asc, eq } from 'drizzle-orm';

export async function load({ url, locals }) {
	const meta: PageMeta = {
		title: url.pathname === '/' ? 'Rapor Kurikulum Merdeka' : findTitleByPath(url.pathname),
		description: ''
	};

	const sekolah = locals.sekolah;
	const daftarKelas = sekolah
		? await db.query.tableKelas.findMany({
			columns: { id: true, nama: true, fase: true },
			with: { waliKelas: { columns: { id: true, nama: true } } },
			where: eq(tableKelas.sekolahId, sekolah.id),
			orderBy: asc(tableKelas.nama)
		  })
		: [];

	const kelasIdParam = url.searchParams.get('kelas_id');
	const kelasAktif =
		kelasIdParam != null
			? daftarKelas.find((kelas) => kelas.id === Number(kelasIdParam)) ?? null
			: null;

	return { sekolah, meta, daftarKelas, kelasAktif: kelasAktif ?? daftarKelas[0] ?? null };
}
