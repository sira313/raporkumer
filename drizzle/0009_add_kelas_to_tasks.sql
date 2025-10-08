ALTER TABLE `tasks` ADD COLUMN `kelas_id` integer REFERENCES `kelas`(`id`) ON DELETE cascade;

UPDATE `tasks`
SET `kelas_id` = (
    SELECT `kelas`.`id`
    FROM `kelas`
    WHERE `kelas`.`sekolah_id` = `tasks`.`sekolah_id`
    ORDER BY `kelas`.`id`
    LIMIT 1
)
WHERE `kelas_id` IS NULL
  AND EXISTS (
    SELECT 1
    FROM `kelas`
    WHERE `kelas`.`sekolah_id` = `tasks`.`sekolah_id`
);

CREATE INDEX IF NOT EXISTS `tasks_kelas_idx` ON `tasks`(`kelas_id`);
