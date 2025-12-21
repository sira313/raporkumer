#!/usr/bin/env node
import { createClient } from '@libsql/client';

const dbPath = process.env.DB_URL || 'file:./data/database.sqlite3';
const client = createClient({ url: dbPath });

console.log('[check-murid-columns] Target DB:', dbPath);

try {
	const result = await client.execute(`PRAGMA table_info(murid);`);
	console.log('[check-murid-columns] Murid table columns:');
	console.table(result.rows);

	const fotoCol = result.rows.find((row) => row.name === 'foto');
	if (fotoCol) {
		console.log('[check-murid-columns] ✓ Column "foto" exists');
	} else {
		console.log('[check-murid-columns] ✗ Column "foto" NOT FOUND');
		console.log('[check-murid-columns] Will add it now...');
		await client.execute(`ALTER TABLE murid ADD COLUMN foto TEXT;`);
		console.log('[check-murid-columns] ✓ Column "foto" added successfully');
	}
} catch (err) {
	console.error('[check-murid-columns] Error:', err);
	process.exit(1);
}

client.close();
console.log('[check-murid-columns] Done.');
