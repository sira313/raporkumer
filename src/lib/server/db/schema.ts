import { relations } from 'drizzle-orm';
import { blob, int, real, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

const audit = {
	createdAt: text()
		.$defaultFn(() => new Date().toISOString())
		.notNull(),
	updatedAt: text()
};

export const tableAlamat = sqliteTable('alamat', {
	id: int().primaryKey({ autoIncrement: true }),
	jalan: text().notNull(),
	desa: text().notNull(),
	kecamatan: text().notNull(),
	kabupaten: text().notNull(),
	provinsi: text(),
	kodePos: text(),
	...audit
});

export const tablePegawai = sqliteTable('pegawai', {
	id: int().primaryKey({ autoIncrement: true }),
	nama: text().notNull(),
	nip: text().notNull(),
	...audit
});

export const tableSekolah = sqliteTable('sekolah', {
	id: int().primaryKey({ autoIncrement: true }),
	jenjangPendidikan: text({ enum: ['sd', 'smp', 'sma'] }).notNull(),
	nama: text().notNull(),
	npsn: text().notNull(),
	alamatId: int()
		.references(() => tableAlamat.id)
		.notNull(),
	logo: blob().$type<Uint8Array>(),
	logoType: text(),
	website: text(),
	email: text().notNull(),
	kepalaSekolahId: int()
		.references(() => tablePegawai.id)
		.notNull(),
	...audit
});

export const tableTahunAjaran = sqliteTable(
	'tahun_ajaran',
	{
		id: int().primaryKey({ autoIncrement: true }),
		sekolahId: int()
			.references(() => tableSekolah.id)
			.notNull(),
		nama: text().notNull(),
		tanggalMulai: text(),
		tanggalSelesai: text(),
		isAktif: int({ mode: 'boolean' }).default(false).notNull(),
		...audit
	},
	(table) => [unique().on(table.sekolahId, table.nama)]
);

export const tableSemester = sqliteTable(
	'semester',
	{
		id: int().primaryKey({ autoIncrement: true }),
		tahunAjaranId: int()
			.references(() => tableTahunAjaran.id, { onDelete: 'cascade' })
			.notNull(),
		tipe: text({ enum: ['ganjil', 'genap'] }).notNull(),
		nama: text().notNull(),
		tanggalMulai: text(),
		tanggalSelesai: text(),
		tanggalBagiRaport: text(),
		isAktif: int({ mode: 'boolean' }).default(false).notNull(),
		...audit
	},
	(table) => [unique().on(table.tahunAjaranId, table.tipe)]
);

export const tableTasks = sqliteTable('tasks', {
	id: int().primaryKey({ autoIncrement: true }),
	sekolahId: int()
		.references(() => tableSekolah.id, { onDelete: 'cascade' })
		.notNull(),
	title: text().notNull(),
	status: text({ enum: ['active', 'completed'] })
		.default('active')
		.notNull(),
	...audit
});

export const tableSekolahRelations = relations(tableSekolah, ({ one, many }) => ({
	alamat: one(tableAlamat, { fields: [tableSekolah.alamatId], references: [tableAlamat.id] }),
	kepalaSekolah: one(tablePegawai, {
		fields: [tableSekolah.kepalaSekolahId],
		references: [tablePegawai.id]
	}),
	tahunAjaran: many(tableTahunAjaran),
	tasks: many(tableTasks)
}));

export const tableTahunAjaranRelations = relations(tableTahunAjaran, ({ one, many }) => ({
	sekolah: one(tableSekolah, {
		fields: [tableTahunAjaran.sekolahId],
		references: [tableSekolah.id]
	}),
	semester: many(tableSemester)
}));

export const tableSemesterRelations = relations(tableSemester, ({ one }) => ({
	tahunAjaran: one(tableTahunAjaran, {
		fields: [tableSemester.tahunAjaranId],
		references: [tableTahunAjaran.id]
	})
}));

export const tableTasksRelations = relations(tableTasks, ({ one }) => ({
	sekolah: one(tableSekolah, {
		fields: [tableTasks.sekolahId],
		references: [tableSekolah.id]
	})
}));

export const tableKelas = sqliteTable(
	'kelas',
	{
		id: int().primaryKey({ autoIncrement: true }),
		sekolahId: int()
			.references(() => tableSekolah.id, { onDelete: 'cascade' })
			.notNull(),
		tahunAjaranId: int()
			.references(() => tableTahunAjaran.id, { onDelete: 'cascade' })
			.notNull(),
		semesterId: int()
			.references(() => tableSemester.id, { onDelete: 'cascade' })
			.notNull(),
		nama: text().notNull(),
		fase: text(),
		waliKelasId: int().references(() => tablePegawai.id, { onDelete: 'set null' }),
		...audit
	},
	(table) => [unique().on(table.sekolahId, table.semesterId, table.nama)]
);

export const tableKelasRelations = relations(tableKelas, ({ one }) => ({
	sekolah: one(tableSekolah, { fields: [tableKelas.sekolahId], references: [tableSekolah.id] }),
	tahunAjaran: one(tableTahunAjaran, {
		fields: [tableKelas.tahunAjaranId],
		references: [tableTahunAjaran.id]
	}),
	semester: one(tableSemester, {
		fields: [tableKelas.semesterId],
		references: [tableSemester.id]
	}),
	waliKelas: one(tablePegawai, { fields: [tableKelas.waliKelasId], references: [tablePegawai.id] })
}));

export const tableWaliMurid = sqliteTable('wali_murid', {
	id: int().primaryKey({ autoIncrement: true }),
	nama: text().notNull(),
	pekerjaan: text().notNull(),
	kontak: text(),
	alamat: text(),
	...audit
});

export const tableMurid = sqliteTable(
	'murid',
	{
		id: int().primaryKey({ autoIncrement: true }),
		nis: text().notNull(),
		nisn: text().notNull(),
		sekolahId: int()
			.references(() => tableSekolah.id)
			.notNull(),
		semesterId: int()
			.references(() => tableSemester.id, { onDelete: 'cascade' })
			.notNull(),
		kelasId: int()
			.references(() => tableKelas.id)
			.notNull(),
		nama: text().notNull(),
		tempatLahir: text().notNull(),
		tanggalLahir: text().notNull(),
		jenisKelamin: text({ enum: ['L', 'P'] }).notNull(),
		agama: text().notNull(),
		pendidikanSebelumnya: text().notNull(),
		tanggalMasuk: text().notNull(),
		alamatId: int()
			.references(() => tableAlamat.id)
			.notNull(),
		ibuId: int().references(() => tableWaliMurid.id),
		ayahId: int().references(() => tableWaliMurid.id),
		waliId: int().references(() => tableWaliMurid.id),
		...audit
	},
	(t) => [unique().on(t.sekolahId, t.semesterId, t.nis)]
);

export const tableMuridRelations = relations(tableMurid, ({ one }) => ({
	kelas: one(tableKelas, { fields: [tableMurid.kelasId], references: [tableKelas.id] }),
	semester: one(tableSemester, { fields: [tableMurid.semesterId], references: [tableSemester.id] }),
	alamat: one(tableAlamat, { fields: [tableMurid.alamatId], references: [tableAlamat.id] }),
	ibu: one(tableWaliMurid, { fields: [tableMurid.ibuId], references: [tableWaliMurid.id] }),
	ayah: one(tableWaliMurid, { fields: [tableMurid.ayahId], references: [tableWaliMurid.id] }),
	wali: one(tableWaliMurid, { fields: [tableMurid.waliId], references: [tableWaliMurid.id] })
}));

export const tableMataPelajaran = sqliteTable('mata_pelajaran', {
	id: int().primaryKey({ autoIncrement: true }),
	kelasId: int()
		.references(() => tableKelas.id)
		.notNull(),
	nama: text().notNull(),
	kkm: int().notNull().default(0),
	jenis: text({ enum: ['wajib', 'pilihan', 'mulok'] }).notNull(),
	...audit
});

export const tableTujuanPembelajaran = sqliteTable('tujuan_pembelajaran', {
	id: int().primaryKey({ autoIncrement: true }),
	mataPelajaranId: int()
		.references(() => tableMataPelajaran.id)
		.notNull(),
	deskripsi: text().notNull(),
	lingkupMateri: text().notNull(),
	bobot: real().default(0).notNull(),
	...audit
});

export const tableMataPelajaranRelations = relations(tableMataPelajaran, ({ one, many }) => ({
	tujuanPembelajaran: many(tableTujuanPembelajaran),
	kelas: one(tableKelas, { fields: [tableMataPelajaran.kelasId], references: [tableKelas.id] })
}));

export const tableTujuanPembelajaranRelations = relations(tableTujuanPembelajaran, ({ one }) => ({
	mataPelajaran: one(tableMataPelajaran, {
		fields: [tableTujuanPembelajaran.mataPelajaranId],
		references: [tableMataPelajaran.id]
	})
}));

export const tableEkstrakurikuler = sqliteTable(
	'ekstrakurikuler',
	{
		id: int().primaryKey({ autoIncrement: true }),
		nama: text().notNull(),
		kelasId: int()
			.references(() => tableKelas.id)
			.notNull(),
		...audit
	},
	(table) => [unique().on(table.kelasId, table.nama)]
);

export const tableEkstrakurikulerTujuan = sqliteTable('ekstrakurikuler_tujuan', {
	id: int().primaryKey({ autoIncrement: true }),
	ekstrakurikulerId: int()
		.references(() => tableEkstrakurikuler.id, { onDelete: 'cascade' })
		.notNull(),
	deskripsi: text().notNull(),
	...audit
});

export const tableKokurikuler = sqliteTable('kokurikuler', {
	id: int().primaryKey({ autoIncrement: true }),
	kelasId: int()
		.references(() => tableKelas.id)
		.notNull(),
	kode: text().notNull().unique(),
	dimensi: text({ mode: 'json' }).$type<string[]>().notNull(),
	tujuan: text().notNull(),
	...audit
});

export const tableEkstrakurikulerRelations = relations(tableEkstrakurikuler, ({ one, many }) => ({
	kelas: one(tableKelas, {
		fields: [tableEkstrakurikuler.kelasId],
		references: [tableKelas.id]
	}),
	tujuan: many(tableEkstrakurikulerTujuan)
}));

export const tableEkstrakurikulerTujuanRelations = relations(
	tableEkstrakurikulerTujuan,
	({ one }) => ({
		ekstrakurikuler: one(tableEkstrakurikuler, {
			fields: [tableEkstrakurikulerTujuan.ekstrakurikulerId],
			references: [tableEkstrakurikuler.id]
		})
	})
);

export const tableKokurikulerRelations = relations(tableKokurikuler, ({ one }) => ({
	kelas: one(tableKelas, {
		fields: [tableKokurikuler.kelasId],
		references: [tableKelas.id]
	})
}));
