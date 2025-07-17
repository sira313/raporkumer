import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	dialect: 'sqlite',
	casing: 'snake_case',
	dbCredentials: { url: process.env.DB_URL }
});
