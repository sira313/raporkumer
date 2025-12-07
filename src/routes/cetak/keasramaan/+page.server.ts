import { getKeasramaanPreviewPayload } from './preview-data';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	event.depends('app:cetak-keasramaan');
	return getKeasramaanPreviewPayload({ locals: event.locals, url: event.url });
}) satisfies PageServerLoad;
