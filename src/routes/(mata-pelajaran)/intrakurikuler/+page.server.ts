import db from '$lib/server/db';
import { ensureAgamaMapelForClasses } from '$lib/server/mapel-agama';
import { tableMataPelajaran, tableTujuanPembelajaran } from '$lib/server/db/schema';
import { agamaVariantNames } from '$lib/statics';
import { eq, inArray } from 'drizzle-orm';

type MataPelajaranBase = Omit<MataPelajaran, 'tujuanPembelajaran'>;
type MataPelajaranWithTp = MataPelajaranBase & { tpCount: number };
type MataPelajaranList = MataPelajaranWithTp[];

const AGAMA_VARIANT_NAME_SET = new Set<string>(agamaVariantNames);

export async function load({ depends, url, parent }) {
	depends('app:mapel');
	const { kelasAktif, daftarKelas } = await parent();
	const daftarKelasEntries = daftarKelas as Array<{ id: number }> | undefined;
	await ensureAgamaMapelForClasses(daftarKelasEntries?.map((kelas) => kelas.id) ?? []);
	const fromQuery = url.searchParams.get('kelas_id');
	const kelasCandidate = fromQuery ? Number(fromQuery) : (kelasAktif?.id ?? null);
	const kelasId =
		kelasCandidate != null && daftarKelasEntries?.some((kelas) => kelas.id === kelasCandidate)
			? kelasCandidate
			: null;

	const mapel = kelasId
		? await db.query.tableMataPelajaran.findMany({
				where: eq(tableMataPelajaran.kelasId, kelasId)
			})
		: [];

	const tpCountByMapelId = new Map<number, number>();
	if (mapel.length > 0) {
		const mapelIds = mapel.map((item) => item.id);
		const tujuanList = await db.query.tableTujuanPembelajaran.findMany({
			columns: { mataPelajaranId: true },
			where: inArray(tableTujuanPembelajaran.mataPelajaranId, mapelIds)
		});
		for (const entry of tujuanList) {
			const current = tpCountByMapelId.get(entry.mataPelajaranId) ?? 0;
			tpCountByMapelId.set(entry.mataPelajaranId, current + 1);
		}
	}

	const mapelWithIndicator: MataPelajaranWithTp[] = mapel.map((item) => ({
		...item,
		tpCount: tpCountByMapelId.get(item.id) ?? 0
	}));

	const mapelTampil = mapelWithIndicator.filter((item) => !AGAMA_VARIANT_NAME_SET.has(item.nama));

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
