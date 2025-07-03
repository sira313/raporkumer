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
	sekolah: one(tableSekolah, { fields: [tableKelas.sekolah], references: [tableSekolah.id] })
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
	alamat: one(tableAlamat, { fields: [tableMurid.alamat], references: [tableAlamat.id] }),
	ibu: one(tableWaliMurid, { fields: [tableMurid.ibu], references: [tableWaliMurid.id] }),
	ayah: one(tableWaliMurid, { fields: [tableMurid.ayah], references: [tableWaliMurid.id] }),
	wali: one(tableWaliMurid, { fields: [tableMurid.wali], references: [tableWaliMurid.id] })
}));
