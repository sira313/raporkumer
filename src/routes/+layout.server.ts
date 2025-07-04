import { findTitleByPath } from '$lib/utils.js';

export async function load({ url, locals }) {
	const meta: PageMeta = {
		title: findTitleByPath(url.pathname),
		description: ''
	};
	return { sekolah: locals.sekolah, meta };
}
