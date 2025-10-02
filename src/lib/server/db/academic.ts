import db from '$lib/server/db';
import { tableSemester, tableTahunAjaran } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export type AcademicContext = {
	tahunAjaranList: (typeof tableTahunAjaran.$inferSelect & {
		semester: typeof tableSemester.$inferSelect[];
	})[];
	activeTahunAjaranId: number | null;
	activeSemesterId: number | null;
	tanggalBagiRaport: {
		ganjilId?: number;
		ganjil?: string | null;
		genapId?: number;
		genap?: string | null;
	};
};

export async function resolveSekolahAcademicContext(sekolahId: number): Promise<AcademicContext> {
	const tahunAjaranList = await db.query.tableTahunAjaran.findMany({
		where: eq(tableTahunAjaran.sekolahId, sekolahId),
		orderBy: [desc(tableTahunAjaran.id)],
		with: {
			semester: true
		}
	});

	let activeTahunAjaranId: number | null = null;
	let activeSemesterId: number | null = null;
	let tanggalBagiRaport: AcademicContext['tanggalBagiRaport'] = {};

	const activeTahunAjaran =
		tahunAjaranList.find((item) => item.isAktif) ?? tahunAjaranList.at(0) ?? null;

	if (activeTahunAjaran) {
		activeTahunAjaranId = activeTahunAjaran.id;
		const activeSemester =
			activeTahunAjaran.semester.find((item) => item.isAktif) ??
			activeTahunAjaran.semester.at(0) ??
			null;
		activeSemesterId = activeSemester?.id ?? null;

		const ganjil = activeTahunAjaran.semester.find((item) => item.tipe === 'ganjil');
		const genap = activeTahunAjaran.semester.find((item) => item.tipe === 'genap');
		tanggalBagiRaport = {
			ganjilId: ganjil?.id,
			ganjil: ganjil?.tanggalBagiRaport ?? null,
			genapId: genap?.id,
			genap: genap?.tanggalBagiRaport ?? null
		};
	}

	return { tahunAjaranList, activeTahunAjaranId, activeSemesterId, tanggalBagiRaport };
}
