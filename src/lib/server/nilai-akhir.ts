import db from '$lib/server/db';
import { ensureAsesmenSumatifSchema } from '$lib/server/db/ensure-asesmen-sumatif';
import { tableAsesmenSumatif, tableMataPelajaran, tableMurid } from '$lib/server/db/schema';
import { and, asc, eq, inArray } from 'drizzle-orm';

function formatScore(value: number | null | undefined) {
	if (value == null || Number.isNaN(value)) return null;
	return Number.parseFloat(value.toFixed(2));
}

const AGAMA_BASE_SUBJECT = 'Pendidikan Agama dan Budi Pekerti';
const PKS_BASE_SUBJECT = 'Pendalaman Kitab Suci';

const AGAMA_VARIANT_MAP: Record<string, string> = {
	islam: 'Pendidikan Agama Islam dan Budi Pekerti',
	kristen: 'Pendidikan Agama Kristen dan Budi Pekerti',
	protestan: 'Pendidikan Agama Kristen dan Budi Pekerti',
	katolik: 'Pendidikan Agama Katolik dan Budi Pekerti',
	katholik: 'Pendidikan Agama Katolik dan Budi Pekerti',
	hindu: 'Pendidikan Agama Hindu dan Budi Pekerti',
	budha: 'Pendidikan Agama Buddha dan Budi Pekerti',
	buddha: 'Pendidikan Agama Buddha dan Budi Pekerti',
	buddhist: 'Pendidikan Agama Buddha dan Budi Pekerti',
	khonghucu: 'Pendidikan Agama Khonghucu dan Budi Pekerti',
	'khong hu cu': 'Pendidikan Agama Khonghucu dan Budi Pekerti',
	konghucu: 'Pendidikan Agama Khonghucu dan Budi Pekerti'
};

const PKS_VARIANT_MAP: Record<string, string> = {
	islam: 'Pendalaman Kitab Suci Islam',
	kristen: 'Pendalaman Kitab Suci Kristen',
	protestan: 'Pendalaman Kitab Suci Kristen',
	katolik: 'Pendalaman Kitab Suci Katolik',
	katholik: 'Pendalaman Kitab Suci Katolik',
	hindu: 'Pendalaman Kitab Suci Hindu',
	budha: 'Pendalaman Kitab Suci Buddha',
	buddha: 'Pendalaman Kitab Suci Buddha',
	buddhist: 'Pendalaman Kitab Suci Buddha',
	khonghucu: 'Pendalaman Kitab Suci Khonghucu',
	'khong hu cu': 'Pendalaman Kitab Suci Khonghucu',
	konghucu: 'Pendalaman Kitab Suci Khonghucu'
};

function normalizeText(value: string | null | undefined) {
	return value?.trim().toLowerCase() ?? '';
}

function isAgamaSubject(name: string) {
	return normalizeText(name).startsWith('pendidikan agama');
}

function isPksSubject(name: string) {
	return normalizeText(name).startsWith('pendalaman kitab suci');
}

function resolveAgamaVariantName(agama: string | null | undefined) {
	const normalized = normalizeText(agama);
	return AGAMA_VARIANT_MAP[normalized] ?? null;
}

function resolvePksVariantName(agama: string | null | undefined) {
	const normalized = normalizeText(agama);
	return PKS_VARIANT_MAP[normalized] ?? null;
}

type MapelRecord = {
	id: number;
	nama: string;
};

function pickAgamaMapel(records: MapelRecord[], muridAgama: string | null | undefined) {
	const mapelByName = new Map(records.map((record) => [normalizeText(record.nama), record]));
	let baseAgamaMapel: MapelRecord | null = null;
	let basePksMapel: MapelRecord | null = null;
	const agamaVariantMapel: MapelRecord[] = [];
	const pksVariantMapel: MapelRecord[] = [];
	const regularMapel: MapelRecord[] = [];

	for (const record of records) {
		if (isAgamaSubject(record.nama)) {
			if (normalizeText(record.nama) === normalizeText(AGAMA_BASE_SUBJECT)) {
				baseAgamaMapel = record;
			} else {
				agamaVariantMapel.push(record);
			}
		} else if (isPksSubject(record.nama)) {
			if (normalizeText(record.nama) === normalizeText(PKS_BASE_SUBJECT)) {
				basePksMapel = record;
			} else {
				pksVariantMapel.push(record);
			}
		} else {
			regularMapel.push(record);
		}
	}

	let chosenAgamaMapel: MapelRecord | null = null;
	const agamaVariantName = resolveAgamaVariantName(muridAgama);
	if (agamaVariantName) {
		chosenAgamaMapel = mapelByName.get(normalizeText(agamaVariantName)) ?? null;
	}
	if (!chosenAgamaMapel) {
		chosenAgamaMapel = baseAgamaMapel ?? agamaVariantMapel.at(0) ?? null;
	}

	let chosenPksMapel: MapelRecord | null = null;
	const pksVariantName = resolvePksVariantName(muridAgama);
	if (pksVariantName) {
		chosenPksMapel = mapelByName.get(normalizeText(pksVariantName)) ?? null;
	}
	if (!chosenPksMapel) {
		chosenPksMapel = basePksMapel ?? pksVariantMapel.at(0) ?? null;
	}

	const result = [...regularMapel];
	if (chosenAgamaMapel) {
		result.push(chosenAgamaMapel);
	}
	if (chosenPksMapel) {
		result.push(chosenPksMapel);
	}

	result.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
	return result;
}

