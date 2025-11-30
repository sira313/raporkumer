-- Create join table for many-to-many relationship between auth_user and kelas
CREATE TABLE IF NOT EXISTS auth_user_kelas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  auth_user_id INTEGER NOT NULL REFERENCES auth_user(id) ON DELETE CASCADE,
  kelas_id INTEGER NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  UNIQUE(auth_user_id, kelas_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS auth_user_kelas_user_idx ON auth_user_kelas(auth_user_id);
CREATE INDEX IF NOT EXISTS auth_user_kelas_kelas_idx ON auth_user_kelas(kelas_id);
