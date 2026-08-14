import { ensureSchema } from './ensure-helper';

const TABLE = 'buku_tamu_settings';

export async function ensureBukuTamuSettingsSchema() {
	await ensureSchema(TABLE, [
		`CREATE TABLE IF NOT EXISTS "${TABLE}" (
			"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			"sekolah_id" integer NOT NULL,
			"passkey_hash" text,
			"passkey_salt" text,
			"unlock_token" text,
			"created_at" text NOT NULL,
			"updated_at" text,
			FOREIGN KEY ("sekolah_id") REFERENCES "sekolah" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
			CONSTRAINT "buku_tamu_settings_sekolah_id_unique" UNIQUE("sekolah_id")
		)`
	]);
}
