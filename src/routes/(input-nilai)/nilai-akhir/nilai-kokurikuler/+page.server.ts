import db from '$lib/server/db';
import { ensureAsesmenKokurikulerSchema } from '$lib/server/db/ensure-asesmen-kokurikuler';
import { tableAsesmenKokurikuler, tableKokurikuler, tableMurid } from '$lib/server/db/schema';
import { sanitizeDimensionList } from '$lib/kokurikuler';
import { error } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';

function formatScore(value: number | null | undefined) {
	if (value == null || Number.isNaN(value)) return null;
	return Number.parseFloat(value.toFixed(2));
}

export async function load({ parent, url, locals, depends }) {
	depends('app:nilai-akhir-kokurikuler');
	const meta: PageMeta = { title: 'Nilai Kokurikuler' };
	const { kelasAktif } = await parent();

	const sekolahId = locals.sekolah?.id ?? null;
	if (!sekolahId) throw error(401, 'Sekolah aktif tidak ditemukan');
	if (!kelasAktif?.id) throw error(400, 'Pilih kelas aktif terlebih dahulu');

	const muridIdParam = url.searchParams.get('murid_id');
	if (!muridIdParam) {
		return { meta, status: 'empty', murid: null, daftarKokurikuler: [] };
	}

	const muridId = Number(muridIdParam);
	if (!Number.isInteger(muridId) || muridId <= 0) {
		return { meta, status: 'not-found', murid: null, daftarKokurikuler: [] };
	}

	const murid = await db.query.tableMurid.findFirst({
		columns: { id: true, nama: true },
		where: and(
			eq(tableMurid.id, muridId),
			eq(tableMurid.sekolahId, sekolahId),
			eq(tableMurid.kelasId, kelasAktif.id)
		)
	});

	if (!murid) return { meta, status: 'not-found', murid: null, daftarKokurikuler: [] };

	const kokurikulerRows = await db.query.tableKokurikuler.findMany({
		where: eq(tableKokurikuler.kelasId, kelasAktif.id),
		orderBy: asc(tableKokurikuler.createdAt)
	});

	const kokIds = kokurikulerRows.map((k) => k.id);

	let asesmenRecords: Array<{ kokurikulerId: number; dimensi: string; kategori: string }> = [];
	if (kokIds.length) {
		await ensureAsesmenKokurikulerSchema();
		asesmenRecords = await db.query.tableAsesmenKokurikuler.findMany({
			columns: { kokurikulerId: true, dimensi: true, kategori: true },
			where: and(
				eq(tableAsesmenKokurikuler.muridId, murid.id),
				inArray(tableAsesmenKokurikuler.kokurikulerId, kokIds)
			)
		});
	}

	// build map: kokurikulerId -> dimensi -> kategori
	const asesmenMap = new Map<number, Map<string, string>>();
	for (const r of asesmenRecords) {
		let m = asesmenMap.get(r.kokurikulerId);
		if (!m) {
			m = new Map();
			asesmenMap.set(r.kokurikulerId, m);
		}
		m.set(r.dimensi, r.kategori);
	}

	const kategoriToNumber: Record<string, number> = {
		kurang: 1,
		cukup: 2,
		baik: 3,
		'sangat-baik': 4
	};

	const daftarKokurikuler = kokurikulerRows.map((k, idx) => {
		const dims = sanitizeDimensionList(k.dimensi);
		const m = asesmenMap.get(k.id) ?? new Map();

		const values: number[] = [];
		for (const dim of dims) {
			const kategori = m.get(dim);
			const num = kategori ? (kategoriToNumber[kategori] ?? null) : null;
			if (num != null && Number.isFinite(num)) values.push(num);
		}

		let nilaiAkhir: number | null = null;
		let sudahDinilai = false;
		if (values.length > 0) {
			const sum = values.reduce((a, b) => a + b, 0);
			nilaiAkhir = formatScore(sum / values.length);
			sudahDinilai = true;
		}

		let kriteria: string | null = null;
		if (nilaiAkhir != null) {
			if (nilaiAkhir >= 3.51) kriteria = 'Sangat Baik';
			else if (nilaiAkhir >= 2.51) kriteria = 'Baik';
			else if (nilaiAkhir >= 1.51) kriteria = 'Cukup';
			else kriteria = 'Kurang';
		}

		return {
			no: idx + 1,
			id: k.id,
			kode: k.kode,
			tujuan: k.tujuan,
			dimensiCount: dims.length,
			nilaiAkhir,
			kriteria,
			sudahDinilai
		};
	});

	return { meta, status: 'ready', murid, daftarKokurikuler };
}
