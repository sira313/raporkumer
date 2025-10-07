import { json } from '@sveltejs/kit';
import { getPiagamPreviewPayload } from '../piagam/preview-data';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, url }) => {
	const payload = await getPiagamPreviewPayload({ locals, url });
	return json(payload);
}) satisfies RequestHandler;
