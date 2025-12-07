import { json } from '@sveltejs/kit';
import { getKeasramaanPreviewPayload } from '../keasramaan/preview-data';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, url }) => {
	const payload = await getKeasramaanPreviewPayload({ locals, url });
	return json(payload);
}) satisfies RequestHandler;
