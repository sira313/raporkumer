-- Create join table for many-to-many relationship between auth_user and mata_pelajaran
CREATE TABLE IF NOT EXISTS auth_user_mata_pelajaran (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auth_user_id INTEGER NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  mata_pelajaran_id INTEGER NOT NULL REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  UNIQUE(auth_user_id, mata_pelajaran_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS auth_user_mata_pelajaran_user_idx ON auth_user_mata_pelajaran(auth_user_id);
CREATE INDEX IF NOT EXISTS auth_user_mata_pelajaran_mapel_idx ON auth_user_mata_pelajaran(mata_pelajaran_id);
