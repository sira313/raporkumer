import { getAiSettings, getStoredUserAiSettings, ADMIN_TYPES } from '$lib/server/ai';
import { json } from '@sveltejs/kit';

const ALLOWED_USER_TYPES = ['admin', 'kepala_sekolah', 'user', 'wali_kelas', 'wali_asuh'];

export const GET = async ({ locals }) => {
	const user = locals.user;
	if (!user) {
		return json({ message: 'Sesi berakhir. Silakan login kembali.' }, { status: 401 });
	}
	if (!ALLOWED_USER_TYPES.includes(user.type)) {
		return json({ message: 'Anda tidak berhak menggunakan fitur ini.' }, { status: 403 });
	}

	const settings = await getAiSettings(user);
	const personal = await getStoredUserAiSettings(user.id);
	return json({
		configured: Boolean(settings),
		personalKeySet: Boolean(personal),
		envKeyPresent: Boolean(process.env.GEMINI_API_KEY),
		isAdmin: ADMIN_TYPES.includes(user.type)
	});
};
