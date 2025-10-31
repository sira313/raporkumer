import { createClient } from '@libsql/client';

const dbUrl = process.env.DB_URL || 'file:./data/database.sqlite3';
const client = createClient({ url: dbUrl });

async function q(username) {
	const r = await client.execute(
		`SELECT id, username, username_normalized, mata_pelajaran_id, sekolah_id FROM auth_user WHERE username_normalized = ?`,
		[username.toLowerCase()]
	);
	console.log(JSON.stringify(r, null, 2));
}

q(process.argv[2] || 'islam').catch((e) => {
	console.error(e);
	process.exit(1);
});
