import { deleteSessionByToken } from '$lib/server/auth';
import { cookieNames } from '$lib/utils';
import { redirect, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies, locals }) => {
	const token = cookies.get(cookieNames.AUTH_SESSION);
	if (token) {
		await deleteSessionByToken(token);
		const secure = locals.requestIsSecure ?? false;
		cookies.delete(cookieNames.AUTH_SESSION, { path: '/', secure });
	}

	throw redirect(303, '/login');
};
