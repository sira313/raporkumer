import { ensureDinasLuarSchema } from '$lib/server/db/ensure-dinas-luar';
import { tableDinasLuarPermohonan, tableSppd } from '$lib/server/db/schema';
import db from '$lib/server/db';
import { readUndanganFile } from '$lib/server/dinas-luar';
import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) {
		throw error(401, { message: 'Harus login terlebih dahulu' });
	}

	await ensureDinasLuarSchema();

	const rel = `undangan/${params.path ?? ''}`;

	// Only serve undangan files that belong to a permohonan or SPPD in the
	// active sekolah. The stored filename embeds the uploader's user id, so
	// without this check any logged-in account could fetch other schools'
	// (or other users') letters by guessing the path.
	const permohonan = await db.query.tableDinasLuarPermohonan.findFirst({
		where: eq(tableDinasLuarPermohonan.undanganFile, rel),
		columns: { sekolahId: true }
	});
	const sppd = await db.query.tableSppd.findFirst({
		where: eq(tableSppd.undanganFile, rel),
		columns: { sekolahId: true }
	});

	const sekolahId = permohonan?.sekolahId ?? sppd?.sekolahId;
	if (!sekolahId) throw error(404, { message: 'File tidak ditemukan' });
	if (locals.sekolah?.id && sekolahId !== locals.sekolah.id) {
		throw error(403, { message: 'Tidak dapat mengakses file sekolah lain' });
	}

	const buf = await readUndanganFile(rel);
	if (!buf) throw error(404, { message: 'File tidak ditemukan' });

	return new Response(new Uint8Array(buf), {
		headers: {
			'Content-Type': 'application/pdf',
			'Cache-Control': 'public, max-age=31536000, immutable',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
