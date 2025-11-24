import type { RequestHandler } from '@sveltejs/kit';
import db from '$lib/server/db';
import { tableAsesmenSumatif, tableAsesmenSumatifTujuan } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url }) => {
	const muridId = Number(url.searchParams.get('murid_id') ?? '');
	if (!Number.isInteger(muridId)) {
		return new Response(JSON.stringify({ error: 'murid_id param required and must be integer' }), {
			status: 400
		});
	}

	const sumatif = await db.query.tableAsesmenSumatif.findMany({
		where: eq(tableAsesmenSumatif.muridId, muridId)
	});
	const tujuan = await db.query.tableAsesmenSumatifTujuan.findMany({
		where: eq(tableAsesmenSumatifTujuan.muridId, muridId)
	});

	return new Response(JSON.stringify({ sumatif, tujuan }, null, 2), { status: 200 });
};

export const prerender = false;
