import { createClient } from '@libsql/client';

const client = createClient({ url: process.env.DB_URL || 'file:./data/database.sqlite3' });

const sql =
	process.argv[2] ??
	'SELECT id, sekolah_id AS sekolahId, nama FROM kelas WHERE tahun_ajaran_id IS NULL LIMIT 20';

const rows = await client.execute({ sql });

console.log(rows.rows);

await client.close();
