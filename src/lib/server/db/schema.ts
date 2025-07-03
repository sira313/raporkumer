import { relations } from 'drizzle-orm';
import { blob, int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const audit = {
	createdAt: text()
		.$defaultFn(() => new Date().toISOString())
		.notNull(),
	updatedAt: text()
};

export const tableAlamat = sqliteTable('alamat', {
	id: int().primaryKey({ autoIncrement: true }),
	jalan: text().notNull(),
	kecamatan: text().notNull(),
	kabupaten: text().notNull(),
	provinsi: text().notNull(),
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
	alamat: int()
		.references(() => tableAlamat.id)
		.notNull(),
	logo: blob(),
	website: text(),
	email: text().notNull(),
	kepalaSekolah: int()
		.references(() => tablePegawai.id)
		.notNull(),
	...audit
});

export const tableSekolahRelations = relations(tableSekolah, ({ one }) => ({
	alamat: one(tableAlamat),
	kepalaSekolah: one(tablePegawai)
}));

export const tableKelas = sqliteTable('kelas', {
	id: int().primaryKey({ autoIncrement: true }),
	sekolah: int()
		.references(() => tableSekolah.id)
		.notNull(),
	nama: text().notNull(),
	fase: text().notNull(),
	waliKelas: int()
		.references(() => tablePegawai.id)
		.notNull(),
	...audit
});

export const tableKelasRelations = relations(tableKelas, ({ one }) => ({
	sekolah: one(tableSekolah)
}));

export const tableWaliMurid = sqliteTable('wali_murid', {
	id: int().primaryKey({ autoIncrement: true }),
	nama: text().notNull(),
	pekerjaan: text().notNull(),
	kontak: text().notNull(),
	alamat: text().notNull(),
	...audit
});

export const tableMurid = sqliteTable('murid', {
	nis: text().primaryKey(),
	nisn: text().unique().notNull(),
	kelas: int()
		.references(() => tableKelas.id)
		.notNull(),
	nama: text().notNull(),
	tempatLahir: text().notNull(),
	tanggalLahir: text().notNull(),
	jenisKelamin: text({ enum: ['L', 'P'] }).notNull(),
	agama: text().notNull(),
	alamat: int()
		.references(() => tableAlamat.id)
		.notNull(),
	ibu: int().references(() => tableWaliMurid.id),
	ayah: int().references(() => tableWaliMurid.id),
	wali: int().references(() => tableWaliMurid.id),
	...audit
});

export const tableMuridRelations = relations(tableMurid, ({ one }) => ({
	alamat: one(tableAlamat),
	ibu: one(tableWaliMurid),
	ayah: one(tableWaliMurid),
	wali: one(tableWaliMurid)
}));
