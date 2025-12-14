-- Add indexes to improve query performance
-- These indexes target the most frequently queried columns

-- Auth user indexes
CREATE INDEX IF NOT EXISTS idx_auth_user_pegawai_id ON auth_user(pegawai_id);
CREATE INDEX IF NOT EXISTS idx_auth_user_kelas_id ON auth_user(kelas_id);
CREATE INDEX IF NOT EXISTS idx_auth_user_type ON auth_user(type);
CREATE INDEX IF NOT EXISTS idx_auth_user_username_normalized ON auth_user(username_normalized);

-- Murid indexes
CREATE INDEX IF NOT EXISTS idx_murid_sekolah_id ON murid(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_murid_kelas_id ON murid(kelas_id);
CREATE INDEX IF NOT EXISTS idx_murid_nama ON murid(nama);

-- Kelas indexes
CREATE INDEX IF NOT EXISTS idx_kelas_wali_kelas_id ON kelas(wali_kelas_id);
CREATE INDEX IF NOT EXISTS idx_kelas_wali_asuh_id ON kelas(wali_asuh_id);
CREATE INDEX IF NOT EXISTS idx_kelas_sekolah_id ON kelas(sekolah_id);
CREATE INDEX IF NOT EXISTS idx_kelas_tahun_ajaran_id ON kelas(tahun_ajaran_id);
CREATE INDEX IF NOT EXISTS idx_kelas_semester_id ON kelas(semester_id);

-- Pegawai indexes
CREATE INDEX IF NOT EXISTS idx_pegawai_nama ON pegawai(nama);

-- Mata pelajaran indexes
CREATE INDEX IF NOT EXISTS idx_mata_pelajaran_kelas_id ON mata_pelajaran(kelas_id);
CREATE INDEX IF NOT EXISTS idx_mata_pelajaran_nama ON mata_pelajaran(nama);

-- Asesmen indexes
CREATE INDEX IF NOT EXISTS idx_asesmen_formatif_tp_id ON asesmen_formatif(tujuan_pembelajaran_id);
CREATE INDEX IF NOT EXISTS idx_asesmen_formatif_murid_id ON asesmen_formatif(murid_id);
CREATE INDEX IF NOT EXISTS idx_asesmen_sumatif_mapel_id ON asesmen_sumatif(mata_pelajaran_id);
CREATE INDEX IF NOT EXISTS idx_asesmen_sumatif_murid_id ON asesmen_sumatif(murid_id);

-- Kehadiran indexes
CREATE INDEX IF NOT EXISTS idx_kehadiran_murid_murid_id ON kehadiran_murid(murid_id);

-- Catatan wali kelas indexes
CREATE INDEX IF NOT EXISTS idx_catatan_wali_kelas_murid_id ON catatan_wali_kelas(murid_id);
