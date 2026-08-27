import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolve } from 'node:path';

const DEFAULT_DB_URL = 'file:./data/database.sqlite3';

/**
 * Resolve the SQLite database file path from DB_URL. Prefers an explicit
 * runtime `process.env.DB_URL` (matching the precedence in `db/index.ts`),
 * then SvelteKit's dynamic env, then the repository-local default.
 *
 * Important consistency note: this must resolve to the SAME file the live
 * libsql client connects to (see `db/index.ts` `resolveInstalledDbUrl()`,
 * which uses the identical precedence). libsql creates the file on connect,
 * so when `DB_URL` is set the resolved path always exists and we return it
 * as-is — callers operate on the real database even if it was just created.
 *
 * The Windows fallback only comes into play when `DB_URL` is NOT set at all:
 * in that case the repository-local default resolves to a (usually missing)
 * file, and we fall back to the installer's fixed `%LOCALAPPDATA%\Rapkumer-data`
 * path so backup/reset/import still target a live database.
 */
export function resolveDatabasePath() {
	const dbUrl = process.env.DB_URL || env.DB_URL || DEFAULT_DB_URL;
	if (!dbUrl.startsWith('file:')) {
		throw error(500, 'Database URL tidak didukung');
	}

	// DB_URL is explicitly configured (env or .env): trust it. libsql creates
	// the file on connect, so never substitute a different path here — doing so
	// would back up/delete a file the live client is not using.
	if (process.env.DB_URL || env.DB_URL) {
		return resolve(process.cwd(), dbUrl.replace(/^file:/, ''));
	}

	const resolved = resolve(process.cwd(), dbUrl.replace(/^file:/, ''));
	if (fs.existsSync(resolved)) return resolved;

	// No DB_URL configured anywhere. The default relative path may point to a
	// non-existent file while the Windows launcher keeps a real DB at a fixed
	// location outside the app dir — fall back to it so callers operate on a
	// live database.
	if (process.platform === 'win32') {
		const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
		const winFallback = path.join(localAppData, 'Rapkumer-data', 'database.sqlite3');
		if (fs.existsSync(winFallback)) return winFallback;
	}

	return resolved;
}
