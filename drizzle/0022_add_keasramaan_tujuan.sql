CREATE TABLE `keasramaan_tujuan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`indikatorId` integer NOT NULL,
	`deskripsi` text NOT NULL,
	`createdAt` text NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updatedAt` text,
	FOREIGN KEY (`indikatorId`) REFERENCES `keasramaan_indikator`(`id`) ON DELETE cascade
);
