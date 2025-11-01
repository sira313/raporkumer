import { relations } from 'drizzle-orm';
import { blob, index, int, real, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

const audit = {
	createdAt: text()
		.$defaultFn(() => new Date().toISOString())
		.notNull(),
	updatedAt: text()
};

export const tableAuthUser = sqliteTable(
	'auth_user',
	{
		id: int().primaryKey({ autoIncrement: true }),
		username: text().notNull(),
		usernameNormalized: text().notNull(),
		passwordHash: text().notNull(),
		passwordSalt: text().notNull(),
		passwordUpdatedAt: text(),
		permissions: text({ mode: 'json' }).notNull().default('[]').$type<UserPermission[]>(),
		// tipe user: admin (penuh), wali_kelas (terbatas ke kelas_id), atau user (default/other)
		type: text({ enum: ['admin', 'wali_kelas', 'user'] })
			.notNull()
			.default('admin'),
		// optional: directly associate a user to a sekolah so login can pick it reliably
		sekolahId: int().references(() => tableSekolah.id),
		// referensi opsional ke pegawai (nama wali kelas disimpan di tablePegawai)
		pegawaiId: int().references(() => tablePegawai.id),
		// untuk wali_kelas kita bisa menyimpan kelas_id yang diijinkan
		kelasId: int().references(() => tableKelas.id),
		// untuk akun tipe 'user' kita simpan pilihan mata pelajaran yang diassign saat pembuatan akun
		mataPelajaranId: int().references(() => tableMataPelajaran.id),
		...audit
	},
	(table) => [unique().on(table.usernameNormalized)]
);

export const tableAuthSession = sqliteTable(
	'auth_session',
	{
		id: int().primaryKey({ autoIncrement: true }),
		userId: int()
			.references(() => tableAuthUser.id, { onDelete: 'cascade' })
			.notNull(),
		tokenHash: text().notNull(),
		userAgent: text(),
		ipAddress: text(),
		expiresAt: text().notNull(),
		...audit
	},
	(table) => [unique().on(table.tokenHash), index('auth_session_user_id_idx').on(table.userId)]
);

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
	// optional variant (e.g. mi, mts, smk, ma, mak, slb-dasar) stored as text
	jenjangVariant: text(),
	nama: text().notNull(),
	npsn: text().notNull(),
	alamatId: int()
		.references(() => tableAlamat.id)
		.notNull(),
	logo: blob().$type<Uint8Array>(),
	logoType: text(),
	logoDinas: blob().$type<Uint8Array>(),
	logoDinasType: text(),
	website: text(),
	email: text().notNull(),
	kepalaSekolahId: int()
		.references(() => tablePegawai.id)
		.notNull(),
	lokasiTandaTangan: text(),
	...audit
});

export const tableFeatureUnlock = sqliteTable(
	'feature_unlock',
	{
		id: int().primaryKey({ autoIncrement: true }),
		sekolahId: int()
			.references(() => tableSekolah.id, { onDelete: 'cascade' })
			.notNull(),
		featureKey: text().notNull(),
		unlockedAt: text()
			.$defaultFn(() => new Date().toISOString())
			.notNull(),
		...audit
	},
	(table) => [unique().on(table.sekolahId, table.featureKey)]
);

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

export const tableTasks = sqliteTable('tasks', {
	id: int().primaryKey({ autoIncrement: true }),
	sekolahId: int()
		.references(() => tableSekolah.id, { onDelete: 'cascade' })
		.notNull(),
	kelasId: int().references(() => tableKelas.id, { onDelete: 'cascade' }),
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
	tasks: many(tableTasks),
	featureUnlocks: many(tableFeatureUnlock)
}));

export const tableFeatureUnlockRelations = relations(tableFeatureUnlock, ({ one }) => ({
	sekolah: one(tableSekolah, {
		fields: [tableFeatureUnlock.sekolahId],
		references: [tableSekolah.id]
	})
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
	}),
	kelas: one(tableKelas, {
		fields: [tableTasks.kelasId],
		references: [tableKelas.id]
	})
}));

