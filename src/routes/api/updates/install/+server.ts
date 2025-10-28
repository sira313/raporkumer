import { json } from '@sveltejs/kit';
import { scheduleInstall } from '$lib/server/update-manager';
import { isAuthorizedUser } from '../../../pengguna/permissions';

// require permission 'app_check_update' to schedule install
const REQUIRED_PERMISSION: UserPermission = 'app_check_update';

export const POST = async ({ request, locals }) => {
	if (!isAuthorizedUser([REQUIRED_PERMISSION], locals.user)) {
		return json({ message: 'Anda tidak memiliki izin untuk memasang pembaruan.' }, { status: 403 });
	}
	let payload: { downloadId?: string };
	try {
		payload = await request.json();
	} catch (error) {
		console.warn('[updates] payload pemasangan tidak valid', error);
		return json({ message: 'Format permintaan tidak dikenali.' }, { status: 400 });
	}

	const downloadId = payload.downloadId;
	if (!downloadId || typeof downloadId !== 'string') {
		return json({ message: 'ID unduhan wajib diisi.' }, { status: 400 });
	}

	try {
		const result = await scheduleInstall(downloadId);
		return json(result, { status: 202 });
	} catch (error) {
		console.error('[updates] gagal menjadwalkan pemasangan', error);
		return json(
			{ message: error instanceof Error ? error.message : 'Gagal menjalankan installer.' },
			{ status: 500 }
		);
	}
};
