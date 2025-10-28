import { defineConfig } from 'drizzle-kit';

// Use process.env directly so this config works both in development and on
// installed target machines where dev dependencies (like vite) are not present.
const env = process.env || {};

export default defineConfig({
	out: './drizzle',
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	casing: 'snake_case',
	dbCredentials: { url: env['DB_URL'] || 'file:./data/database.sqlite3' }
});
