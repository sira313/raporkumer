import { createClient } from '@libsql/client';

const DEFAULT_DB_URL = 'file:./data/database.sqlite3';
const dbUrl = process.env.DB_URL || DEFAULT_DB_URL;

function extractName(row) {
	return row && (row.name || row[0] || row[1] || null);
}

async function main() {
	console.info('[fix-drizzle-indexes] Target DB:', dbUrl);
	const client = createClient({ url: dbUrl });
	try {
		// Gather index names from PRAGMA and sqlite_master
		const pragma = await client.execute({ sql: `PRAGMA index_list('auth_user')` });
		const pragmaRows = pragma.rows || [];
		const pragmaNames = pragmaRows.map(extractName).filter(Boolean);

		const master = await client.execute({
			sql: `SELECT name FROM sqlite_master WHERE type='index'`
		});
		const masterRows = master.rows || [];
		const masterNames = masterRows.map(extractName).filter(Boolean);

		const allNames = Array.from(new Set([...pragmaNames, ...masterNames]));
		console.info('[fix-drizzle-indexes] Found indexes on auth_user (combined):', allNames);

		// For each index on auth_user, inspect indexed columns and drop those that
		// reference username_normalized (case-insensitive). This is robust against
		// mixed-cased legacy index names.
		for (const name of allNames) {
			if (!name) continue;
			try {
				const safe = String(name).replace(/'/g, "''");
				const info = await client.execute({ sql: `PRAGMA index_info('${safe}')` });
				const cols = (info.rows || []).map((c) => c.name || c[2] || c[1]);
				if (cols.some((c) => String(c).toLowerCase() === 'username_normalized')) {
					try {
						await client.execute({ sql: `DROP INDEX IF EXISTS "${name}"` });
						console.info(
							`[fix-drizzle-indexes] Dropped index that referenced username_normalized: ${name}`
						);
					} catch (err) {
						console.warn(
							`[fix-drizzle-indexes] Failed to drop index ${name}:`,
							err && (err.message || err.toString())
						);
					}
				}
			} catch (_) {
				// ignore index_info failures for non-auth_user indexes and continue
				void _;
			}
		}

		// Ensure canonical index exists
		try {
			await client.execute({
				sql: `CREATE UNIQUE INDEX IF NOT EXISTS "auth_user_username_normalized_unique" ON "auth_user" ("username_normalized")`
			});
			console.info(
				'[fix-drizzle-indexes] Ensured canonical index auth_user_username_normalized_unique exists'
			);
		} catch (err) {
			const msg = err && (err.message || err.toString());
			if (msg && /no such table/i.test(msg)) {
				console.warn(
					'[fix-drizzle-indexes] auth_user table not present; skipping creation of canonical index.'
				);
			} else {
				console.error('[fix-drizzle-indexes] Failed to create canonical index:', err);
			}
		}
	} catch (err) {
		const msg = err && (err.message || err.toString());
		if (msg && /no such table/i.test(msg)) {
			console.warn('[fix-drizzle-indexes] auth_user table not present yet; skipping index fixes.');
		} else {
			console.error('[fix-drizzle-indexes] Error while checking/fixing indexes:', err);
			process.exitCode = 1;
		}
	} finally {
		if (typeof client.close === 'function') await client.close();
	}
}

main().catch((err) => {
	console.error('[fix-drizzle-indexes] Unexpected error:', err);
	process.exitCode = 1;
});
