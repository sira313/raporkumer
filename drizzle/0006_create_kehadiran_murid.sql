CREATE TABLE IF NOT EXISTS "kehadiran_murid" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "murid_id" integer NOT NULL,
    "sakit" integer NOT NULL DEFAULT 0,
    "izin" integer NOT NULL DEFAULT 0,
    "alfa" integer NOT NULL DEFAULT 0,
    "created_at" text NOT NULL,
    "updated_at" text,
    CONSTRAINT "kehadiran_murid_murid_id_murid_id_fk" FOREIGN KEY ("murid_id") REFERENCES "murid" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "kehadiran_murid_murid_unique"
    ON "kehadiran_murid" ("murid_id");

CREATE INDEX IF NOT EXISTS "kehadiran_murid_murid_idx"
    ON "kehadiran_murid" ("murid_id");
