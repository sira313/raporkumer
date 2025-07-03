type Alamat = typeof import('$lib/server/db/schema').tableAlamat.$inferSelect;

type Pegawai = typeof import('$lib/server/db/schema').tablePegawai.$inferSelect;

type Sekolah = typeof import('$lib/server/db/schema').tableSekolah.$inferSelect & {
	alamat: Alamat;
	kepalaSekolah: Pegawai;
};
