import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import {
	applyBukuTamuUnlockCookie,
	checkUnlockBlocked,
	clearUnlockFailures,
	getBukuTamuGateState,
	getBukuTamuSettings,
	recordUnlockFailure,
	resolveBukuTamuSekolahId,
	verifyPasskey
} from '$lib/server/buku-tamu-pass';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	const sekolahId = await resolveBukuTamuSekolahId(locals.sekolah?.id);
	return getBukuTamuGateState(cookies, sekolahId);
};

export const actions: Actions = {
	unlock: async ({ request, locals, cookies, getClientAddress }) => {
		const sekolahId = await resolveBukuTamuSekolahId(locals.sekolah?.id);
		if (!sekolahId) {
			return fail(400, { message: 'Belum ada data sekolah.' });
		}

		const settings = await getBukuTamuSettings(sekolahId);
		if (!settings?.passkeyHash || !settings?.passkeySalt) {
			return fail(400, { message: 'Passkey buku tamu tidak aktif.' });
		}

		const ip = getClientAddress();
		const blocked = checkUnlockBlocked(ip);
		if (blocked.blocked) {
			const seconds = Math.max(1, blocked.retryAfterSeconds ?? 0);
			const human = seconds < 60 ? `${seconds} detik` : `${Math.ceil(seconds / 60)} menit`;
			return fail(429, {
				message: `Terlalu banyak percobaan. Coba lagi dalam ${human}.`
			});
		}

		const form = await request.formData();
		const passkey = String(form.get('passkey') ?? '');

		if (!verifyPasskey(passkey, settings.passkeyHash, settings.passkeySalt)) {
			const remaining = recordUnlockFailure(ip);
			const suffix =
				remaining > 0 ? ` Sisa ${remaining}x percobaan sebelum terkunci.` : ' Akun terkunci.';
			return fail(401, { message: `Passkey salah.${suffix}` });
		}

		clearUnlockFailures(ip);
		const secure = locals.requestIsSecure ?? false;
		applyBukuTamuUnlockCookie(cookies, settings.unlockToken ?? '', secure);
		throw redirect(303, '/tamu');
	}
};
