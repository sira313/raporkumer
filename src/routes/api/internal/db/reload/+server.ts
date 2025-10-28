import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { reloadDbClient } from '$lib/server/db';

export async function POST({ request }) {
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
