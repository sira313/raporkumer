import { json } from '@sveltejs/kit';
import { compareVersions, fetchLatestRelease, getAppVersion } from '$lib/server/update-manager';

export const GET = async () => {
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
