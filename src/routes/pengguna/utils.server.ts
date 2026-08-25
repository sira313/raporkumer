import { getRequestEvent } from '$app/server';
import { redirect } from '@sveltejs/kit';
import { isAdminUser, isAuthorizedUser } from './permissions';

function requireLogin() {
	const { locals, route } = getRequestEvent();
	if (!locals.user && typeof route.id == 'string' && route.id != '/login') {
		redirect(303, '/login');
	}
	return locals;
}

export function authority(...someAllowedPermissions: UserPermission[]) {
	const locals = requireLogin();

	if (!isAuthorizedUser(someAllowedPermissions, locals.user)) {
		const allowed = someAllowedPermissions.join(', ');
		const qs = new URLSearchParams({ required: allowed }).toString();
		redirect(303, '/forbidden?' + qs);
	}
}

export function adminOnly() {
	const locals = requireLogin();

	if (!isAdminUser(locals.user)) {
		const qs = new URLSearchParams({ required: 'admin/kepala_sekolah' }).toString();
		redirect(303, '/forbidden?' + qs);
	}
}
