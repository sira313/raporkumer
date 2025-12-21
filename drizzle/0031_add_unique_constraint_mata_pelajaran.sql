-- Migration: Add unique constraint to prevent duplicate mata pelajaran per kelas
-- Created: 2025-12-21

-- Add unique constraint on (kelas_id, nama)
-- This will prevent duplicate subjects with the same name in the same class
CREATE UNIQUE INDEX IF NOT EXISTS "mata_pelajaran_kelas_id_nama_unique" ON "mata_pelajaran" ("kelas_id", "nama");
