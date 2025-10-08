import { json } from '@sveltejs/kit';
import { getBiodataPreviewPayload } from '../biodata/preview-data';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, url }) => {
	const payload = await getBiodataPreviewPayload({ locals, url });
	return json(payload);
}) satisfies RequestHandler;
