PRAGMA foreign_keys=OFF;

-- Seed missing academic structures
INSERT INTO "tahun_ajaran" ("sekolah_id", "nama", "created_at", "updated_at")
SELECT s.id,
       'Tahun Ajaran ' || strftime('%Y', 'now') || '/' || strftime('%Y', 'now', '+1 year'),
       datetime('now'),
       datetime('now')
FROM "sekolah" s
WHERE NOT EXISTS (
    SELECT 1 FROM "tahun_ajaran" ta WHERE ta."sekolah_id" = s.id
);

INSERT INTO "semester" ("tahun_ajaran_id", "tipe", "nama", "created_at", "updated_at")
SELECT ta.id,
       'ganjil',
       'Semester Ganjil',
       datetime('now'),
       NULL
FROM "tahun_ajaran" ta
WHERE NOT EXISTS (
    SELECT 1 FROM "semester" se
    WHERE se."tahun_ajaran_id" = ta.id AND se."tipe" = 'ganjil'
);

INSERT INTO "semester" ("tahun_ajaran_id", "tipe", "nama", "created_at", "updated_at")
SELECT ta.id,
       'genap',
       'Semester Genap',
       datetime('now'),
       NULL
FROM "tahun_ajaran" ta
WHERE NOT EXISTS (
    SELECT 1 FROM "semester" se
    WHERE se."tahun_ajaran_id" = ta.id AND se."tipe" = 'genap'
);

-- Resolve missing academic references for existing classes
WITH resolved_tahun AS (
    SELECT
        k."id",
        COALESCE(
            k."tahun_ajaran_id",
            (
                SELECT ta.id
                FROM "tahun_ajaran" ta
                WHERE ta."sekolah_id" = k."sekolah_id"
                ORDER BY ta."is_aktif" DESC, ta."id" DESC
                LIMIT 1
            )
        ) AS tahun_id
    FROM "kelas" k
)
UPDATE "kelas"
SET "tahun_ajaran_id" = resolved_tahun.tahun_id
FROM resolved_tahun
WHERE "kelas"."id" = resolved_tahun."id"
  AND "kelas"."tahun_ajaran_id" IS NULL
  AND resolved_tahun.tahun_id IS NOT NULL;

WITH resolved_semester AS (
    SELECT
        k."id",
        COALESCE(
            k."semester_id",
            (
                SELECT se."id"
                FROM "semester" se
                WHERE se."tahun_ajaran_id" = COALESCE(k."tahun_ajaran_id",
                    (
                        SELECT ta.id
                        FROM "tahun_ajaran" ta
                        WHERE ta."sekolah_id" = k."sekolah_id"
                        ORDER BY ta."is_aktif" DESC, ta."id" DESC
                        LIMIT 1
                    )
                )
                ORDER BY se."is_aktif" DESC,
                         (se."tipe" = 'ganjil') DESC,
                         se."id" DESC
                LIMIT 1
            )
        ) AS semester_id
    FROM "kelas" k
)
UPDATE "kelas"
SET "semester_id" = resolved_semester.semester_id
FROM resolved_semester
WHERE "kelas"."id" = resolved_semester."id"
  AND "kelas"."semester_id" IS NULL
  AND resolved_semester.semester_id IS NOT NULL;

ALTER TABLE "kelas" RENAME TO "kelas_old";

CREATE TABLE "kelas" (
    "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
    "sekolah_id" integer NOT NULL,
    "tahun_ajaran_id" integer NOT NULL,
    "semester_id" integer NOT NULL,
    "nama" text NOT NULL,
    "fase" text,
    "wali_kelas_id" integer,
    "created_at" text NOT NULL,
    "updated_at" text,
    CONSTRAINT "kelas_sekolah_id_fk" FOREIGN KEY ("sekolah_id") REFERENCES "sekolah" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "kelas_tahun_ajaran_id_fk" FOREIGN KEY ("tahun_ajaran_id") REFERENCES "tahun_ajaran" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "kelas_semester_id_fk" FOREIGN KEY ("semester_id") REFERENCES "semester" ("id") ON DELETE CASCADE ON UPDATE NO ACTION,
    CONSTRAINT "kelas_wali_kelas_id_fk" FOREIGN KEY ("wali_kelas_id") REFERENCES "pegawai" ("id") ON DELETE SET NULL ON UPDATE NO ACTION
);

INSERT INTO "kelas" (
    "id",
    "sekolah_id",
    "tahun_ajaran_id",
    "semester_id",
    "nama",
    "fase",
    "wali_kelas_id",
    "created_at",
    "updated_at"
)
SELECT
    k."id",
    k."sekolah_id",
    COALESCE(
        k."tahun_ajaran_id",
        (
            SELECT ta.id
            FROM "tahun_ajaran" ta
            WHERE ta."sekolah_id" = k."sekolah_id"
            ORDER BY ta."is_aktif" DESC, ta."id" DESC
            LIMIT 1
        )
    ) AS tahun_id,
    COALESCE(
        k."semester_id",
        (
            SELECT se."id"
            FROM "semester" se
            WHERE se."tahun_ajaran_id" = COALESCE(
                k."tahun_ajaran_id",
                (
                    SELECT ta.id
                    FROM "tahun_ajaran" ta
                    WHERE ta."sekolah_id" = k."sekolah_id"
                    ORDER BY ta."is_aktif" DESC, ta."id" DESC
                    LIMIT 1
                )
            )
            ORDER BY se."is_aktif" DESC,
                     (se."tipe" = 'ganjil') DESC,
                     se."id" DESC
            LIMIT 1
        )
    ) AS semester_id,
    k."nama",
    k."fase",
    k."wali_kelas_id",
    k."created_at",
    k."updated_at"
FROM "kelas_old" k;

DROP TABLE "kelas_old";

CREATE UNIQUE INDEX "kelas_sekolah_semester_nama_unique"
    ON "kelas" ("sekolah_id", "semester_id", "nama");

CREATE INDEX "kelas_tahun_ajaran_id_idx"
    ON "kelas" ("tahun_ajaran_id");

CREATE INDEX "kelas_semester_id_idx"
    ON "kelas" ("semester_id");

PRAGMA foreign_keys=ON;
