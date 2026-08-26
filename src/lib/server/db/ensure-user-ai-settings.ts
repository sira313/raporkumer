import db from './index';

const COLUMNS = ['ai_api_key', 'ai_model', 'ai_base_url'] as const;

/** Add per-user AI key columns to auth_user (older databases lack them). */
export async function ensureUserAiSettingsSchema() {
	for (const column of COLUMNS) {
		try {
			await db.$client.execute(`ALTER TABLE "auth_user" ADD COLUMN "${column}" text`);
		} catch {
			// column already exists
		}
	}
}
