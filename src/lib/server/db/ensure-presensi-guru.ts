import { ensureSchema } from './ensure-helper';
import { migrateLegacySignatures } from '$lib/server/ttd';

export async function ensurePresensiGuruSchema() {
	await ensureSchema('presensi_guru', [
		`CREATE TABLE IF NOT EXISTS "presensi_guru" (
			"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			"sekolah_id" integer NOT NULL,
			"tahun_ajaran_id" integer NOT NULL,
			"semester_id" integer NOT NULL,
			"auth_user_id" integer NOT NULL,
			"tanggal" text NOT NULL,
			"status" text NOT NULL,
			"waktu" text NOT NULL,
			"tanda_tangan" text,
			"keterangan" text,
			"created_at" text NOT NULL,
			"updated_at" text,
			FOREIGN KEY ("sekolah_id") REFERENCES "sekolah" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
			FOREIGN KEY ("tahun_ajaran_id") REFERENCES "tahun_ajaran" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
			FOREIGN KEY ("semester_id") REFERENCES "semester" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
			FOREIGN KEY ("auth_user_id") REFERENCES "auth_user" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
		)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS "presensi_guru_sekolah_user_tanggal_idx" ON "presensi_guru" ("sekolah_id", "auth_user_id", "tanggal")`,
		`CREATE INDEX IF NOT EXISTS "presensi_guru_sekolah_tanggal_idx" ON "presensi_guru" ("sekolah_id", "tanggal")`
	]);

	// One-time: move legacy inline signature data URLs out of the DB into data/ttd files.
	await migrateLegacySignatures();
}
