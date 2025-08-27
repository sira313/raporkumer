import { findTitleByPath } from '$lib/utils.js';

export async function load({ url, locals }) {
	const meta: PageMeta = {
		title: url.pathname === '/' ? 'Rapor Kurikulum Merdeka' : findTitleByPath(url.pathname),
		description: ''
	};
	return { sekolah: locals.sekolah, meta };
}
