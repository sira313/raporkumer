#!/usr/bin/env node
import { env } from 'node:process';

const url = env.RELOAD_URL ?? 'http://localhost:5173/api/internal/db/reload';
const secret = env.INTERNAL_RELOAD_SECRET;

(async () => {
	try {
		const headers = { 'content-type': 'application/json' };
		if (secret) headers['x-internal-reload'] = secret;
		const res = await fetch(url, { method: 'POST', headers, body: '{}' });
		if (!res.ok) {
			console.warn(
				'[notify-server-reload] reload endpoint returned',
				res.status,
				await res.text().catch(() => '')
			);
			process.exitCode = 1;
			return;
		}
		console.info('[notify-server-reload] server reload requested successfully');
	} catch (e) {
		console.warn('[notify-server-reload] failed to contact server reload endpoint (ignored):', e);
		// don't fail the db:push flow if server is not running; it's optional
	}
})();
