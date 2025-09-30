import db from '$lib/server/db';
import { ensureAgamaMapelForClasses } from '$lib/server/mapel-agama';
import { tableMataPelajaran } from '$lib/server/db/schema';
import { agamaVariantNames } from '$lib/statics';
import { eq } from 'drizzle-orm';

type MataPelajaranList = Omit<MataPelajaran, 'tujuanPembelajaran'>[];

const AGAMA_VARIANT_NAME_SET = new Set<string>(agamaVariantNames);

export async function load({ depends, url, parent }) {
	depends('app:mapel');
	const { kelasAktif, daftarKelas } = await parent();
	await ensureAgamaMapelForClasses(daftarKelas?.map((kelas) => kelas.id) ?? []);
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

	const mapelTampil = mapel.filter((item) => !AGAMA_VARIANT_NAME_SET.has(item.nama));

	const { daftarWajib, daftarPilihan, daftarMulok } = mapelTampil.reduce(
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
