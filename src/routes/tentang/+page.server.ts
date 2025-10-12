import { getAppVersion } from '$lib/server/app-info';

export async function load() {
	const meta: PageMeta = {
		title: 'Tentang Aplikasi',
		description: 'Informasi tentang aplikasi E-Rapor Kurikulum Merdeka'
	};
	return { meta, appVersion: getAppVersion() };
}
