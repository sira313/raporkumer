import db from '$lib/server/db';
import { ensureSchema } from './ensure-helper';

export async function ensureSppdSchema() {
	await ensureSchema('sppd', [
		`CREATE TABLE IF NOT EXISTS "sppd" (
			"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			"sekolah_id" integer NOT NULL,
			"tahun_ajaran_id" integer,
			"semester_id" integer,
			"maksud" text NOT NULL,
			"nomor_surat_tugas" text,
			"tanggal_surat_tugas" text,
			"dasar_surat_tugas" text,
			"alat_angkut" text,
			"tempat_berangkat" text,
			"tempat_tujuan" text,
			"lamanya" text,
			"tanggal_berangkat" text NOT NULL,
			"tanggal_kembali" text NOT NULL,
			"keterangan_pengikut" text,
			"kode_rekening" text,
			"keterangan_lain" text,
			"created_at" text NOT NULL,
			"updated_at" text,
			FOREIGN KEY ("sekolah_id") REFERENCES "sekolah" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
			FOREIGN KEY ("tahun_ajaran_id") REFERENCES "tahun_ajaran" ("id") ON UPDATE NO ACTION ON DELETE SET NULL,
			FOREIGN KEY ("semester_id") REFERENCES "semester" ("id") ON UPDATE NO ACTION ON DELETE SET NULL
		)`,
		`CREATE INDEX IF NOT EXISTS "sppd_sekolah_idx" ON "sppd" ("sekolah_id")`,
		`CREATE INDEX IF NOT EXISTS "sppd_tanggal_berangkat_idx" ON "sppd" ("tanggal_berangkat")`,
		`CREATE TABLE IF NOT EXISTS "sppd_pegawai" (
			"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			"sppd_id" integer NOT NULL,
			"auth_user_id" integer,
			"nama" text NOT NULL,
			"urutan" integer NOT NULL DEFAULT 0,
			"created_at" text NOT NULL,
			"updated_at" text,
			FOREIGN KEY ("sppd_id") REFERENCES "sppd" ("id") ON UPDATE NO ACTION ON DELETE CASCADE,
			FOREIGN KEY ("auth_user_id") REFERENCES "auth_user" ("id") ON UPDATE NO ACTION ON DELETE SET NULL
		)`,
		`CREATE INDEX IF NOT EXISTS "sppd_pegawai_sppd_idx" ON "sppd_pegawai" ("sppd_id")`,
		`CREATE INDEX IF NOT EXISTS "sppd_pegawai_user_idx" ON "sppd_pegawai" ("auth_user_id")`,
		`CREATE TABLE IF NOT EXISTS "sppd_pengikut" (
			"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			"sppd_id" integer NOT NULL,
			"nama" text NOT NULL,
			"tempat_lahir" text NOT NULL,
			"tanggal_lahir" text NOT NULL,
			"created_at" text NOT NULL,
			"updated_at" text,
			FOREIGN KEY ("sppd_id") REFERENCES "sppd" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
		)`,
		`CREATE INDEX IF NOT EXISTS "sppd_pengikut_sppd_idx" ON "sppd_pengikut" ("sppd_id")`
	]);

	try {
		await db.$client.execute(`ALTER TABLE "sppd" ADD COLUMN "nomor_surat_tugas" text`);
	} catch {
		// column already exists
	}

	try {
		await db.$client.execute(`ALTER TABLE "sppd" ADD COLUMN "tanggal_surat_tugas" text`);
	} catch {
		// column already exists
	}

	try {
		await db.$client.execute(`ALTER TABLE "sppd" ADD COLUMN "dasar_surat_tugas" text`);
	} catch {
		// column already exists
	}

	try {
		await db.$client.execute(`ALTER TABLE "sppd" ADD COLUMN "tingkat_biaya" text`);
	} catch {
		// column already exists
	}
}
