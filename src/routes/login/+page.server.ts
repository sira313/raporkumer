import { applySessionCookie, authenticateUser, createSession } from '$lib/server/auth';
import { isSecureRequest, resolveRequestProtocol } from '$lib/server/http';
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

const LOGIN_LOG_PREFIX = '[login action]';

function logLoginEvent(message: string, details?: Record<string, unknown>) {
	const payload = details ? `${message} ${JSON.stringify(details)}` : message;
	console.info(`${LOGIN_LOG_PREFIX} ${payload}`);
}

export const actions: Actions = {
	login: async ({ request, cookies, getClientAddress, url }) => {
		const formData = await request.formData();
		const username = String(formData.get('username') ?? '').trim();
		const password = String(formData.get('password') ?? '');

		logLoginEvent('Attempt received', {
			username,
			client: getClientAddress(),
			origin: request.headers.get('origin') ?? undefined,
			referer: request.headers.get('referer') ?? undefined
		});

		if (!username || !password) {
			logLoginEvent('Missing credentials', { username });
			return fail(400, { message: 'Nama pengguna dan kata sandi wajib diisi.' });
		}

		const user = await authenticateUser(username, password);
		if (!user) {
			logLoginEvent('Invalid credentials', { username });
			return fail(401, { message: 'Nama pengguna atau kata sandi tidak valid.' });
		}

		const session = await createSession(user.id, {
			userAgent: request.headers.get('user-agent'),
			ipAddress: getClientAddress()
		});

		logLoginEvent('Authentication success', {
			username,
			userId: user.id,
			expiresAt: session.expiresAt
		});

		const secure = isSecureRequest(request, url);
		const resolvedProtocol = resolveRequestProtocol(request, url);
		logLoginEvent('Setting session cookie', {
			secure,
			protocol: url.protocol,
			resolvedProtocol,
			xForwardedProto: request.headers.get('x-forwarded-proto') ?? undefined,
			forwarded: request.headers.get('forwarded') ?? undefined,
			host: url.host
		});
		applySessionCookie(cookies, session.token, session.expiresAt, secure);

		const target = resolveRedirectTarget(url.searchParams.get('redirect')) ?? '/';
		logLoginEvent('Redirecting after success', { username, target });
		throw redirect(303, target);
	}
};
