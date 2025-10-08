DROP INDEX IF EXISTS "ekstrakurikuler_nama_unique";

CREATE UNIQUE INDEX IF NOT EXISTS "ekstrakurikuler_kelas_id_nama_unique"
	ON "ekstrakurikuler" ("kelas_id", "nama");

CREATE TABLE IF NOT EXISTS "ekstrakurikuler_tujuan" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"ekstrakurikuler_id" integer NOT NULL,
	"deskripsi" text NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text,
	CONSTRAINT "ekstrakurikuler_tujuan_ekstrakurikuler_id_ekstrakurikuler_id_fk" FOREIGN KEY ("ekstrakurikuler_id") REFERENCES "ekstrakurikuler" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "ekstrakurikuler_tujuan_ekstrakurikuler_id_idx"
	ON "ekstrakurikuler_tujuan" ("ekstrakurikuler_id");
