import db from '$lib/server/db/index.js';
import { resolveSekolahAcademicContext } from '$lib/server/db/academic';
import { tableMurid } from '$lib/server/db/schema.js';
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

	return {
		academicContext,
		kelasId,
		daftarMurid,
		muridCount: daftarMurid.length
	};
}
