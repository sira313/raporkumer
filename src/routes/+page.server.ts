import db from '$lib/server/db';
import { tableKelas, tableMurid } from '$lib/server/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function load(event) {
	const parentData = await event.parent();
	const sekolahId = event.locals.sekolah?.id ?? null;

	const statistikDashboard = {
		rombel: {
			total: 0,
			perFase: [] as Array<{ fase: string | null; label: string; jumlah: number }>
		},
		murid: {
			total: 0
		}
	};

	if (!sekolahId) {
		return {
			...parentData,
			statistikDashboard
		};
	}

	const daftarKelas = await db.query.tableKelas.findMany({
		columns: { id: true, fase: true },
		where: eq(tableKelas.sekolahId, sekolahId)
	});

	statistikDashboard.rombel.total = daftarKelas.length;

	const perFaseMap = new Map<string | null, number>();
	for (const kelas of daftarKelas) {
		const key = kelas.fase ?? null;
		perFaseMap.set(key, (perFaseMap.get(key) ?? 0) + 1);
	}

	statistikDashboard.rombel.perFase = Array.from(perFaseMap.entries())
		.map(([fase, jumlah]) => ({
			fase,
			label: fase ?? 'Belum ditetapkan',
			jumlah
		}))
		.sort((a, b) => a.label.localeCompare(b.label, 'id'));

	const muridCountRows = await db
		.select({ totalMurid: sql<number>`count(*)` })
		.from(tableMurid)
		.where(eq(tableMurid.sekolahId, sekolahId));

	statistikDashboard.murid.total = muridCountRows[0]?.totalMurid ?? 0;

	return {
		...parentData,
		statistikDashboard
	};
}
