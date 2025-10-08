import db from '$lib/server/db';
import { tableSekolah } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { RequestHandler } from './$types';

let placeholderCache: Uint8Array | null = null;

async function getPlaceholder() {
	if (!placeholderCache) {
		const filePath = path.resolve('static/garudaPancasila.png');
		placeholderCache = await fs.readFile(filePath);
	}
	return placeholderCache;
}

export const GET: RequestHandler = async ({ params }) => {
	const id = Number(params.id);
	const noCacheHeaders = {
		'Cache-Control': 'no-store, max-age=0',
		Pragma: 'no-cache'
	};

	if (!Number.isFinite(id) || id <= 0) {
		const data = await getPlaceholder();
		return new Response(Buffer.from(data), {
			headers: { 'Content-Type': 'image/png', ...noCacheHeaders }
		});
	}

	const sekolah = await db.query.tableSekolah.findFirst({
		columns: { logoDinas: true, logoDinasType: true },
		where: eq(tableSekolah.id, id)
	});

	if (sekolah?.logoDinas?.length) {
		return new Response(Buffer.from(sekolah.logoDinas), {
			headers: {
				'Content-Type': sekolah.logoDinasType || 'image/png',
				...noCacheHeaders
			}
		});
	}

	const data = await getPlaceholder();
	return new Response(Buffer.from(data), {
		headers: { 'Content-Type': 'image/png', ...noCacheHeaders }
	});
};
