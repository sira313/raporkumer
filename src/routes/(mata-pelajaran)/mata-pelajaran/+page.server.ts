import db from '$lib/server/db';
import { tableMataPelajaran } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

type MataPelajaranList = Omit<MataPelajaran, 'tujuanPembelajaran'>[];

export async function load({ depends, url }) {
	depends('app:mapel');
	const kelasId = url.searchParams.get('kelas_id');
	const mapel = kelasId
		? await db.query.tableMataPelajaran.findMany({
				where: eq(tableMataPelajaran.kelasId, +kelasId)
			})
		: [];

	const { daftarWajib, daftarMulok } = mapel.reduce(
		(acc, item) => {
			if (item.jenis == 'wajib') acc.daftarWajib.push(item);
			else if (item.jenis == 'mulok') acc.daftarMulok.push(item);
			return acc;
		},
		{ daftarWajib: <MataPelajaranList>[], daftarMulok: <MataPelajaranList>[] }
	);
	return { kelasId, mapel: { daftarWajib, daftarMulok } };
}
