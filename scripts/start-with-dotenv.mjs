import fs from 'node:fs';
import path from 'node:path';

function loadDotenvIntoEnv(dir = process.cwd()) {
	try {
		const dot = path.join(dir, '.env');
		if (!fs.existsSync(dot)) return;
		const contents = fs.readFileSync(dot, { encoding: 'utf8' });
		for (const line of contents.split(/\r?\n/)) {
			const trimmed = line.trim();
			if (!trimmed || trimmed.startsWith('#')) continue;
			const idx = trimmed.indexOf('=');
			if (idx === -1) continue;
			const key = trimmed.slice(0, idx).trim();
			let val = trimmed.slice(idx + 1).trim();
			if (
				(val.startsWith('"') && val.endsWith('"')) ||
				(val.startsWith("'") && val.endsWith("'"))
			) {
				val = val.slice(1, -1);
			}
			if (!(key in process.env)) process.env[key] = val;
		}
	} catch {
		// ignore
	}
}

loadDotenvIntoEnv(process.cwd());

// optional: show diagnostic for BODY_SIZE_LIMIT
console.info('[start-with-dotenv] BODY_SIZE_LIMIT=', process.env.BODY_SIZE_LIMIT);

// now start the built server
import('../build/index.js');
