import { env } from '$env/dynamic/private';
import { drizzle } from 'drizzle-orm/libsql/node';
import * as schema from './schema';

const db = drizzle({
	connection: { url: env.DB_URL || 'file:./data/database.sqlite3' },
	casing: 'snake_case',
	schema: schema
});

export default db;
