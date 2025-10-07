import { getBiodataPreviewPayload } from './preview-data';
import type { PageServerLoad } from './$types';
export const load = (async (event) => {
	event.depends('app:cetak-biodata');
	return getBiodataPreviewPayload({ locals: event.locals, url: event.url });
}) satisfies PageServerLoad;
