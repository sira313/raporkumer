import type { RequestHandler } from '@sveltejs/kit';
import db from '$lib/server/db';
import { tableMataPelajaran } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
	const kelasIdParam = url.searchParams.get('kelas_id');
	const kelasId = kelasIdParam ? Number(kelasIdParam) : NaN;
	if (!Number.isFinite(kelasId)) {
		return new Response(JSON.stringify({ error: 'kelas_id query parameter is required' }), {
			status: 400
		});
	}

	const user = (locals as unknown as { user?: { type?: string; mataPelajaranId?: number } }).user;
	if (!user || user.type !== 'user' || !user.mataPelajaranId) {
		return new Response(JSON.stringify({ assignedLocalMapelId: null }), { status: 200 });
	}

	try {
		const assigned = await db.query.tableMataPelajaran.findFirst({
			columns: { nama: true },
			where: eq(tableMataPelajaran.id, Number(user.mataPelajaranId))
		});

		if (!assigned || !assigned.nama) {
			return new Response(JSON.stringify({ assignedLocalMapelId: null }), { status: 200 });
		}

		const local = await db.query.tableMataPelajaran.findFirst({
			columns: { id: true },
			where: and(
				eq(tableMataPelajaran.kelasId, kelasId),
				eq(tableMataPelajaran.nama, assigned.nama)
			)
		});

		if (!local) {
			return new Response(JSON.stringify({ assignedLocalMapelId: null }), { status: 200 });
		}

		return new Response(JSON.stringify({ assignedLocalMapelId: local.id }), { status: 200 });
	} catch (err) {
		console.error('[api/assigned-mapel] error', err);
		return new Response(JSON.stringify({ error: 'internal' }), { status: 500 });
	}
};
