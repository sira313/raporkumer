import { getKeasramaanPreviewPayload } from './preview-data';
import db from '$lib/server/db/index.js';
import { tableMurid } from '$lib/server/db/schema.js';
import { and, asc, eq, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	event.depends('app:cetak-keasramaan');

	const parentData = await event.parent();
	const daftarKelas = (parentData.daftarKelas ?? []) as Array<{ id: number }>;
	const kelasAktif = (parentData.kelasAktif ?? null) as { id: number } | null;

	const sekolahId = event.locals.sekolah?.id ?? null;
	const kelasParam =
		event.url.searchParams.get('kelas_id') ?? (kelasAktif ? String(kelasAktif.id) : null);
	const kelasId =
		kelasParam && daftarKelas.some((kelas) => kelas.id === Number(kelasParam))
			? String(kelasParam)
			: null;
	const kelasIds = daftarKelas.map((kelas) => kelas.id);

	let daftarMurid: Array<{ id: number; nama: string; nis: string | null; nisn: string | null }> =
		[];

	if (sekolahId && kelasIds.length) {
		const filter = and(
			eq(tableMurid.sekolahId, sekolahId),
			kelasId ? eq(tableMurid.kelasId, Number(kelasId)) : inArray(tableMurid.kelasId, kelasIds)
		);

		daftarMurid = await db.query.tableMurid.findMany({
			columns: {
				id: true,
				nama: true,
				nis: true,
				nisn: true
			},
			where: filter,
			orderBy: asc(tableMurid.nama)
		});
	}

	// Get single murid preview if muridId param is provided
	const muridIdParam = event.url.searchParams.get('murid_id');
	const initialPreviewPayload = muridIdParam
		? await getKeasramaanPreviewPayload({ locals: event.locals, url: event.url })
		: { meta: null, keasramaanData: null };

	return {
		kelasId,
		daftarMurid,
		...initialPreviewPayload
	};
}) satisfies PageServerLoad;
