import db from '$lib/server/db';
import { tableMataPelajaran, tableTujuanPembelajaran, tableKelas } from '$lib/server/db/schema';
import { utils, write } from 'xlsx';
import { asc, eq, inArray } from 'drizzle-orm';
import { cookieNames } from '$lib/utils';

export async function GET({ cookies }) {
	const kelasIdCookie = cookies.get(cookieNames.ACTIVE_KELAS_ID) || null;
	const kelasId = kelasIdCookie ? Number(kelasIdCookie) : null;
	if (!kelasId || !Number.isFinite(kelasId)) {
		return new Response(JSON.stringify({ fail: 'Pilih kelas aktif terlebih dahulu.' }), {
			status: 400
		});
	}

	const mapelRows = await db.query.tableMataPelajaran.findMany({
		where: eq(tableMataPelajaran.kelasId, kelasId),
		orderBy: [asc(tableMataPelajaran.jenis), asc(tableMataPelajaran.nama)]
	});

	const tpRows = await db.query.tableTujuanPembelajaran.findMany({
		where: inArray(
			tableTujuanPembelajaran.mataPelajaranId,
			mapelRows.map((m) => m.id)
		),
		orderBy: [asc(tableTujuanPembelajaran.mataPelajaranId), asc(tableTujuanPembelajaran.id)]
	});

	const header = ['Mata Pelajaran', 'Jenis', 'KKM', 'Lingkup Materi', 'Tujuan Pembelajaran'];

	const mapelOrder = mapelRows.map((m) => ({ id: m.id, nama: m.nama, jenis: m.jenis, kkm: m.kkm }));
	const tpByMapel = new Map<number, Array<{ lingkup: string; deskripsi: string }>>();
	for (const tp of tpRows) {
		const list = tpByMapel.get(tp.mataPelajaranId) ?? [];
		list.push({ lingkup: tp.lingkupMateri ?? '', deskripsi: tp.deskripsi ?? '' });
		tpByMapel.set(tp.mataPelajaranId, list);
	}

	const rows: Array<Array<string>> = [header];
	for (const m of mapelOrder) {
		const entries = tpByMapel.get(m.id) ?? [];
		if (entries.length === 0) {
			rows.push([m.nama, m.jenis || '', typeof m.kkm === 'number' ? String(m.kkm) : '', '', '']);
			continue;
		}
		let first = true;
		let lastLingkup = '';
		for (const e of entries) {
			if (first) {
				rows.push([
					m.nama,
					m.jenis || '',
					typeof m.kkm === 'number' ? String(m.kkm) : '',
					e.lingkup || '',
					e.deskripsi || ''
				]);
				first = false;
				lastLingkup = e.lingkup || '';
				continue;
			}
			const mapelCell = '';
			const lingkupCell = e.lingkup && e.lingkup !== lastLingkup ? e.lingkup : '';
			rows.push([mapelCell, '', '', lingkupCell, e.deskripsi || '']);
			lastLingkup = e.lingkup || lastLingkup;
		}
	}

	const workbook = utils.book_new();
	const ws = utils.aoa_to_sheet(rows);
	utils.book_append_sheet(workbook, ws, 'Mapel & Tujuan');

	const buffer = write(workbook, { bookType: 'xlsx', type: 'buffer' });

	// include kelas name in filename if possible
	let kelasLabel = `kelas-${kelasId}`;
	try {
		const kelasRow = await db.query.tableKelas.findFirst({
			columns: { nama: true },
			where: eq(tableKelas.id, kelasId)
		});
		if (kelasRow?.nama) kelasLabel = kelasRow.nama;
	} catch {
		// ignore and fallback to kelasId
	}
	const safeLabel = kelasLabel
		.replace(/[\\/:*?"<>|]+/g, '')
		.replace(/\s+/g, '')
		.trim();
	const filename = `mapel-${safeLabel}.xlsx`;

	return new Response(Buffer.from(buffer), {
		status: 200,
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
}
