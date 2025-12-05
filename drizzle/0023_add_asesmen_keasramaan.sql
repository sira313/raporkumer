CREATE TABLE `asesmen_keasramaan` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`muridId` integer NOT NULL,
	`keasramaanId` integer NOT NULL,
	`tujuanId` integer NOT NULL,
	`kategori` text NOT NULL,
	`dinilaiPada` text,
	`createdAt` text NOT NULL,
	`updatedAt` text,
	FOREIGN KEY (`muridId`) REFERENCES `murid`(`id`) ON DELETE cascade,
	FOREIGN KEY (`keasramaanId`) REFERENCES `keasramaan`(`id`) ON DELETE cascade,
	FOREIGN KEY (`tujuanId`) REFERENCES `keasramaan_tujuan`(`id`) ON DELETE cascade,
	UNIQUE(`muridId`, `keasramaanId`, `tujuanId`)
);
--> statement-breakpoint
CREATE INDEX `asesmen_keasramaan_murid_idx` on `asesmen_keasramaan` (`muridId`);--> statement-breakpoint
CREATE INDEX `asesmen_keasramaan_keasramaan_idx` on `asesmen_keasramaan` (`keasramaanId`);--> statement-breakpoint
CREATE INDEX `asesmen_keasramaan_tujuan_idx` on `asesmen_keasramaan` (`tujuanId`);
