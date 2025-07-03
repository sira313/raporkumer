import { defineConfig } from 'drizzle-kit';
import { loadEnv } from 'vite';

const env = loadEnv('', '.', '');

export default defineConfig({
	out: './drizzle',
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	casing: 'snake_case',
	dbCredentials: { url: env['DB_URL'] || 'file:./data/database.sqlite3' }
});
