#!/usr/bin/env node
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const filesToSync = [
	'ensure-columns.mjs',
	'fix-drizzle-indexes.mjs',
	'grant-admin-permissions.mjs',
	'migrate-installed-db.mjs',
	'notify-server-reload.mjs',
	'seed-default-admin.mjs'
];

function repoRoot() {
	return path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
}

async function main() {
	const root = repoRoot();
	const srcDir = path.join(root, 'scripts');
	const destDir = path.join(root, 'installer', 'scripts');

	try {
		await fs.mkdir(destDir, { recursive: true });
	} catch (err) {
		console.error(
			'[sync-to-installer] failed to ensure installer/scripts exists:',
			err && (err.message || err)
		);
		process.exitCode = 2;
		return;
	}

	const results = {
		copied: [],
		missing: [],
		failed: []
	};

	for (const f of filesToSync) {
		const src = path.join(srcDir, f);
		const dest = path.join(destDir, f);
		try {
			if (!existsSync(src)) {
				console.warn('[sync-to-installer] missing source:', src);
				results.missing.push(f);
				continue;
			}
			await fs.copyFile(src, dest);
			// try to copy mode if possible
			try {
				const st = await fs.stat(src);
				await fs.chmod(dest, st.mode);
			} catch {
				// non-fatal
			}
			console.info('[sync-to-installer] copied', f);
			results.copied.push(f);
		} catch (err) {
			console.error('[sync-to-installer] failed to copy', f, err && (err.message || err));
			results.failed.push(f);
		}
	}

	console.info('\n[sync-to-installer] Summary:');
	console.info('  copied:', results.copied.length ? results.copied.join(', ') : '(none)');
	console.info('  missing:', results.missing.length ? results.missing.join(', ') : '(none)');
	console.info('  failed:', results.failed.length ? results.failed.join(', ') : '(none)');

	if (results.failed.length > 0) process.exitCode = 3;
}

if (
	import.meta.url === `file://${process.argv[1]}` ||
	(process.argv[1] && process.argv[1].endsWith('sync-to-installer.mjs'))
) {
	main().catch((err) => {
		console.error('[sync-to-installer] unexpected error:', err && (err.message || err));
		process.exitCode = 1;
	});
}
