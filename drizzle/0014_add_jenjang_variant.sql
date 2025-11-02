ALTER TABLE `sekolah` ADD COLUMN `jenjang_variant` text;

-- no need to backfill; existing rows will have NULL variant
