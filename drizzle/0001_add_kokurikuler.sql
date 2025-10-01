CREATE TABLE IF NOT EXISTS "kokurikuler" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "kelas_id" integer NOT NULL,
    "kode" text NOT NULL,
    "dimensi" text NOT NULL,
    "tujuan" text NOT NULL,
    "created_at" text NOT NULL,
    "updated_at" text,
    CONSTRAINT "kokurikuler_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "kelas" ("id") ON UPDATE NO ACTION ON DELETE NO ACTION
);

CREATE UNIQUE INDEX IF NOT EXISTS "kokurikuler_kode_unique" ON "kokurikuler" ("kode");
CREATE INDEX IF NOT EXISTS "kokurikuler_kelas_id_idx" ON "kokurikuler" ("kelas_id");
