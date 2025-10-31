import fs from 'node:fs';
import { createClient } from '@libsql/client';

const file = process.argv[2];
if (!file) {
	console.error('Usage: node scripts/apply-sql-file.mjs <path-to-sql-file>');
	process.exit(2);
}
const sql = fs.readFileSync(file, 'utf8');

// libsql client uses a URL like file:./data/database.sqlite3
const dbUrl = process.env.DB_URL || 'file:./data/database.sqlite3';
const authToken = process.env.DB_AUTH_TOKEN;
const client = createClient({ url: dbUrl, authToken });

async function run() {
	try {
		console.info('[apply-sql-file] executing SQL file:', file);
		// Split statements by semicolon; this is a simple approach, sufficient for our migration.
		const statements = sql
			.split(/;\s*\n/)
			.map((s) => s.trim())
			.filter(Boolean);
		for (const stmt of statements) {
			console.info('[apply-sql-file] running statement...');
			await client.execute(stmt + ';');
		}
		console.info('[apply-sql-file] done');
		process.exit(0);
	} catch (err) {
		console.error('[apply-sql-file] failed:', err);
		process.exit(1);
	}
}

run();
