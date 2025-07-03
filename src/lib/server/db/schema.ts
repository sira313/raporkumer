import { blob, int, sqliteTable, text } from 'drizzle-orm/sqlite-core';

const audit = {
	createdAt: text()
		.$defaultFn(() => new Date().toISOString())
		.notNull(),
	updatedAt: text()
};

export const alamat = sqliteTable('alamat', {
	id: int().primaryKey({ autoIncrement: true }),
	jalan: text().notNull(),
	kecamatan: text().notNull(),
	kabupaten: text().notNull(),
	provinsi: text().notNull(),
	...audit
});

export const pegawai = sqliteTable('pegawai', {
	id: int().primaryKey({ autoIncrement: true }),
	nama: text().notNull(),
	nip: text().notNull(),
	...audit
});

export const sekolah = sqliteTable('sekolah', {
	id: int().primaryKey({ autoIncrement: true }),
	jenjangPendidikan: text({ enum: ['sd', 'smp', 'sma'] }).notNull(),
	nama: text().notNull(),
	npsn: text().notNull(),
	alamat: int()
		.references(() => alamat.id)
		.notNull(),
	logo: blob(),
	website: text(),
	email: text().notNull(),
	kepalaSekolah: int()
		.references(() => pegawai.id)
		.notNull(),
	...audit
});

export const kelas = sqliteTable('kelas', {
	id: int().primaryKey({ autoIncrement: true }),
	sekolah: int()
		.references(() => sekolah.id)
		.notNull(),
	nama: text().notNull(),
	fase: text().notNull(),
	waliKelas: int()
		.references(() => pegawai.id)
		.notNull(),
	...audit
});

export const waliMurid = sqliteTable('wali_murid', {
	id: int().primaryKey({ autoIncrement: true }),
	nama: text().notNull(),
	pekerjaan: text().notNull(),
	kontak: text().notNull(),
	alamat: text().notNull(),
	...audit
});

export const murid = sqliteTable('murid', {
	nis: text().primaryKey(),
	nisn: text().unique().notNull(),
	kelas: int()
		.references(() => kelas.id)
		.notNull(),
	nama: text().notNull(),
	tempatLahir: text().notNull(),
	tanggalLahir: text().notNull(),
	jenisKelamin: text({ enum: ['L', 'P'] }).notNull(),
	agama: text().notNull(),
	alamat: int()
		.references(() => alamat.id)
		.notNull(),
	ibu: int().references(() => waliMurid.id),
	ayah: int().references(() => waliMurid.id),
	wali: int().references(() => waliMurid.id),
	...audit
});
