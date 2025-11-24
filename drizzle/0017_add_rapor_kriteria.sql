-- Add rapor kriteria columns (batas atas Cukup / Baik)
ALTER TABLE sekolah ADD COLUMN raporKriteriaCukup INTEGER NOT NULL DEFAULT 85;
ALTER TABLE sekolah ADD COLUMN raporKriteriaBaik INTEGER NOT NULL DEFAULT 95;
