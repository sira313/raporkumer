import { createClient } from '@libsql/client';

const client = createClient({ url: process.env.DB_URL || 'file:./data/database.sqlite3' });

try {
	console.log('Adding column mata_pelajaran_id to auth_user if not exists...');
	// Check whether column already exists
	const check = await client.execute({ sql: `PRAGMA table_info('auth_user')` });
	const cols = (check.rows || []).map((r) => r.name || r[1]);
	if (cols.includes('mata_pelajaran_id')) {
		console.log('Column already exists, skipping.');
	} else {
		await client.execute({ sql: `ALTER TABLE auth_user ADD COLUMN mata_pelajaran_id INTEGER;` });
		console.log('Column added.');
	}
} catch (err) {
	console.error('Failed to add column:', err);
	process.exitCode = 1;
} finally {
	await client.close();
}
