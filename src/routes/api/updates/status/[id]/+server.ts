import { json } from '@sveltejs/kit';
import { getDownloadStatus } from '$lib/server/update-manager';

export const GET = async ({ params }) => {
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
