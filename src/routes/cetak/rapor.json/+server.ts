import { json } from '@sveltejs/kit';
import { getRaporPreviewPayload } from '../rapor/preview-data';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, url }) => {
	const payload = await getRaporPreviewPayload({ locals, url });
	return json(payload);
}) satisfies RequestHandler;
