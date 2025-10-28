import { json } from '@sveltejs/kit';
import { getDownloadStatus } from '$lib/server/update-manager';
import { isAuthorizedUser } from '../../../../pengguna/permissions';

// require permission 'app_check_update' to view download status
const REQUIRED_PERMISSION: UserPermission = 'app_check_update';

export const GET = async ({ params, locals }) => {
	if (!isAuthorizedUser([REQUIRED_PERMISSION], locals.user)) {
		return json({ message: 'Anda tidak memiliki izin untuk melihat status unduhan.' }, { status: 403 });
	}

	const id = params.id;
	if (!id) {
		return json({ message: 'ID unduhan wajib diisi.' }, { status: 400 });
	}

	const status = getDownloadStatus(id);
	if (!status) {
		return json({ message: 'Status unduhan tidak ditemukan.' }, { status: 404 });
	}

	return json(status satisfies UpdateDownloadStatus, { status: 200 });
};
