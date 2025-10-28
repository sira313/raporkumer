import { json } from '@sveltejs/kit';
import { fetchLatestRelease, normalizeVersion, startDownload } from '$lib/server/update-manager';
import { isAuthorizedUser } from '../../../pengguna/permissions';

// require permission 'app_check_update' to use update APIs
const REQUIRED_PERMISSION: UserPermission = 'app_check_update';

export const POST = async ({ request, locals }) => {
	if (!isAuthorizedUser([REQUIRED_PERMISSION], locals.user)) {
		return json({ message: 'Anda tidak memiliki izin untuk memulai unduhan pembaruan.' }, { status: 403 });
	}

	let payload: { version?: string; assetId?: number };
	try {
		payload = await request.json();
	} catch (error) {
		console.warn('[updates] payload unduhan tidak valid', error);
		return json({ message: 'Format permintaan tidak dikenali.' }, { status: 400 });
	}

	const assetId = payload.assetId;
	const version = payload.version;

	if (typeof assetId !== 'number' || !Number.isFinite(assetId)) {
		return json({ message: 'ID aset wajib diisi.' }, { status: 400 });
	}
	if (!version || typeof version !== 'string') {
		return json({ message: 'Versi rilis wajib diisi.' }, { status: 400 });
	}

	try {
		const release = await fetchLatestRelease();
		if (normalizeVersion(release.version) !== normalizeVersion(version)) {
			return json(
				{ message: 'Versi rilis sudah tidak sesuai. Muat ulang pemeriksaan.' },
				{ status: 409 }
			);
		}

		const asset = release.assets.find((entry) => entry.id === assetId);
		if (!asset) {
			return json({ message: 'Berkas rilis tidak ditemukan.' }, { status: 404 });
		}

		const status = startDownload({
			version: release.version,
			assetId: asset.id,
			assetName: asset.name,
			assetUrl: asset.downloadUrl,
			size: asset.size
		});

		return json(status satisfies UpdateDownloadStatus, { status: 202 });
	} catch (error) {
		console.error('[updates] gagal memulai unduhan', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Gagal memulai unduhan pembaruan.' },
			{ status: 502 }
		);
	}
};
