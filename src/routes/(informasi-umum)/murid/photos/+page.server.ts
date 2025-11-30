import db from '$lib/server/db/index.js';
import { tableMurid, tableKelas } from '$lib/server/db/schema.js';
import { redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';

export async function load({ locals, parent }) {
	const parentData = await parent();
	const kelasAktif = (parentData.kelasAktif ?? null) as {
		id: number;
		nama: string;
		fase: string | null;
	} | null;

	if (!kelasAktif) {
		throw redirect(303, '/murid');
	}

	const kelasId = kelasAktif.id;
	const sekolahId = locals.sekolah?.id;

	if (!sekolahId) {
		throw redirect(303, '/murid');
	}

	// Fetch kelas information
	const kelas = await db.query.tableKelas.findFirst({
		where: eq(tableKelas.id, kelasId),
		columns: { id: true, nama: true, fase: true }
	});

	if (!kelas) {
		throw redirect(303, '/murid');
	}

	// Fetch all murid in this kelas
	const daftarMurid = await db.query.tableMurid.findMany({
		where: eq(tableMurid.kelasId, kelasId),
		columns: {
			id: true,
			nama: true,
			nisn: true,
			foto: true
		},
		orderBy: asc(tableMurid.nama)
	});

	return {
		kelas,
		daftarMurid
	};
}
