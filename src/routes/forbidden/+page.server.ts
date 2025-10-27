import { getAppVersion } from '$lib/server/app-info';

export async function load() {
	const meta: PageMeta = {
		title: 'Akses Ditolak',
		description: 'Anda tidak memiliki izin yang diperlukan untuk mengakses halaman ini.'
	};
	return { meta, appVersion: getAppVersion() };
}