export const tableAuthUserRelations = relations(tableAuthUser, ({ many, one }) => ({
	sessions: many(tableAuthSession),
	// optional relation to pegawai (teacher/staff)
	pegawai: one(tablePegawai, { fields: [tableAuthUser.pegawaiId], references: [tablePegawai.id] }),
	// optional relation to kelas (for wali_kelas users)
	kelas: one(tableKelas, { fields: [tableAuthUser.kelasId], references: [tableKelas.id] }),
	// optional relation to a preferred mata pelajaran for 'user' accounts
	mataPelajaran: one(tableMataPelajaran, {
		fields: [tableAuthUser.mataPelajaranId],
		references: [tableMataPelajaran.id]
	}),
	// optional relation to a sekolah (when user was created for a specific sekolah)
	sekolah: one(tableSekolah, {
		fields: [tableAuthUser.sekolahId],
		references: [tableSekolah.id]
	})
}));

export const tableAuthSessionRelations = relations(tableAuthSession, ({ one }) => ({
	user: one(tableAuthUser, {
		fields: [tableAuthSession.userId],
		references: [tableAuthUser.id]
	})
}));

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

export const tableCatatanWaliKelas = sqliteTable(
	'catatan_wali_kelas',
	{
		id: int().primaryKey({ autoIncrement: true }),
		muridId: int()
			.references(() => tableMurid.id, { onDelete: 'cascade' })
			.notNull(),
		catatan: text(),
		...audit
	},
	(table) => [unique().on(table.muridId), index('catatan_wali_kelas_murid_idx').on(table.muridId)]
);

export const tableKehadiranMurid = sqliteTable(
	'kehadiran_murid',
	{
		id: int().primaryKey({ autoIncrement: true }),
		muridId: int()
			.references(() => tableMurid.id, { onDelete: 'cascade' })
			.notNull(),
		sakit: int().default(0).notNull(),
		izin: int().default(0).notNull(),
		alfa: int().default(0).notNull(),
		...audit
	},
	(table) => [unique().on(table.muridId), index('kehadiran_murid_murid_idx').on(table.muridId)]
);

export const tableMuridRelations = relations(tableMurid, ({ one }) => ({
	kelas: one(tableKelas, { fields: [tableMurid.kelasId], references: [tableKelas.id] }),
	semester: one(tableSemester, { fields: [tableMurid.semesterId], references: [tableSemester.id] }),
	alamat: one(tableAlamat, { fields: [tableMurid.alamatId], references: [tableAlamat.id] }),
	ibu: one(tableWaliMurid, { fields: [tableMurid.ibuId], references: [tableWaliMurid.id] }),
	ayah: one(tableWaliMurid, { fields: [tableMurid.ayahId], references: [tableWaliMurid.id] }),
	wali: one(tableWaliMurid, { fields: [tableMurid.waliId], references: [tableWaliMurid.id] }),
	kehadiran: one(tableKehadiranMurid, {
		fields: [tableMurid.id],
		references: [tableKehadiranMurid.muridId]
	}),
	catatanWali: one(tableCatatanWaliKelas, {
		fields: [tableMurid.id],
		references: [tableCatatanWaliKelas.muridId]
	})
}));

export const tableCatatanWaliKelasRelations = relations(tableCatatanWaliKelas, ({ one }) => ({
	murid: one(tableMurid, {
		fields: [tableCatatanWaliKelas.muridId],
		references: [tableMurid.id]
	})
}));

