import { getPiagamPreviewPayload } from './preview-data';
import type { PageServerLoad } from './$types';

export const load = (async (event) => {
	event.depends('app:cetak-piagam');
	return getPiagamPreviewPayload({ locals: event.locals, url: event.url });
}) satisfies PageServerLoad;
