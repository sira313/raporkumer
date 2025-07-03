import { browser } from '$app/environment';

export function load({ data }) {
	if (browser && data.sekolah?.logo?.length) {
		const url = URL.createObjectURL(new Blob([data.sekolah.logo]));
		const meta: PageMeta = { ...data.meta, logoUrl: url };
		URL.revokeObjectURL(url);
		return { ...data, meta };
	}
	return { ...data };
}