export const tableKehadiranMuridRelations = relations(tableKehadiranMurid, ({ one }) => ({
	murid: one(tableMurid, {
		fields: [tableKehadiranMurid.muridId],
		references: [tableMurid.id]
	})
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

export const tableAsesmenSumatif = sqliteTable(
	'asesmen_sumatif',
	{
		id: int().primaryKey({ autoIncrement: true }),
		muridId: int()
			.references(() => tableMurid.id, { onDelete: 'cascade' })
			.notNull(),
		mataPelajaranId: int()
			.references(() => tableMataPelajaran.id, { onDelete: 'cascade' })
			.notNull(),
		naLingkup: real(),
		sasTes: real(),
		sasNonTes: real(),
		sas: real(),
		nilaiAkhir: real(),
		...audit
	},
	(table) => [
		unique().on(table.muridId, table.mataPelajaranId),
		index('asesmen_sumatif_murid_idx').on(table.muridId),
		index('asesmen_sumatif_mapel_idx').on(table.mataPelajaranId)
	]
);

export const tableAsesmenSumatifTujuan = sqliteTable(
	'asesmen_sumatif_tujuan',
	{
		id: int().primaryKey({ autoIncrement: true }),
		muridId: int()
			.references(() => tableMurid.id, { onDelete: 'cascade' })
			.notNull(),
		mataPelajaranId: int()
			.references(() => tableMataPelajaran.id, { onDelete: 'cascade' })
			.notNull(),
		tujuanPembelajaranId: int()
			.references(() => tableTujuanPembelajaran.id, { onDelete: 'cascade' })
			.notNull(),
		nilai: real(),
		...audit
	},
	(table) => [
		unique().on(table.muridId, table.tujuanPembelajaranId),
		index('asesmen_sumatif_tujuan_murid_idx').on(table.muridId),
		index('asesmen_sumatif_tujuan_mapel_idx').on(table.mataPelajaranId),
		index('asesmen_sumatif_tujuan_tp_idx').on(table.tujuanPembelajaranId)
	]
);

export const tableAsesmenFormatif = sqliteTable(
	'asesmen_formatif',
	{
		id: int().primaryKey({ autoIncrement: true }),
		muridId: int()
			.references(() => tableMurid.id, { onDelete: 'cascade' })
			.notNull(),
		mataPelajaranId: int()
			.references(() => tableMataPelajaran.id, { onDelete: 'cascade' })
			.notNull(),
		tujuanPembelajaranId: int()
			.references(() => tableTujuanPembelajaran.id, { onDelete: 'cascade' })
			.notNull(),
		tuntas: int({ mode: 'boolean' }).default(false).notNull(),
		catatan: text(),
		dinilaiPada: text(),
		...audit
	},
	(table) => [unique().on(table.muridId, table.tujuanPembelajaranId)]
);

export const tableMataPelajaranRelations = relations(tableMataPelajaran, ({ one, many }) => ({
	tujuanPembelajaran: many(tableTujuanPembelajaran),
	asesmenFormatif: many(tableAsesmenFormatif),
	asesmenSumatif: many(tableAsesmenSumatif),
	asesmenSumatifTujuan: many(tableAsesmenSumatifTujuan),
	kelas: one(tableKelas, { fields: [tableMataPelajaran.kelasId], references: [tableKelas.id] })
}));

export const tableTujuanPembelajaranRelations = relations(tableTujuanPembelajaran, ({ one }) => ({
	mataPelajaran: one(tableMataPelajaran, {
		fields: [tableTujuanPembelajaran.mataPelajaranId],
		references: [tableMataPelajaran.id]
	})
}));

export const tableAsesmenFormatifRelations = relations(tableAsesmenFormatif, ({ one }) => ({
	murid: one(tableMurid, {
		fields: [tableAsesmenFormatif.muridId],
		references: [tableMurid.id]
	}),
	mataPelajaran: one(tableMataPelajaran, {
		fields: [tableAsesmenFormatif.mataPelajaranId],
		references: [tableMataPelajaran.id]
	}),
	tujuanPembelajaran: one(tableTujuanPembelajaran, {
		fields: [tableAsesmenFormatif.tujuanPembelajaranId],
		references: [tableTujuanPembelajaran.id]
	})
}));

export const tableAsesmenSumatifRelations = relations(tableAsesmenSumatif, ({ one }) => ({
	murid: one(tableMurid, {
		fields: [tableAsesmenSumatif.muridId],
		references: [tableMurid.id]
	}),
	mataPelajaran: one(tableMataPelajaran, {
		fields: [tableAsesmenSumatif.mataPelajaranId],
		references: [tableMataPelajaran.id]
	})
}));

export const tableAsesmenSumatifTujuanRelations = relations(
	tableAsesmenSumatifTujuan,
	({ one }) => ({
		murid: one(tableMurid, {
			fields: [tableAsesmenSumatifTujuan.muridId],
			references: [tableMurid.id]
		}),
		mataPelajaran: one(tableMataPelajaran, {
			fields: [tableAsesmenSumatifTujuan.mataPelajaranId],
			references: [tableMataPelajaran.id]
		}),
		tujuanPembelajaran: one(tableTujuanPembelajaran, {
			fields: [tableAsesmenSumatifTujuan.tujuanPembelajaranId],
			references: [tableTujuanPembelajaran.id]
		})
	})
);

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

export const tableAsesmenEkstrakurikuler = sqliteTable(
	'asesmen_ekstrakurikuler',
	{
		id: int().primaryKey({ autoIncrement: true }),
		muridId: int()
			.references(() => tableMurid.id, { onDelete: 'cascade' })
			.notNull(),
		ekstrakurikulerId: int()
			.references(() => tableEkstrakurikuler.id, { onDelete: 'cascade' })
			.notNull(),
		tujuanId: int()
			.references(() => tableEkstrakurikulerTujuan.id, { onDelete: 'cascade' })
			.notNull(),
		kategori: text({ enum: ['sangat-baik', 'baik', 'cukup', 'perlu-bimbingan'] }).notNull(),
		dinilaiPada: text(),
		...audit
	},
	(table) => [
		unique().on(table.muridId, table.ekstrakurikulerId, table.tujuanId),
		index('asesmen_ekstrakurikuler_murid_idx').on(table.muridId),
		index('asesmen_ekstrakurikuler_ekstrak_idx').on(table.ekstrakurikulerId),
		index('asesmen_ekstrakurikuler_tujuan_idx').on(table.tujuanId)
	]
);

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
	tujuan: many(tableEkstrakurikulerTujuan),
	asesmen: many(tableAsesmenEkstrakurikuler)
}));

