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
	// project root (assume script is in scripts/)
	// Use fileURLToPath to get a correct Windows path (avoid leading slash like /C:/...)
	const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

	// Resolve DB_URL: prefer explicit env. If not set, prefer a repo-local DB (./data/database.sqlite3)
	// for developer workflows; otherwise fall back to %LOCALAPPDATA%/Rapkumer-data for installed apps.
	const envDb = process.env.DB_URL;
	let dbPath;
	if (envDb) {
		console.info('[migrate-installed-db] Using DB_URL from environment:', envDb);
		dbPath = envDb;
	} else {
		const projectLocal = path.join(projectRoot, 'data', 'database.sqlite3');
		if (fs.existsSync(projectLocal)) {
			dbPath = `file:${projectLocal}`;
			console.info('[migrate-installed-db] No DB_URL set; using project-local DB path:', dbPath);
		} else {
			const local = resolveLocalAppData();
			const candidate = joinDbPath(local);
			dbPath = `file:${candidate}`;
			console.info('[migrate-installed-db] No DB_URL set; using installed DB path:', dbPath);
		}
	}

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

		// Ensure certain columns exist on older installed DBs so migration UPDATEs don't fail.
		// Prefer running the shipped `scripts/ensure-columns.mjs` if present; otherwise
		// fall back to an inline implementation so the installer doesn't require a
		// separate file to be present in the packaged install.
		const ensureScriptPath = path.join(projectRoot, 'scripts', 'ensure-columns.mjs');
		if (fs.existsSync(ensureScriptPath)) {
			run(process.execPath, [ensureScriptPath], { env: childEnv, cwd: projectRoot });
		} else {
			console.info('[migrate-installed-db] ensure-columns.mjs not found in install; running inline checks');
			// Inline ensure-columns logic (best-effort). Use dynamic import so this file
			// still runs in environments where @libsql/client may or may not be present.
			try {
				const { createClient } = await import('@libsql/client');
				const client = createClient({ url: dbPath });
				// Ensure common columns that older installs may lack. Keep conservative (NULLable INTEGER)
				const checks = [
					{ table: 'tasks', column: 'sekolah_id', type: 'INTEGER' },
					{ table: 'kelas', column: 'sekolah_id', type: 'INTEGER' },
					{ table: 'mata_pelajaran', column: 'kelas_id', type: 'INTEGER' },
					{ table: 'auth_user', column: 'sekolah_id', type: 'INTEGER' },
					{ table: 'feature_unlock', column: 'sekolah_id', type: 'INTEGER' },
					{ table: 'tahun_ajaran', column: 'sekolah_id', type: 'INTEGER' }
				];
				for (const c of checks) {
					try {
						const res = await client.execute({ sql: `PRAGMA table_info('${c.table}')` });
						const rows = res.rows || [];
						const names = rows.map((r) => r.name || r[1]);
						if (!names.includes(c.column)) {
							console.info(`[migrate-installed-db] Adding missing column ${c.column} to ${c.table}`);
							try {
								await client.execute({ sql: `ALTER TABLE "${c.table}" ADD COLUMN "${c.column}" ${c.type}` });
								console.info(`[migrate-installed-db] Added ${c.column} on ${c.table}`);
							} catch (err) {
								console.warn(`[migrate-installed-db] Failed to add ${c.column} on ${c.table}:`, err && (err.message || err.toString()));
							}
						} else {
							console.info(`[migrate-installed-db] Column ${c.column} already present on ${c.table}`);
						}
					} catch (err) {
						const msg = err && (err.message || err.toString());
						if (msg && /no such table/i.test(msg)) {
							console.warn(`[migrate-installed-db] Table not present: ${c.table}`);
						} else {
							console.error('[migrate-installed-db] Error checking/adding columns:', err);
						}
					}
				}
				if (typeof client.close === 'function') await client.close();
			} catch (err) {
				console.warn('[migrate-installed-db] Inline ensure-columns failed or @libsql/client missing:', err && (err.message || err.toString()));
				// continue; drizzle push will provide the definitive error if this fails
			}
		}

		// Run drizzle push, but be tolerant of a common sqlite "index ... already exists" error
		// by running fix-drizzle-indexes and retrying once.
		// Aggressive pre-clean: drop any index variants that differ only by case/formatting
		// (some installs historically created `auth_user_usernameNormalized_unique` etc).
		try {
			try {
				const { createClient: createClientLocal } = await import('@libsql/client');
				const cleanupClient = createClientLocal({ url: dbPath });
				try {
					const found = await cleanupClient.execute({ sql: `SELECT name FROM sqlite_master WHERE type='index' AND lower(name) LIKE '%usernamenormalized%'` });
					const rows = found.rows || [];
					for (const r of rows) {
						const name = (r && (r.name || r[0] || r[1]));
						if (name) {
							try {
								await cleanupClient.execute({ sql: `DROP INDEX IF EXISTS "${name}"` });
								console.info(`[migrate-installed-db] Dropped pre-existing index: ${name}`);
							} catch (err) {
								console.warn(`[migrate-installed-db] Failed to drop index ${name}:`, err && (err.message || err.toString()));
							}
						}
					}
				} finally {
					if (typeof cleanupClient.close === 'function') await cleanupClient.close();
				}
			} catch (err) {
				// Non-fatal: log and continue to let the standard fix-drizzle-indexes handle other cases
				console.info('[migrate-installed-db] Pre-drizzle index cleanup skipped or failed:', err && (err.message || err.toString()));
			}
			
			// Now run drizzle push
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
