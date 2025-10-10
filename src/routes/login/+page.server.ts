import { applySessionCookie, authenticateUser, createSession } from '$lib/server/auth';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function resolveRedirectTarget(value: string | null) {
	if (!value) return null;
	if (!value.startsWith('/')) return null;
	if (value.startsWith('//')) return null;
	return value;
}

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		const target = resolveRedirectTarget(url.searchParams.get('redirect')) ?? '/';
		throw redirect(303, target);
	}

	const meta: PageMeta = {
		title: 'Masuk',
		description: 'Masuk ke Rapkumer untuk mengelola data sekolah Anda'
	};

	return { meta };
};

export const actions: Actions = {
	login: async ({ request, cookies, getClientAddress, url }) => {
		const formData = await request.formData();
		const username = String(formData.get('username') ?? '').trim();
		const password = String(formData.get('password') ?? '');

		if (!username || !password) {
			return fail(400, { message: 'Nama pengguna dan kata sandi wajib diisi.' });
		}

		const user = await authenticateUser(username, password);
		if (!user) {
			return fail(401, { message: 'Nama pengguna atau kata sandi tidak valid.' });
		}

		const session = await createSession(user.id, {
			userAgent: request.headers.get('user-agent'),
			ipAddress: getClientAddress()
		});

		applySessionCookie(cookies, session.token, session.expiresAt, url.protocol === 'https:');

		const target = resolveRedirectTarget(url.searchParams.get('redirect')) ?? '/';
		throw redirect(303, target);
	}
};
