import { applySessionCookie, createSession, deleteSessionsForUser, updateUserPassword, verifyUserPassword } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const meta: PageMeta = {
		title: 'Pengaturan',
		description: 'Pengaturan Aplikasi E-Rapor Kurikulum Merdeka'
	};

	return { meta };
};

export const actions: Actions = {
	'change-password': async ({ request, locals, cookies, getClientAddress, url }) => {
		if (!locals.user) {
			throw redirect(303, '/login');
		}

		const formData = await request.formData();
		const currentPassword = String(formData.get('currentPassword') ?? '');
		const newPassword = String(formData.get('newPassword') ?? '');
		const confirmPassword = String(formData.get('confirmPassword') ?? '');

		if (!currentPassword || !newPassword || !confirmPassword) {
			return fail(400, { message: 'Semua kolom kata sandi wajib diisi.' });
		}

		if (newPassword.length < 8) {
			return fail(400, { message: 'Kata sandi baru minimal 8 karakter.' });
		}

		if (newPassword !== confirmPassword) {
			return fail(400, { message: 'Konfirmasi kata sandi tidak cocok.' });
		}

		const valid = await verifyUserPassword(locals.user.id, currentPassword);
		if (!valid) {
			return fail(400, { message: 'Kata sandi lama tidak sesuai.' });
		}

		await updateUserPassword(locals.user.id, newPassword);
		await deleteSessionsForUser(locals.user.id);
		const session = await createSession(locals.user.id, {
			userAgent: request.headers.get('user-agent'),
			ipAddress: getClientAddress()
		});

		applySessionCookie(cookies, session.token, session.expiresAt, url.protocol === 'https:');

		return { message: 'Kata sandi berhasil diperbarui.' };
	}
};
