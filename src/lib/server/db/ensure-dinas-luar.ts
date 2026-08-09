import { ensureSchema } from './ensure-helper';

export async function ensureDinasLuarSchema() {
	await ensureSchema('dinas_luar_permohonan', [
		`CREATE TABLE IF NOT EXISTS "dinas_luar_permohonan" (
			"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			"sekolah_id" integer NOT NULL,
			"auth_user_id" integer NOT NULL,
			"nama" text NOT NULL,
			"maksud" text NOT NULL,
			"undangan_file" text,
			"created_at" text NOT NULL,
			"updated_at" text,
			FOREIGN KEY ("sekolah_id") REFERENCES "sekolah" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
			FOREIGN KEY ("auth_user_id") REFERENCES "auth_user" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
		)`,
		`CREATE INDEX IF NOT EXISTS "dinas_luar_permohonan_sekolah_idx" ON "dinas_luar_permohonan" ("sekolah_id")`,
		`CREATE INDEX IF NOT EXISTS "dinas_luar_permohonan_auth_user_idx" ON "dinas_luar_permohonan" ("auth_user_id")`,
		`CREATE TABLE IF NOT EXISTS "dinas_luar_bukti" (
			"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			"sppd_id" integer NOT NULL,
			"auth_user_id" integer,
			"jenis" text NOT NULL,
			"nama_file" text NOT NULL,
			"created_at" text NOT NULL,
			"updated_at" text,
			FOREIGN KEY ("sppd_id") REFERENCES "sppd" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
			FOREIGN KEY ("auth_user_id") REFERENCES "auth_user" ("id") ON UPDATE NO ACTION ON DELETE SET NULL
		)`,
		`CREATE INDEX IF NOT EXISTS "dinas_luar_bukti_sppd_idx" ON "dinas_luar_bukti" ("sppd_id")`,
		`CREATE INDEX IF NOT EXISTS "dinas_luar_bukti_auth_user_idx" ON "dinas_luar_bukti" ("auth_user_id")`
	]);
}
