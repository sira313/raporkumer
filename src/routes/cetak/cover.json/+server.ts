import { json } from '@sveltejs/kit';
import { getCoverPreviewPayload } from '../cover/preview-data';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, url }) => {
	const payload = await getCoverPreviewPayload({ locals, url });
	return json(payload);
}) satisfies RequestHandler;
