#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function resolveLocalAppData() {
	// Prefer LOCALAPPDATA; fall back to APPDATA -> replace Roaming with Local
	const local = process.env.LOCALAPPDATA;
	if (local) return local;
	const appdata = process.env.APPDATA;
	if (appdata) return appdata.replace(/\\Roaming/i, '\\Local');
	// last resort, use user profile
	const user = process.env.USERPROFILE || process.env.HOME || 'C:\\Users\\Public';
	return path.join(user, 'AppData', 'Local');
}

function joinDbPath(base) {
	return path.join(base, 'Rapkumer-data', 'database.sqlite3');
}

function run(cmd, args, opts = {}) {
	console.info(`\n> ${[cmd, ...(args || [])].join(' ')}`);
	// On Windows some CLI shims are .cmd files which must be executed via the shell.
	// Detect that case and enable shell execution to avoid EINVAL when spawning .cmd.
	const isWin = process.platform === 'win32';
	const cmdExt = path.extname(cmd || '').toLowerCase();
	const useShell = opts.shell ?? (isWin && cmdExt === '.cmd');
	const res = spawnSync(cmd, args || [], { stdio: 'inherit', shell: useShell, ...opts });
	if (res.error) {
		console.error('Failed to run:', res.error);
		process.exitCode = 1;
		throw res.error;
	}
	if (res.status !== 0) {
		console.error(`Process exited with code ${res.status}`);
		process.exitCode = res.status;
		throw new Error(`Command failed: ${cmd} ${args ? args.join(' ') : ''}`);
	}
}

async function main() {
	// Resolve DB_URL: prefer existing env, otherwise default to %LOCALAPPDATA%/Rapkumer-data
	const envDb = process.env.DB_URL;
	let dbPath;
	if (envDb) {
		console.info('[migrate-installed-db] Using DB_URL from environment:', envDb);
		dbPath = envDb;
	} else {
		const local = resolveLocalAppData();
		const candidate = joinDbPath(local);
		dbPath = `file:${candidate}`;
		console.info('[migrate-installed-db] No DB_URL set; using installed DB path:', dbPath);
	}

	// project root (assume script is in scripts/)
	// Use fileURLToPath to get a correct Windows path (avoid leading slash like /C:/...)
	const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

	// prepare env for child processes
	const childEnv = { ...process.env, DB_URL: dbPath };

	// Locate local drizzle-kit binary if present
	const isWin = process.platform === 'win32';
	const drizzleBin = path.join(
		projectRoot,
		'node_modules',
		'.bin',
		`drizzle-kit${isWin ? '.cmd' : ''}`
	);
	const drizzleCmd = fs.existsSync(drizzleBin) ? drizzleBin : 'drizzle-kit';

	try {
		// mirror package.json db:push sequence
		run(process.execPath, [path.join(projectRoot, 'scripts', 'fix-drizzle-indexes.mjs')], {
			env: childEnv,
			cwd: projectRoot
		});

		// Run drizzle push, but be tolerant of a common sqlite "index ... already exists" error
		// by running fix-drizzle-indexes and retrying once.
		try {
			run(drizzleCmd, ['push'], { env: childEnv, cwd: projectRoot });
		} catch (err) {
			const msg = String(err?.message || err || '');
			if (
				msg.includes('already exists') ||
				msg.includes('UNIQUE constraint failed') ||
				msg.includes('SQLITE_ERROR')
			) {
				console.info(
					'[migrate-installed-db] drizzle push failed with index error; attempting fix-drizzle-indexes and retrying'
				);
				try {
					run(process.execPath, [path.join(projectRoot, 'scripts', 'fix-drizzle-indexes.mjs')], {
						env: childEnv,
						cwd: projectRoot
					});
					run(drizzleCmd, ['push'], { env: childEnv, cwd: projectRoot });
				} catch (err2) {
					console.error(
						'[migrate-installed-db] retry after fix-drizzle-indexes failed:',
						err2?.message || err2
					);
					throw err2;
				}
			} else {
				throw err;
			}
		}
		run(process.execPath, [path.join(projectRoot, 'scripts', 'fix-drizzle-indexes.mjs')], {
			env: childEnv,
			cwd: projectRoot
		});
		run(process.execPath, [path.join(projectRoot, 'scripts', 'seed-default-admin.mjs')], {
			env: childEnv,
			cwd: projectRoot
		});
		run(process.execPath, [path.join(projectRoot, 'scripts', 'grant-admin-permissions.mjs')], {
			env: childEnv,
			cwd: projectRoot
		});
		run(process.execPath, [path.join(projectRoot, 'scripts', 'notify-server-reload.mjs')], {
			env: childEnv,
			cwd: projectRoot
		});

		console.info('\n[migrate-installed-db] All steps completed successfully.');
	} catch (err) {
		console.error('\n[migrate-installed-db] Migration failed:', err?.message || err);
		process.exitCode = process.exitCode || 1;
	}
}

main();
