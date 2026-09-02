import db from '$lib/server/db';
import { ensureAsesmenSumatifSchema } from '$lib/server/db/ensure-asesmen-sumatif';
import { tableAsesmenSumatif, tableMataPelajaran, tableMurid } from '$lib/server/db/schema';
import { relevanMapelUntukMurid } from '$lib/server/mapel-picker';
import { error } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';

function formatScore(value: number | null | undefined) {
	if (value == null || Number.isNaN(value)) return null;
	return Number.parseFloat(value.toFixed(2));
}

type RingkasanNilai = {
	rataRata: number | null;
	mapelDinilai: number;
	totalMapel: number;
};

type NilaiDetail = {
	no: number;
	mataPelajaranId: number;
	mataPelajaran: string;
	nilaiAkhir: number;
	sudahDinilai: boolean;
};

type DetailStatus = 'empty' | 'not-found' | 'ready';

const defaultRingkasan: RingkasanNilai = {
	rataRata: null,
	mapelDinilai: 0,
	totalMapel: 0
};

export async function load({ parent, url, locals, depends }) {
	depends('app:nilai-akhir-detail');
	const meta: PageMeta = { title: 'Rekapitulasi Nilai Akhir Murid' };
	const { kelasAktif } = await parent();
	const sekolahId = locals.sekolah?.id ?? null;

	if (!sekolahId) {
		throw error(401, 'Sekolah aktif tidak ditemukan');
	}

	if (!kelasAktif?.id) {
		throw error(400, 'Pilih kelas aktif terlebih dahulu');
	}

	const muridIdParam = url.searchParams.get('murid_id');
	if (!muridIdParam) {
		return {
			meta,
			status: 'empty' satisfies DetailStatus,
			murid: null,
			daftarNilai: [] as NilaiDetail[],
			ringkasan: defaultRingkasan
		};
	}

	const muridId = Number(muridIdParam);
	if (!Number.isInteger(muridId) || muridId <= 0) {
		return {
			meta,
			status: 'not-found' satisfies DetailStatus,
			murid: null,
			daftarNilai: [] as NilaiDetail[],
			ringkasan: defaultRingkasan
		};
	}

	const murid = await db.query.tableMurid.findFirst({
		columns: { id: true, nama: true, agama: true },
		where: and(
			eq(tableMurid.id, muridId),
			eq(tableMurid.sekolahId, sekolahId),
			eq(tableMurid.kelasId, kelasAktif.id)
		)
	});

	if (!murid) {
		return {
			meta,
			status: 'not-found' satisfies DetailStatus,
			murid: null,
			daftarNilai: [] as NilaiDetail[],
			ringkasan: defaultRingkasan
		};
	}

	const rawMapelRecords = await db.query.tableMataPelajaran.findMany({
		columns: { id: true, nama: true, urutan: true },
		where: eq(tableMataPelajaran.kelasId, kelasAktif.id)
	});

	// Guru mapel can see all subjects on this page (read-only view)

	const mapelRecords = relevanMapelUntukMurid(rawMapelRecords, murid.agama);

	const mapelIds = mapelRecords.map((mapel) => mapel.id);

	await ensureAsesmenSumatifSchema();

	const sumatifRecords = mapelIds.length
		? await db.query.tableAsesmenSumatif.findMany({
				columns: {
					mataPelajaranId: true,
					nilaiAkhir: true
				},
				where: and(
					eq(tableAsesmenSumatif.muridId, murid.id),
					inArray(tableAsesmenSumatif.mataPelajaranId, mapelIds)
				)
			})
		: [];

	const nilaiByMapel = new Map<number, { nilaiAkhir: number | null }>();
	for (const record of sumatifRecords) {
		nilaiByMapel.set(record.mataPelajaranId, { nilaiAkhir: record.nilaiAkhir });
	}

	const daftarNilai: NilaiDetail[] = mapelRecords.map((mapel, index) => {
		const nilai = nilaiByMapel.get(mapel.id)?.nilaiAkhir ?? null;
		const sudahDinilai = nilai != null;
		const skor = sudahDinilai ? nilai : 0;
		return {
			no: index + 1,
			mataPelajaranId: mapel.id,
			mataPelajaran: mapel.nama,
			nilaiAkhir: formatScore(skor) ?? 0,
			sudahDinilai
		};
	});

	const totalMapel = daftarNilai.length;
	const mapelDinilai = daftarNilai.filter((item) => item.sudahDinilai).length;
	const totalNilai = daftarNilai.reduce((sum, item) => sum + item.nilaiAkhir, 0);
	const rataRata = totalMapel ? formatScore(totalNilai / totalMapel) : null;

	const ringkasan: RingkasanNilai = {
		rataRata,
		mapelDinilai,
		totalMapel
	};

	return { meta, status: 'ready' satisfies DetailStatus, murid, daftarNilai, ringkasan };
}
