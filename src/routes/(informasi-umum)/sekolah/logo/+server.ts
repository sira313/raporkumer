import db from '$lib/server/db/index.js';
import { tableSekolah } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'node:fs/promises';
import path from 'node:path';

const LOGO_CACHE_TTL = 60_000; // 60 seconds
let placeholderCache: Uint8Array | null = null;
const logoCache = new Map<number, { data: Uint8Array; type: string; expires: number }>();

async function getPlaceholder() {
	if (!placeholderCache) {
		const placeholderPath = path.resolve('static/tutwuri.png');
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

	const cached = logoCache.get(sekolahId);
	if (cached && cached.expires > Date.now()) {
		return new Response(Buffer.from(cached.data), {
			headers: {
				'Content-Type': cached.type,
				'Cache-Control': 'private, max-age=60'
			}
		});
	}

	const sekolah = await db.query.tableSekolah.findFirst({
		columns: { logo: true, logoType: true },
		where: eq(tableSekolah.id, sekolahId)
	});

	if (sekolah?.logo?.length) {
		const type = sekolah.logoType || 'image/png';
		logoCache.set(sekolahId, {
			data: sekolah.logo,
			type,
			expires: Date.now() + LOGO_CACHE_TTL
		});
		return new Response(Buffer.from(sekolah.logo), {
			headers: {
				'Content-Type': type,
				'Cache-Control': 'private, max-age=60'
			}
		});
	}

	const data = await getPlaceholder();
	return new Response(Buffer.from(data), {
		headers: { 'Content-Type': 'image/png', ...noCacheHeaders }
	});
}
