import db from '$lib/server/db';
import { ensureSchema } from './ensure-helper';

const LOGIN_ATTEMPTS = 'login_attempts';

export async function ensureLoginAttemptsSchema() {
	await ensureSchema(LOGIN_ATTEMPTS, [
		`CREATE TABLE IF NOT EXISTS "login_attempt" (
			"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			"username" text,
			"ip_address" text NOT NULL,
			"succeeded" integer DEFAULT 0 NOT NULL,
			"created_at" text NOT NULL,
			"updated_at" text
		)`,
		`CREATE INDEX IF NOT EXISTS "login_attempt_username_idx" ON "login_attempt" ("username")`,
		`CREATE INDEX IF NOT EXISTS "login_attempt_ip_idx" ON "login_attempt" ("ip_address")`,
		`CREATE INDEX IF NOT EXISTS "login_attempt_created_idx" ON "login_attempt" ("created_at")`
	]);

	// Migration for existing databases: force the default Admin account to change
	// its password on next login. Added lazily so old installs get the column.
	try {
		await db.$client.execute(
			`ALTER TABLE auth_user ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0`
		);
	} catch {
		// column already exists
	}
}
