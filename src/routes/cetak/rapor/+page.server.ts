import { getRaporPreviewPayload } from './preview-data';
import type { PageServerLoad } from './$types';
export const load = (async (event) => {
	event.depends('app:cetak-rapor');
	return getRaporPreviewPayload({ locals: event.locals, url: event.url });
}) satisfies PageServerLoad;
