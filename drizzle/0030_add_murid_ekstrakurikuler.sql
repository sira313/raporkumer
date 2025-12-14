-- Migration: Add murid_ekstrakurikuler table to track per-student ekstrakurikuler settings
-- This allows the "nilai kosong" flag to be set per student, not globally

CREATE TABLE IF NOT EXISTS `murid_ekstrakurikuler` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`murid_id` integer NOT NULL,
	`ekstrakurikuler_id` integer NOT NULL,
	`nilai_kosong` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text,
	CONSTRAINT `murid_ekstrakurikuler_murid_id_murid_id_fk` FOREIGN KEY (`murid_id`) REFERENCES `murid` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
	CONSTRAINT `murid_ekstrakurikuler_ekstrakurikuler_id_ekstrakurikuler_id_fk` FOREIGN KEY (`ekstrakurikuler_id`) REFERENCES `ekstrakurikuler` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS `murid_ekstrakurikuler_murid_ekstrak_unique` ON `murid_ekstrakurikuler` (`murid_id`, `ekstrakurikuler_id`);
CREATE INDEX IF NOT EXISTS `murid_ekstrakurikuler_murid_idx` ON `murid_ekstrakurikuler` (`murid_id`);
CREATE INDEX IF NOT EXISTS `murid_ekstrakurikuler_ekstrak_idx` ON `murid_ekstrakurikuler` (`ekstrakurikuler_id`);

-- Remove nilai_kosong from ekstrakurikuler table (if exists)
-- Note: SQLite doesn't support DROP COLUMN easily, so we'll just leave it and ignore it
