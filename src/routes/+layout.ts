import { browser } from '$app/environment';

type SekolahWithLogo = Sekolah & { logo?: Uint8Array; logoType?: string };

export function load({ data }) {
	const sekolah = data.sekolah as SekolahWithLogo | undefined;
	if (browser && sekolah?.logo?.length) {
		const blob = new Blob([sekolah.logo as unknown as BlobPart], {
			type: sekolah.logoType || undefined
		});
		const url = URL.createObjectURL(blob);
		const meta: PageMeta = { ...data.meta, logoUrl: url };
		return { ...data, meta };
	}
	return { ...data };
}
