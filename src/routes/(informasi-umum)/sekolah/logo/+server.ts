import db from '$lib/server/db/index.js';
import { tableSekolah } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function GET({ locals }) {
	const sekolah = await db.query.tableSekolah.findFirst({
		columns: { logo: true, logoType: true },
		where: eq(tableSekolah.id, locals.sekolah!.id)
	});

	if (!sekolah?.logo?.length) {
		const placeholderPath = path.resolve(`static/tutwuri.png`);
		const placeholderBuffer = await fs.readFile(placeholderPath);
		return new Response(placeholderBuffer, {
			headers: { 'Content-Type': 'image/png' }
		});
	}

	return new Response(sekolah.logo, {
		headers: {
			'Content-Type': sekolah.logoType || '',
			'Content-Length': sekolah.logo.length.toString()
		}
	});
}