export type NilaiAkhirStudentRow = {
	id: number;
	nama: string;
	nilaiRataRata: number | null;
	jumlahMapelDinilai: number;
	totalMapelRelevan: number;
	peringkat: number;
};

export type NilaiAkhirRekap = {
	rows: NilaiAkhirStudentRow[];
	summary: {
		totalMurid: number;
		totalMuridDinilai: number;
		totalMapel: number;
	};
};

export async function computeNilaiAkhirRekap({
	sekolahId,
	kelasId
}: {
	sekolahId: number;
	kelasId: number;
}): Promise<NilaiAkhirRekap> {
	const muridRecords = await db.query.tableMurid.findMany({
		columns: { id: true, nama: true, agama: true },
		where: and(eq(tableMurid.sekolahId, sekolahId), eq(tableMurid.kelasId, kelasId)),
		orderBy: asc(tableMurid.nama)
	});

	const rawMapelRecords = await db.query.tableMataPelajaran.findMany({
		columns: { id: true, nama: true },
		where: eq(tableMataPelajaran.kelasId, kelasId)
	});

	await ensureAsesmenSumatifSchema();

	const muridIds = muridRecords.map((murid) => murid.id);
	const mapelIds = rawMapelRecords.map((mapel) => mapel.id);

	const sumatifRecords =
		muridIds.length && mapelIds.length
			? await db.query.tableAsesmenSumatif.findMany({
					columns: {
						muridId: true,
						mataPelajaranId: true,
						nilaiAkhir: true
					},
					where: and(
						inArray(tableAsesmenSumatif.muridId, muridIds),
						inArray(tableAsesmenSumatif.mataPelajaranId, mapelIds)
					)
				})
			: [];

	const sumatifByMurid = new Map<number, Map<number, number | null>>();
	for (const record of sumatifRecords) {
		let map = sumatifByMurid.get(record.muridId);
		if (!map) {
			map = new Map();
			sumatifByMurid.set(record.muridId, map);
		}
		map.set(record.mataPelajaranId, record.nilaiAkhir);
	}

	const rows = muridRecords.map((murid) => {
		const relevantMapel = pickAgamaMapel(rawMapelRecords, murid.agama);
		let total = 0;
		let countDinilai = 0;

		for (const mapel of relevantMapel) {
			const nilai = sumatifByMurid.get(murid.id)?.get(mapel.id) ?? null;
			if (nilai != null) {
				total += nilai;
				countDinilai += 1;
			} else {
				total += 0;
			}
		}

		const rataRata = relevantMapel.length ? formatScore(total / relevantMapel.length) : null;

		return {
			id: murid.id,
			nama: murid.nama,
			nilaiRataRata: rataRata,
			jumlahMapelDinilai: countDinilai,
			totalMapelRelevan: relevantMapel.length
		} satisfies Omit<NilaiAkhirStudentRow, 'peringkat'>;
	});

	rows.sort((a, b) => {
		const aScore = a.nilaiRataRata;
		const bScore = b.nilaiRataRata;
		if (aScore == null && bScore == null) {
			return a.nama.localeCompare(b.nama, 'id');
		}
		if (aScore == null) return 1;
		if (bScore == null) return -1;
		const diff = bScore - aScore;
		if (Math.abs(diff) > 0.0001) return diff;
		return a.nama.localeCompare(b.nama, 'id');
	});

	let lastRankScore: number | null = null;
	let lastRank = 0;

	const rankedRows: NilaiAkhirStudentRow[] = rows.map((row, index) => {
		const score = row.nilaiRataRata;
		let peringkat = index + 1;
		if (score != null) {
			if (lastRankScore != null && Math.abs(lastRankScore - score) <= 0.0001) {
				peringkat = lastRank;
			} else {
				lastRankScore = score;
				lastRank = peringkat;
			}
		} else {
			lastRankScore = null;
			lastRank = peringkat;
		}
		return {
			id: row.id,
			nama: row.nama,
			nilaiRataRata: row.nilaiRataRata,
			jumlahMapelDinilai: row.jumlahMapelDinilai,
			totalMapelRelevan: row.totalMapelRelevan,
			peringkat
		};
	});

	const uniqueMapelCount = new Set(rawMapelRecords.map((mapel) => mapel.nama)).size;
	const summary = {
		totalMurid: rankedRows.length,
		totalMuridDinilai: rankedRows.filter((row) => row.jumlahMapelDinilai > 0).length,
		totalMapel: uniqueMapelCount
	};

	return {
		rows: rankedRows,
		summary
	};
}
