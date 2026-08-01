import { ensureSchema } from './ensure-helper';
import { migrateLegacySignatures } from '$lib/server/ttd';

export async function ensureBukuTamuSchema() {
	await ensureSchema('buku_tamu', [
		`CREATE TABLE IF NOT EXISTS "buku_tamu" (
			"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			"sekolah_id" integer NOT NULL,
			"tahun_ajaran_id" integer,
			"semester_id" integer,
			"nama" text NOT NULL,
			"asal_instansi" text NOT NULL,
			"nip" text,
			"keperluan" text NOT NULL,
			"pesan_kesan" text,
			"tanda_tangan" text,
			"created_at" text NOT NULL,
			"updated_at" text,
			FOREIGN KEY ("sekolah_id") REFERENCES "sekolah" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
			FOREIGN KEY ("tahun_ajaran_id") REFERENCES "tahun_ajaran" ("id") ON UPDATE NO ACTION ON DELETE SET NULL,
			FOREIGN KEY ("semester_id") REFERENCES "semester" ("id") ON UPDATE NO ACTION ON DELETE SET NULL
		)`,
		`CREATE INDEX IF NOT EXISTS "buku_tamu_sekolah_idx" ON "buku_tamu" ("sekolah_id")`,
		`CREATE INDEX IF NOT EXISTS "buku_tamu_tanggal_idx" ON "buku_tamu" ("created_at")`
	]);

	// One-time: move legacy inline signature data URLs out of the DB into data/ttd files.
	await migrateLegacySignatures();
}
