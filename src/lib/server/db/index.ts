import { env } from '$env/dynamic/private';
import { createClient, type Client } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql/node';
import * as schema from './schema';

const defaultDbUrl = 'file:./data/database.sqlite3';
const clientKey = '__rapkumerLibsqlClient';

function createClientInstance(): Client {
	const url = env.DB_URL || defaultDbUrl;
	const authToken = env.DB_AUTH_TOKEN;
	console.info(`[db] creating libsql client; DB_URL=${url ? url : '(none)'}${authToken ? ' (auth token present)' : ''}`);
	return createClient({ url, authToken });
}

// create or reuse a client stored on globalThis so hot-reloads keep using same connection
function initClient(): Client {
	const store = globalThis as unknown as Record<string, Client | undefined>;
	const existing = store[clientKey];
	if (existing) return existing;

	const client = createClientInstance();
	store[clientKey] = client;
	return client;
}

let currentClient: Client = initClient();
let currentDb = drizzle(currentClient, { casing: 'snake_case', schema });

export async function reloadDbClient() {
	try {
		const store = globalThis as unknown as Record<string, Client | undefined>;
		const existing = store[clientKey];
		if (existing) {
			const maybeClose = (existing as unknown as { close?: () => Promise<void> | void }).close;
			if (typeof maybeClose === 'function') {
				try {
					await maybeClose.call(existing);
				} catch (e) {
					console.warn('[db] error closing existing client:', e);
				}
			}
		}
		delete store[clientKey];
		currentClient = initClient();
		currentDb = drizzle(currentClient, { casing: 'snake_case', schema });
		console.info('[db] reloaded libsql client and drizzle instance');
	} catch (e) {
		console.error('[db] failed to reload client', e);
	}
}

// Export a proxy that forwards calls to the current drizzle instance so callers can keep
// the same imported object while we swap the underlying instance on import/reset.
const dbProxy = new Proxy(
	{},
	{
		get(_t, prop) {
			const target = currentDb as unknown as Record<string, unknown>;
			const v = (target as Record<string, unknown>)[String(prop)];
			if (typeof v === 'function') return (v as unknown as (...args: unknown[]) => unknown).bind(target);
			return v;
		},
		set(_t, prop, value) {
			(currentDb as unknown as Record<string, unknown>)[String(prop)] = value;
			return true;
		}
	}
);

export default dbProxy as unknown as typeof currentDb;
