import { createClient } from '@libsql/client';

const DEFAULT_DB_URL = 'file:./data/database.sqlite3';
const dbUrl = process.env.DB_URL || DEFAULT_DB_URL;

async function main() {
	console.info('[fix-drizzle-indexes] Target DB:', dbUrl);
	const client = createClient({ url: dbUrl });
	try {
		// Drop known problematic index if exists
		await client.execute({ sql: `DROP INDEX IF EXISTS auth_user_usernameNormalized_unique` });
		console.info('[fix-drizzle-indexes] Dropped index auth_user_usernameNormalized_unique (if it existed)');
	} catch (err) {
		console.error('[fix-drizzle-indexes] Error while dropping index:', err);
		process.exitCode = 1;
	} finally {
		if (typeof client.close === 'function') await client.close();
	}
}

main().catch((err) => {
	console.error('[fix-drizzle-indexes] Unexpected error:', err);
	process.exitCode = 1;
});
