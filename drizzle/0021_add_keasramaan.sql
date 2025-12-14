CREATE TABLE IF NOT EXISTS "keasramaan" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "nama" text NOT NULL,
    "kelas_id" integer NOT NULL,
    "created_at" text NOT NULL,
    "updated_at" text,
    CONSTRAINT "keasramaan_kelas_id_kelas_id_fk" FOREIGN KEY ("kelas_id") REFERENCES "kelas" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "keasramaan_kelas_id_nama_unique"
    ON "keasramaan" ("kelas_id", "nama");

CREATE TABLE IF NOT EXISTS "keasramaan_indikator" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "keasramaan_id" integer NOT NULL,
    "deskripsi" text NOT NULL,
    "created_at" text NOT NULL,
    "updated_at" text,
    CONSTRAINT "keasramaan_indikator_keasramaan_id_keasramaan_id_fk" FOREIGN KEY ("keasramaan_id") REFERENCES "keasramaan" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "keasramaan_indikator_keasramaan_idx"
    ON "keasramaan_indikator" ("keasramaan_id");
