-- Add statusKepalaSekolah column to sekolah table
-- Status kepala sekolah: definitif atau PLT (Pelaksana Tugas)

ALTER TABLE sekolah ADD COLUMN statusKepalaSekolah TEXT NOT NULL DEFAULT 'definitif';
