import db from '$lib/server/db';
import { tableMataPelajaran } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

type MataPelajaranList = Omit<MataPelajaran, 'tujuanPembelajaran'>[];

export async function load({ depends, url, parent }) {
	depends('app:mapel');
	const { kelasAktif, daftarKelas } = await parent();
	const fromQuery = url.searchParams.get('kelas_id');
	const kelasCandidate = fromQuery ? Number(fromQuery) : kelasAktif?.id ?? null;
	const kelasId =
		kelasCandidate != null && daftarKelas?.some((kelas) => kelas.id === kelasCandidate)
			? kelasCandidate
			: null;

	const mapel = kelasId
		? await db.query.tableMataPelajaran.findMany({
			where: eq(tableMataPelajaran.kelasId, kelasId)
		  })
		: [];

	const { daftarWajib, daftarPilihan, daftarMulok } = mapel.reduce(
		(acc, item) => {
			if (item.jenis === 'wajib') acc.daftarWajib.push(item);
			else if (item.jenis === 'pilihan') acc.daftarPilihan.push(item);
			else if (item.jenis === 'mulok') acc.daftarMulok.push(item);
			return acc;
		},
		{
			daftarWajib: <MataPelajaranList>[],
			daftarPilihan: <MataPelajaranList>[],
			daftarMulok: <MataPelajaranList>[]
		}
	);
	return { kelasId, mapel: { daftarWajib, daftarPilihan, daftarMulok } };
}
