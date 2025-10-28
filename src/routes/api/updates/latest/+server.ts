import { json } from '@sveltejs/kit';
import { compareVersions, fetchLatestRelease, getAppVersion } from '$lib/server/update-manager';
import { isAuthorizedUser } from '../../../pengguna/permissions';

// require permission 'app_check_update' to use update APIs
const REQUIRED_PERMISSION: UserPermission = 'app_check_update';

export const GET = async ({ locals }) => {
	if (!isAuthorizedUser([REQUIRED_PERMISSION], locals.user)) {
		return json({ message: 'Anda tidak memiliki izin untuk memeriksa pembaruan.' }, { status: 403 });
	}

	try {
		const currentVersion = getAppVersion();
		const latest = await fetchLatestRelease();
		const updateAvailable = compareVersions(latest.version, currentVersion) > 0;

		const payload: UpdateCheckResponse = {
			currentVersion,
			updateAvailable,
			latest
		};

		return json(payload, { status: 200 });
	} catch (error) {
		console.error('[updates] gagal memeriksa rilis terbaru', error);
		return json(
			{
				currentVersion: getAppVersion(),
				updateAvailable: false,
				latest: null,
				error:
					error instanceof Error
						? error.message
						: 'Gagal memeriksa pembaruan GitHub. Coba lagi nanti.'
			} satisfies UpdateCheckResponse & { error: string },
			{ status: 502 }
		);
	}
};
