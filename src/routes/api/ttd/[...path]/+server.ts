import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { readSignatureFile } from '$lib/server/ttd';

export const GET: RequestHandler = async ({ locals, params }) => {
	const rel = params.path ?? '';

	// Guru signatures are staff data; only logged-in users may view them.
	// Tamu signatures are fine to serve publicly (the /tamu page itself is public).
	if (rel.startsWith('guru/') && !locals.user) {
		throw error(401, 'Unauthorized');
	}

	const buf = await readSignatureFile(rel);
	if (!buf) throw error(404, 'Not found');

	return new Response(new Uint8Array(buf), {
		headers: {
			'Content-Type': 'image/png',
			'Cache-Control': 'public, max-age=31536000, immutable',
			'X-Content-Type-Options': 'nosniff'
		}
	});
};
