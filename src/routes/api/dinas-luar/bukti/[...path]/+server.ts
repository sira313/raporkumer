import { ensureDinasLuarSchema } from '$lib/server/db/ensure-dinas-luar';
import { tableSppd } from '$lib/server/db/schema';
import db from '$lib/server/db';
import { readBuktiFile } from '$lib/server/dinas-luar';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		throw error(401, { message: 'Harus login terlebih dahulu' });
	}

	await ensureDinasLuarSchema();

	const rel = params.path ?? '';
	// Stored bukti paths are always <dir>/<sppdId>/<file> (sppd/, <akun>/, or
	// the legacy bukti/ layout), so the middle segment identifies the SPPD.
	const segments = rel.split('/');
	if (segments.length !== 3) throw error(404, { message: 'File tidak ditemukan' });
	const sppdId = Number(segments[1]);
	if (!Number.isInteger(sppdId) || sppdId <= 0) {
		throw error(404, { message: 'File tidak ditemukan' });
	}

	// Only serve bukti that belong to an SPPD in the active sekolah. The stored
	// filenames are predictable (<userId>_<timestamp>_fotoN.ext), so without
	// this check any logged-in account could fetch other schools' bukti.
	const sppd = await db.query.tableSppd.findFirst({
		where: eq(tableSppd.id, sppdId),
		columns: { sekolahId: true }
	});
	if (!sppd) throw error(404, { message: 'File tidak ditemukan' });
	if (locals.sekolah?.id && sppd.sekolahId !== locals.sekolah.id) {
		throw error(403, { message: 'Tidak dapat mengakses bukti sekolah lain' });
	}

	const buf = await readBuktiFile(rel);
	if (!buf) throw error(404, { message: 'File tidak ditemukan' });

	const filename = segments[2];
	const contentType = filename.toLowerCase().endsWith('.pdf')
		? 'application/pdf'
		: filename.toLowerCase().endsWith('.png')
			? 'image/png'
			: filename.toLowerCase().endsWith('.webp')
				? 'image/webp'
				: 'image/jpeg';

	return new Response(new Uint8Array(buf), {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=31536000, immutable',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
