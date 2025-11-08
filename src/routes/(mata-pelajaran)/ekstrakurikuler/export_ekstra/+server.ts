import db from '$lib/server/db';
import {
	tableEkstrakurikuler,
	tableEkstrakurikulerTujuan,
	tableKelas
} from '$lib/server/db/schema';
import { writeAoaToBuffer } from '$lib/utils/excel.js';
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

	const ekstraRows = await db.query.tableEkstrakurikuler.findMany({
		where: eq(tableEkstrakurikuler.kelasId, kelasId),
		orderBy: [asc(tableEkstrakurikuler.nama)]
	});

	const tujuanRows = await db.query.tableEkstrakurikulerTujuan.findMany({
		where: inArray(
			tableEkstrakurikulerTujuan.ekstrakurikulerId,
			ekstraRows.map((e) => e.id)
		),
		orderBy: [asc(tableEkstrakurikulerTujuan.ekstrakurikulerId), asc(tableEkstrakurikulerTujuan.id)]
	});

	const header = ['Ekstrakurikuler', 'Tujuan'];

	const ekstraOrder = ekstraRows.map((e) => ({ id: e.id, nama: e.nama }));
	const tujuanByEkstra = new Map<number, Array<{ deskripsi: string }>>();
	for (const tujuan of tujuanRows) {
		const list = tujuanByEkstra.get(tujuan.ekstrakurikulerId) ?? [];
		list.push({ deskripsi: tujuan.deskripsi ?? '' });
		tujuanByEkstra.set(tujuan.ekstrakurikulerId, list);
	}

	const rows: Array<Array<string>> = [header];
	for (const e of ekstraOrder) {
		const entries = tujuanByEkstra.get(e.id) ?? [];
		if (entries.length === 0) {
			rows.push([e.nama, '']);
			continue;
		}
		let first = true;
		for (const entry of entries) {
			if (first) {
				rows.push([e.nama, entry.deskripsi || '']);
				first = false;
				continue;
			}
			rows.push(['', entry.deskripsi || '']);
		}
	}

	const buffer = await writeAoaToBuffer(rows);

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
	const filename = `ekstrakurikuler-${safeLabel}.xlsx`;

	return new Response(Buffer.from(buffer), {
		status: 200,
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
}
