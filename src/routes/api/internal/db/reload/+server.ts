import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { reloadDbClient } from '$lib/server/db';

export async function POST({ request, locals }) {
	// Admin-only: reloading the DB client is an operational action that should
	// not be reachable by any authenticated user, even when the secret is unset.
	if (locals.user?.type !== 'admin' && locals.user?.type !== 'kepala_sekolah') {
		throw error(403, 'Forbidden');
	}

	// If an internal secret is configured, require it. Otherwise allow local requests.
	const secret = env.INTERNAL_RELOAD_SECRET;
	const header = request.headers.get('x-internal-reload');
	if (secret && header !== secret) {
		throw error(403, 'Forbidden');
	}

	try {
		await reloadDbClient();
		return json({ success: true, message: 'DB client reloaded' });
	} catch (e) {
		console.error('[internal/db/reload] reload failed', e);
		throw error(500, 'Reload failed');
	}
}
