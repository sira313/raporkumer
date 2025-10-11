import db from '$lib/server/db/index.js';
import { tableSekolah } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'node:fs/promises';
import path from 'node:path';

let placeholderCache: Uint8Array | null = null;

async function getPlaceholder() {
	if (!placeholderCache) {
		const placeholderPath = path.resolve('static/garudaPancasila.png');
		placeholderCache = await fs.readFile(placeholderPath);
	}
	return placeholderCache;
}

export async function GET({ locals }) {
	const sekolahId = locals.sekolah?.id;
	const noCacheHeaders = {
		'Cache-Control': 'no-store, max-age=0',
		Pragma: 'no-cache'
	};

	if (!sekolahId) {
		const data = await getPlaceholder();
		return new Response(Buffer.from(data), {
			headers: { 'Content-Type': 'image/png', ...noCacheHeaders }
		});
	}

	const sekolah = await db.query.tableSekolah.findFirst({
		columns: { logoDinas: true, logoDinasType: true },
		where: eq(tableSekolah.id, sekolahId)
	});

	if (sekolah?.logoDinas?.length) {
		return new Response(Buffer.from(sekolah.logoDinas), {
			headers: {
				'Content-Type': sekolah.logoDinasType || 'image/png'
			}
		});
	}

	const data = await getPlaceholder();
	return new Response(Buffer.from(data), {
		headers: { 'Content-Type': 'image/png', ...noCacheHeaders }
	});
}
