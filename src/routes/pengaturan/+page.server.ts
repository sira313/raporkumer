import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const meta: PageMeta = {
		title: 'Pengaturan',
		description: 'Pengaturan Aplikasi E-Rapor Kurikulum Merdeka'
	};

	return { meta };
};