export const tableEkstrakurikulerTujuanRelations = relations(
	tableEkstrakurikulerTujuan,
	({ one, many }) => ({
		ekstrakurikuler: one(tableEkstrakurikuler, {
			fields: [tableEkstrakurikulerTujuan.ekstrakurikulerId],
			references: [tableEkstrakurikuler.id]
		}),
		asesmen: many(tableAsesmenEkstrakurikuler)
	})
);

export const tableAsesmenEkstrakurikulerRelations = relations(
	tableAsesmenEkstrakurikuler,
	({ one }) => ({
		murid: one(tableMurid, {
			fields: [tableAsesmenEkstrakurikuler.muridId],
			references: [tableMurid.id]
		}),
		ekstrakurikuler: one(tableEkstrakurikuler, {
			fields: [tableAsesmenEkstrakurikuler.ekstrakurikulerId],
			references: [tableEkstrakurikuler.id]
		}),
		tujuan: one(tableEkstrakurikulerTujuan, {
			fields: [tableAsesmenEkstrakurikuler.tujuanId],
			references: [tableEkstrakurikulerTujuan.id]
		})
	})
);

export const tableKokurikulerRelations = relations(tableKokurikuler, ({ one }) => ({
	kelas: one(tableKelas, {
		fields: [tableKokurikuler.kelasId],
		references: [tableKelas.id]
	})
}));

export const tableAsesmenKokurikuler = sqliteTable(
	'asesmen_kokurikuler',
	{
		id: int().primaryKey({ autoIncrement: true }),
		muridId: int()
			.references(() => tableMurid.id, { onDelete: 'cascade' })
			.notNull(),
		kokurikulerId: int()
			.references(() => tableKokurikuler.id, { onDelete: 'cascade' })
			.notNull(),
		dimensi: text().notNull(),
		kategori: text({ enum: ['sangat-baik', 'baik', 'cukup', 'kurang'] }).notNull(),
		dinilaiPada: text(),
		...audit
	},
	(table) => [
		unique().on(table.muridId, table.kokurikulerId, table.dimensi),
		index('asesmen_kokurikuler_murid_idx').on(table.muridId),
		index('asesmen_kokurikuler_kokurikuler_idx').on(table.kokurikulerId)
	]
);

export const tableAsesmenKokurikulerRelations = relations(tableAsesmenKokurikuler, ({ one }) => ({
	murid: one(tableMurid, {
		fields: [tableAsesmenKokurikuler.muridId],
		references: [tableMurid.id]
	}),
	kokurikuler: one(tableKokurikuler, {
		fields: [tableAsesmenKokurikuler.kokurikulerId],
		references: [tableKokurikuler.id]
	})
}));
