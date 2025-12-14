-- Add waliAsuhId column to kelas table
-- Wali Asuh (Custodian/Guardian teacher) is a new role with NIP
-- This column references the pegawai table

ALTER TABLE kelas ADD COLUMN waliAsuhId INTEGER REFERENCES pegawai(id) ON DELETE SET NULL;
