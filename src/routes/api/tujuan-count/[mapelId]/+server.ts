import type { RequestHandler } from './$types';
import db from '$lib/server/db';
import { tableTujuanPembelajaran } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
	const mapelId = Number(params.mapelId ?? NaN);
	if (!Number.isInteger(mapelId) || mapelId <= 0) {
		return new Response(JSON.stringify({ error: 'mapelId invalid' }), { status: 400 });
	}

	try {
		// fetch tujuan rows for the mapel and build ordered groups by lingkupMateri
		const rows = await db.query.tableTujuanPembelajaran.findMany({
			columns: { lingkupMateri: true },
			where: eq(tableTujuanPembelajaran.mataPelajaranId, mapelId)
		});

		const groups: Array<{ name: string; count: number }> = [];
		const indexMap = new Map<string, number>();
		for (const r of rows) {
			const name = (r.lingkupMateri ?? '').toString().trim();
			const key = name || '__default__';
			if (!indexMap.has(key)) {
				indexMap.set(key, groups.length);
				groups.push({ name: name || 'Tanpa Lingkup', count: 0 });
			}
			const idx = indexMap.get(key)!;
			groups[idx].count += 1;
		}

		const filtered = groups.filter((g) => g.name.trim().length > 0);
		return new Response(JSON.stringify({ groups: filtered }), {
			headers: { 'content-type': 'application/json' }
		});
	} catch {
		return new Response(JSON.stringify({ error: 'server error' }), { status: 500 });
	}
};
