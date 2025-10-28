import { createClient } from '@libsql/client';
// no-path helper required; left here in case local file-path logic is added later

const DEFAULT_DB_URL = 'file:./data/database.sqlite3';
const dbUrl = process.env.DB_URL || DEFAULT_DB_URL;

async function main() {
	console.info('[fix-drizzle-indexes] Target DB:', dbUrl);
	const client = createClient({ url: dbUrl });
	try {
		// List indexes on auth_user
		const res = await client.execute({ sql: `PRAGMA index_list('auth_user')` });
		const rows = res.rows || [];
		const indexNames = rows.map((r) => r.name || r[1]);
		console.info('[fix-drizzle-indexes] Found indexes on auth_user:', indexNames);

		// Drop any known-bad index names introduced by older imports/builds
		const badNames = [
			'auth_user_usernameNormalized_unique',
			'auth_user_usernameNormalized_unique_idx'
		];
		for (const bad of badNames) {
			if (indexNames.includes(bad)) {
				try {
					await client.execute({ sql: `DROP INDEX IF EXISTS "${bad}"` });
					console.info(`[fix-drizzle-indexes] Dropped bad index: ${bad}`);
				} catch (err) {
					console.error(`[fix-drizzle-indexes] Failed to drop index ${bad}:`, err);
				}
			}
		}

		// Ensure the canonical unique index exists
		const canonical = 'auth_user_username_normalized_unique';
		if (!indexNames.includes(canonical)) {
			try {
				await client.execute({
					sql: `CREATE UNIQUE INDEX IF NOT EXISTS "${canonical}" ON "auth_user" ("username_normalized")`
				});
				console.info(`[fix-drizzle-indexes] Created canonical index: ${canonical}`);
			} catch (err) {
				console.error('[fix-drizzle-indexes] Failed to create canonical index:', err);
			}
		} else {
			console.info(`[fix-drizzle-indexes] Canonical index already present: ${canonical}`);
		}
	} catch (err) {
		console.error('[fix-drizzle-indexes] Error while checking/fixing indexes:', err);
		process.exitCode = 1;
	} finally {
		if (typeof client.close === 'function') await client.close();
	}
}

main().catch((err) => {
	console.error('[fix-drizzle-indexes] Unexpected error:', err);
	process.exitCode = 1;
});
