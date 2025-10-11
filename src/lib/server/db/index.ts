import { env } from '$env/dynamic/private';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql/node';
import * as schema from './schema';

const defaultDbUrl = 'file:./data/database.sqlite3';
const clientKey = '__rapkumerLibsqlClient';

function initClient(): Client {
	const store = globalThis as unknown as Record<string, Client | undefined>;
	const existing = store[clientKey];
	if (existing) return existing;

	const url = env.DB_URL || defaultDbUrl;
	const authToken = env.DB_AUTH_TOKEN;
	const client = createClient({ url, authToken });
	store[clientKey] = client;
	return client;
}

const dbClient = initClient();

const db = drizzle(dbClient, {
	casing: 'snake_case',
	schema
});

export default db;
