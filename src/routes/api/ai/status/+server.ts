import { getAiSettings } from '$lib/server/ai';
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

	const settings = await getAiSettings();
	return json({
		configured: Boolean(settings),
		envKeyPresent: Boolean(process.env.GEMINI_API_KEY)
	});
};
