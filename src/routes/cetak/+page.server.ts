import db from '$lib/server/db/index.js';
import { resolveSekolahAcademicContext } from '$lib/server/db/academic';
import { tableMurid } from '$lib/server/db/schema.js';
import { computeNilaiAkhirRekap } from '$lib/server/nilai-akhir';
import { and, asc, eq, inArray } from 'drizzle-orm';

export async function load({ locals, url, depends, parent }) {
	depends('app:cetak');

	const parentData = await parent();
	const daftarKelas = (parentData.daftarKelas ?? []) as Array<{ id: number }>;
	const kelasAktif = (parentData.kelasAktif ?? null) as { id: number } | null;

	const sekolahId = locals.sekolah?.id ?? null;
	const academicContext = sekolahId ? await resolveSekolahAcademicContext(sekolahId) : null;

	const kelasParam =
		url.searchParams.get('kelas_id') ?? (kelasAktif ? String(kelasAktif.id) : null);
	const kelasId =
		kelasParam && daftarKelas.some((kelas) => kelas.id === Number(kelasParam))
			? String(kelasParam)
			: null;
	const kelasIds = daftarKelas.map((kelas) => kelas.id);

	if (!sekolahId || !kelasIds.length) {
		return {
			academicContext,
			kelasId,
			daftarMurid: [],
			muridCount: 0
		};
	}

	const filter = and(
		eq(tableMurid.sekolahId, sekolahId),
		kelasId ? eq(tableMurid.kelasId, Number(kelasId)) : inArray(tableMurid.kelasId, kelasIds)
	);

	const daftarMurid = await db.query.tableMurid.findMany({
		columns: {
			id: true,
			nama: true,
			nis: true,
			nisn: true
		},
		where: filter,
		orderBy: asc(tableMurid.nama)
	});

		let piagamRankingOptions: Array<{
			muridId: number;
			peringkat: number;
			nama: string;
			nilaiRataRata: number | null;
		}> = [];

		if (kelasId) {
			const kelasIdNumber = Number(kelasId);
			const rekap = await computeNilaiAkhirRekap({ sekolahId, kelasId: kelasIdNumber });
			piagamRankingOptions = rekap.rows
				.filter((row) => Number.isFinite(row.peringkat) && row.peringkat >= 1)
				.sort((a, b) => a.peringkat - b.peringkat)
				.slice(0, 4)
				.map((row) => ({
					muridId: row.id,
					peringkat: row.peringkat,
					nama: row.nama,
					nilaiRataRata: row.nilaiRataRata
				}));
		}

	return {
		academicContext,
		kelasId,
			daftarMurid,
			muridCount: daftarMurid.length,
			piagamRankingOptions
	};
}
