import { relations } from 'drizzle-orm';
import { blob, int, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

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
	website: text(),
	email: text().notNull(),
	kepalaSekolahId: int()
		.references(() => tablePegawai.id)
		.notNull(),
	...audit
});

export const tableSekolahRelations = relations(tableSekolah, ({ one }) => ({
	alamat: one(tableAlamat, { fields: [tableSekolah.alamatId], references: [tableAlamat.id] }),
	kepalaSekolah: one(tablePegawai, {
		fields: [tableSekolah.kepalaSekolahId],
		references: [tablePegawai.id]
	})
}));

export const tableKelas = sqliteTable('kelas', {
	id: int().primaryKey({ autoIncrement: true }),
	sekolahId: int()
		.references(() => tableSekolah.id)
		.notNull(),
	nama: text().notNull(),
	fase: text().notNull(),
	waliKelasId: int()
		.references(() => tablePegawai.id)
		.notNull(),
	...audit
});

export const tableKelasRelations = relations(tableKelas, ({ one }) => ({
	sekolah: one(tableSekolah, { fields: [tableKelas.sekolahId], references: [tableSekolah.id] }),
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
	(t) => [unique().on(t.sekolahId, t.nis)]
);

export const tableMuridRelations = relations(tableMurid, ({ one }) => ({
	kelas: one(tableKelas, { fields: [tableMurid.kelasId], references: [tableKelas.id] }),
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
	jenis: text({ enum: ['wajib', 'mulok'] }).notNull(),
	...audit
});

export const tableTujuanPembelajaran = sqliteTable('tujuan_pembelajaran', {
	id: int().primaryKey({ autoIncrement: true }),
	mataPelajaranId: int()
		.references(() => tableMataPelajaran.id)
		.notNull(),
	deskripsi: text().notNull(),
	lingkupMateri: text().notNull(),
	...audit
});

export const tableMataPelajaranRelations = relations(tableMataPelajaran, ({ many }) => ({
	tujuanPembelajaran: many(tableTujuanPembelajaran)
}));

export const tableTujuanPembelajaranRelations = relations(tableTujuanPembelajaran, ({ one }) => ({
	mataPelajaran: one(tableMataPelajaran, {
		fields: [tableTujuanPembelajaran.mataPelajaranId],
		references: [tableMataPelajaran.id]
	})
}));
