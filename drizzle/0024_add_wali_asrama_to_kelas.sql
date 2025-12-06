ALTER TABLE `kelas` ADD `waliAsramaId` integer;--> statement-breakpoint
ALTER TABLE `kelas` ADD FOREIGN KEY (`waliAsramaId`) REFERENCES `pegawai`(`id`) ON DELETE set null;
