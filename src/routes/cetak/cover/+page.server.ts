import { getCoverPreviewPayload } from './preview-data';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	event.depends('app:cetak-cover');
	return getCoverPreviewPayload({ locals: event.locals, url: event.url });
}) satisfies PageServerLoad;
