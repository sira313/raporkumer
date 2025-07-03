import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/libsql/node';

const db = drizzle({
	connection: { url: env.DB_URL || 'file:./data/database.sqlite3' },
	casing: 'snake_case'
});

export default db;
