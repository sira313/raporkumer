import type { RequestHandler } from '@sveltejs/kit';
import db from '$lib/server/db';
import { tableMataPelajaran } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const kelasIdParam = url.searchParams.get('kelas_id');
	const name = url.searchParams.get('name') ?? '';
	const kelasId = kelasIdParam ? Number(kelasIdParam) : NaN;
	if (!Number.isFinite(kelasId) || !name) {
		return new Response(JSON.stringify({ mapelId: null }), { status: 200 });
	}

	try {
		const normalized = name.trim();
		const found = await db.query.tableMataPelajaran.findFirst({
			columns: { id: true },
			where: and(eq(tableMataPelajaran.kelasId, kelasId), eq(tableMataPelajaran.nama, normalized))
		});
		if (!found) return new Response(JSON.stringify({ mapelId: null }), { status: 200 });
		return new Response(JSON.stringify({ mapelId: found.id }), { status: 200 });
	} catch (err) {
		console.error('[api/mapel/resolve-by-name] error', err);
		return new Response(JSON.stringify({ error: 'internal' }), { status: 500 });
	}
};
