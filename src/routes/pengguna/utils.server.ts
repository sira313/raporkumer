import { getRequestEvent } from '$app/server';
import { error, redirect } from '@sveltejs/kit';
import { isAuthorizedUser } from './permissions';

/**
 * Validate user permissions. Permissions params are using OR operator.
 */
export function authority(...someAllowedPermissions: UserPermission[]) {
	const { locals, route } = getRequestEvent();

	// if `route.id` is null, it means 404, we don't handle it here.
	if (!locals.user && typeof route.id == 'string' && route.id != '/login') {
		redirect(303, '/login');
	}

	if (!isAuthorizedUser(someAllowedPermissions, locals.user)) {
		const allowed = someAllowedPermissions.join(', ');
		error(403, 'Access denied. \nRequired Permissions: [' + allowed + ']');
	}
}
