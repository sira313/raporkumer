import { json } from '@sveltejs/kit';
import { authority } from '../../pengguna/utils.server';
import { getBiodataPreviewPayload } from '../biodata/preview-data';
import type { RequestHandler } from './$types';

export const GET = (async ({ locals, url }) => {
	authority('cetak_biodata');

	const payload = await getBiodataPreviewPayload({ locals, url });
	return json(payload);
}) satisfies RequestHandler;
