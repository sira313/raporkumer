import db from '$lib/server/db';
import { tableSemester, tableTahunAjaran } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export type AcademicContext = {
	tahunAjaranList: (typeof tableTahunAjaran.$inferSelect & {
		semester: (typeof tableSemester.$inferSelect)[];
	})[];
	activeTahunAjaranId: number | null;
	activeSemesterId: number | null;
	activeSemesterTipe: 'ganjil' | 'genap' | null;
	tanggalBagiRaport: {
		ganjilId?: number;
		ganjil?: string | null;
		genapId?: number;
		genap?: string | null;
	};
	tanggalMasuk: {
		ganjilId?: number;
		ganjil?: string | null;
		genapId?: number;
		genap?: string | null;
	};
};

// ponytail: simple in-process TTL cache for academic context.
// Only safe because SvelteKit dev server is single-process; for prod multi-instance
// use a shared cache (e.g. Redis). Upgrade path: invalidate on year/semester mutations.
const CACHE_TTL_MS = 10_000;
const academicCache = new Map<number, { data: AcademicContext; expiresAt: number }>();

export function invalidateAcademicCache(sekolahId?: number) {
	if (sekolahId != null) {
		academicCache.delete(sekolahId);
	} else {
		academicCache.clear();
	}
}

export async function resolveSekolahAcademicContext(sekolahId: number): Promise<AcademicContext> {
	const now = Date.now();
	const cached = academicCache.get(sekolahId);
	// return a shallow copy so consumers can't mutate the shared cached object
	if (cached && cached.expiresAt > now) return { ...cached.data };

	const tahunAjaranList = await db.query.tableTahunAjaran.findMany({
		where: eq(tableTahunAjaran.sekolahId, sekolahId),
		orderBy: [desc(tableTahunAjaran.id)],
		with: {
			semester: true
		}
	});

	let activeTahunAjaranId: number | null = null;
	let activeSemesterId: number | null = null;
	let activeSemesterTipe: AcademicContext['activeSemesterTipe'] = null;
	let tanggalBagiRaport: AcademicContext['tanggalBagiRaport'] = {};
	let tanggalMasuk: AcademicContext['tanggalMasuk'] = {};

	const activeTahunAjaran =
		tahunAjaranList.find((item) => item.isAktif) ?? tahunAjaranList.at(0) ?? null;

	if (activeTahunAjaran) {
		activeTahunAjaranId = activeTahunAjaran.id;
		const activeSemester =
			activeTahunAjaran.semester.find((item) => item.isAktif) ??
			activeTahunAjaran.semester.at(0) ??
			null;
		activeSemesterId = activeSemester?.id ?? null;
		activeSemesterTipe = activeSemester?.tipe ?? null;

		const ganjil = activeTahunAjaran.semester.find((item) => item.tipe === 'ganjil');
		const genap = activeTahunAjaran.semester.find((item) => item.tipe === 'genap');
		tanggalBagiRaport = {
			ganjilId: ganjil?.id,
			ganjil: ganjil?.tanggalBagiRaport ?? null,
			genapId: genap?.id,
			genap: genap?.tanggalBagiRaport ?? null
		};
		tanggalMasuk = {
			ganjilId: ganjil?.id,
			ganjil: ganjil?.tanggalMasuk ?? null,
			genapId: genap?.id,
			genap: genap?.tanggalMasuk ?? null
		};
	}

	const result: AcademicContext = {
		tahunAjaranList,
		activeTahunAjaranId,
		activeSemesterId,
		activeSemesterTipe,
		tanggalBagiRaport,
		tanggalMasuk
	};

	academicCache.set(sekolahId, { data: result, expiresAt: now + CACHE_TTL_MS });
	return result;
}
