import fs from 'node:fs';
import path from 'node:path';

// Lightweight .env loader that does not override existing environment variables.
// This runs at module evaluation time when imported early (e.g. from hooks.server.ts)
// so modules loaded afterwards see the values.
function loadDotEnv() {
	try {
		const envPath = path.resolve(process.cwd(), '.env');
		if (!fs.existsSync(envPath)) return;
		const raw = fs.readFileSync(envPath, 'utf8');
		for (const line of raw.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const m = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
			if (!m) continue;
			const key = m[1];
			let val = m[2] ?? '';
			// Remove surrounding quotes if present
			if (
				(val.startsWith('"') && val.endsWith('"')) ||
				(val.startsWith("'") && val.endsWith("'"))
			) {
				val = val.slice(1, -1);
			}
			// Do not override existing environment variables
			if (process.env[key] === undefined) process.env[key] = val;
		}
	} catch (e) {
		// Non-fatal
		console.warn('[load-env] failed to read .env file', e);
	}
}

loadDotEnv();

export {};
