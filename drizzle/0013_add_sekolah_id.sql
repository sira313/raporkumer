-- Add sekolah_id column to auth_user so we can persist the sekolah selected when creating a user
-- Note: SQLite doesn't support adding foreign key constraints via ALTER TABLE; we add the column
-- and leave referential integrity to application logic.
ALTER TABLE auth_user ADD COLUMN sekolah_id INTEGER;
-- Optional: populate sekolah_id from mata_pelajaran -> kelas -> sekolah for existing users
-- This is best-effort and will not overwrite existing non-null values.
UPDATE auth_user
SET sekolah_id = (
  SELECT kelas.sekolah_id
  FROM mata_pelajaran mp
  JOIN kelas ON mp.kelas_id = kelas.id
  WHERE mp.id = auth_user.mata_pelajaran_id
)
WHERE sekolah_id IS NULL AND mata_pelajaran_id IS NOT NULL;
