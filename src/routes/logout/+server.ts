import { deleteSessionByToken } from '$lib/server/auth';
import { cookieNames } from '$lib/utils';
import { redirect, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get(cookieNames.AUTH_SESSION);
	if (token) {
		await deleteSessionByToken(token);
		cookies.delete(cookieNames.AUTH_SESSION, { path: '/' });
	}

	throw redirect(303, '/login');
};
