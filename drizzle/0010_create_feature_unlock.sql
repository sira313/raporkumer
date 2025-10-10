CREATE TABLE IF NOT EXISTS "feature_unlock" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "sekolah_id" integer NOT NULL,
    "feature_key" text NOT NULL,
    "unlocked_at" text NOT NULL,
    "created_at" text NOT NULL,
    "updated_at" text,
    CONSTRAINT "feature_unlock_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "sekolah" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "feature_unlock_sekolah_key_idx"
    ON "feature_unlock" ("sekolah_id", "feature_key");
