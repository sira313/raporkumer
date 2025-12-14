-- Migration: Add nilaiKosong flag to ekstrakurikuler table
-- This flag indicates whether the ekstrakurikuler has empty values (should show "-" in rapor)

ALTER TABLE `ekstrakurikuler` ADD `nilai_kosong` integer DEFAULT 0 NOT NULL;
