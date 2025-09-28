type DBTransaction = Parameters<
	Parameters<typeof import('$lib/server/db/index').default.transaction>['0']
>[0];

type Alamat = typeof import('$lib/server/db/schema').tableAlamat.$inferSelect;

type Pegawai = typeof import('$lib/server/db/schema').tablePegawai.$inferSelect;

type Sekolah = typeof import('$lib/server/db/schema').tableSekolah.$inferSelect & {
	alamat: Alamat;
	kepalaSekolah: Pegawai;
	tahunAjaran?: TahunAjaran[];
};

type TahunAjaran = typeof import('$lib/server/db/schema').tableTahunAjaran.$inferSelect & {
	sekolah: Sekolah;
	semester: Semester[];
};

type Semester = typeof import('$lib/server/db/schema').tableSemester.$inferSelect & {
	tahunAjaran: TahunAjaran;
};

type Kelas = typeof import('$lib/server/db/schema').tableKelas.$inferSelect & {
	sekolah: Sekolah;
	tahunAjaran?: TahunAjaran | null;
	semester?: Semester | null;
	waliKelas: Pegawai;
};

type WaliMurid = typeof import('$lib/server/db/schema').tableWaliMurid.$inferSelect;

type Murid = typeof import('$lib/server/db/schema').tableMurid.$inferSelect & {
	alamat: Alamat;
	ibu: WaliMurid;
	ayah: WaliMurid;
	wali: WaliMurid;
};

type MataPelajaran = typeof import('$lib/server/db/schema').tableMataPelajaran.$inferSelect & {
	tujuanPembelajaran: TujuanPembelajaran[];
};

type TujuanPembelajaran =
	typeof import('$lib/server/db/schema').tableTujuanPembelajaran.$inferSelect & {
		mataPelajaran: MataPelajaran;
	};

type Ekstrakurikuler = typeof import('$lib/server/db/schema').tableEkstrakurikuler.$inferSelect;
