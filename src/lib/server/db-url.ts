import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { resolve } from 'node:path';

const DEFAULT_DB_URL = 'file:./data/database.sqlite3';

/**
 * Resolve the SQLite database file path from DB_URL. Prefers an explicit
 * runtime `process.env.DB_URL` (matching the precedence in `db/index.ts`),
 * then SvelteKit's dynamic env, then the repository-local default.
 */
export function resolveDatabasePath() {
	const dbUrl = process.env.DB_URL || env.DB_URL || DEFAULT_DB_URL;
	if (!dbUrl.startsWith('file:')) {
		throw error(500, 'Database URL tidak didukung');
	}

	return resolve(process.cwd(), dbUrl.replace(/^file:/, ''));
}
