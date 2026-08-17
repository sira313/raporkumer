import db from '$lib/server/db';
import { ensureSchema } from './ensure-helper';

const TABLE = 'ai_settings';

export async function ensureAiSettingsSchema() {
	await ensureSchema(TABLE, [
		`CREATE TABLE IF NOT EXISTS "${TABLE}" (
			"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			"provider" text NOT NULL DEFAULT 'gemini',
			"api_key" text NOT NULL,
			"model" text NOT NULL DEFAULT 'gemini-3.6-flash',
			"created_at" text NOT NULL,
			"updated_at" text
		)`,
		`UPDATE "${TABLE}" SET "model" = 'gemini-3.6-flash' WHERE "model" = 'gemini-2.5-flash'`
	]);

	// Migration: add base_url column for existing databases
	try {
		await db.$client.execute(`ALTER TABLE "${TABLE}" ADD COLUMN "base_url" text`);
	} catch {
		// column already exists
	}
}
