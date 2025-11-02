import db from '$lib/server/db';
import { ensureAsesmenEkstrakurikulerSchema } from '$lib/server/db/ensure-asesmen-ekstrakurikuler';
import {
	tableAsesmenEkstrakurikuler,
	tableEkstrakurikuler,
	tableMurid
} from '$lib/server/db/schema';
import { error } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';

function formatScore(value: number | null | undefined) {
	if (value == null || Number.isNaN(value)) return null;
	return Number.parseFloat(value.toFixed(2));
}

export async function load({ parent, url, locals, depends }) {
	depends('app:nilai-akhir-ekstrakurikuler');
	const meta: PageMeta = { title: 'Nilai Ekstrakurikuler' };
	const { kelasAktif } = await parent();

	const sekolahId = locals.sekolah?.id ?? null;
	if (!sekolahId) throw error(401, 'Sekolah aktif tidak ditemukan');
	if (!kelasAktif?.id) throw error(400, 'Pilih kelas aktif terlebih dahulu');

	const muridIdParam = url.searchParams.get('murid_id');
	if (!muridIdParam) {
		return { meta, status: 'empty', murid: null, daftarEkstrakurikuler: [] };
	}

	const muridId = Number(muridIdParam);
	if (!Number.isInteger(muridId) || muridId <= 0) {
		return { meta, status: 'not-found', murid: null, daftarEkstrakurikuler: [] };
	}

	const murid = await db.query.tableMurid.findFirst({
		columns: { id: true, nama: true },
		where: and(
			eq(tableMurid.id, muridId),
			eq(tableMurid.sekolahId, sekolahId),
			eq(tableMurid.kelasId, kelasAktif.id)
		)
	});

	if (!murid) return { meta, status: 'not-found', murid: null, daftarEkstrakurikuler: [] };

	const ekstrakRows = await db.query.tableEkstrakurikuler.findMany({
		where: eq(tableEkstrakurikuler.kelasId, kelasAktif.id),
		orderBy: asc(tableEkstrakurikuler.createdAt),
		with: { tujuan: { columns: { id: true } } }
	});

	const ekstrIds = ekstrakRows.map((e) => e.id);

	let asesmenRecords: Array<{ ekstrakurikulerId: number; tujuanId: number; kategori: string }> = [];
	if (ekstrIds.length) {
		await ensureAsesmenEkstrakurikulerSchema();
		asesmenRecords = await db.query.tableAsesmenEkstrakurikuler.findMany({
			columns: { ekstrakurikulerId: true, tujuanId: true, kategori: true },
			where: and(
				eq(tableAsesmenEkstrakurikuler.muridId, murid.id),
				inArray(tableAsesmenEkstrakurikuler.ekstrakurikulerId, ekstrIds)
			)
		});
	}

	// build map: ekstrakurikulerId -> tujuanId -> kategori
	const asesmenMap = new Map<number, Map<number, string>>();
	for (const r of asesmenRecords) {
		let m = asesmenMap.get(r.ekstrakurikulerId);
		if (!m) {
			m = new Map();
			asesmenMap.set(r.ekstrakurikulerId, m);
		}
		m.set(r.tujuanId, r.kategori);
	}

	const kategoriToNumber: Record<string, number> = {
		'perlu-bimbingan': 1,
		cukup: 2,
		baik: 3,
		'sangat-baik': 4
	};

	const daftarEkstrakurikuler = ekstrakRows.map((e, idx) => {
		const tujuanIds = (e.tujuan ?? []).map((t: { id: number }) => t.id);
		const m = asesmenMap.get(e.id) ?? new Map<number, string>();

		const values: number[] = [];
		for (const tId of tujuanIds) {
			const kategori = m.get(tId);
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
			else kriteria = 'Perlu bimbingan';
		}

		return {
			no: idx + 1,
			id: e.id,
			nama: e.nama,
			tujuanCount: (e.tujuan ?? []).length,
			nilaiAkhir,
			kriteria,
			sudahDinilai
		};
	});

	return { meta, status: 'ready', murid, daftarEkstrakurikuler };
}
