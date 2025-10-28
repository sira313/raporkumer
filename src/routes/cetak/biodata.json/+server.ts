import { json, redirect } from '@sveltejs/kit';
import { getBiodataPreviewPayload } from '../biodata/preview-data';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, url }) => {
	// Permission 'cetak_biodata' removed — require authenticated user only
	if (!locals.user) throw redirect(303, '/login');

	const payload = await getBiodataPreviewPayload({ locals, url });
	return json(payload);
}) satisfies RequestHandler;
