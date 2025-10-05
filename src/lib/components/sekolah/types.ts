import type { tableAlamat, tablePegawai, tableSemester, tableSekolah } from '$lib/server/db/schema';

type SemesterRow = typeof tableSemester.$inferSelect;
type SekolahRow = typeof tableSekolah.$inferSelect;
type PegawaiRow = typeof tablePegawai.$inferSelect;
type AlamatRow = typeof tableAlamat.$inferSelect;

type ActiveTahunAjaran = {
	id: number;
	nama: string;
};

type ActiveSemester = {
	id: number;
	nama: string;
	tipe: SemesterRow['tipe'];
	tanggalBagiRaport: string | null;
};

export type SekolahCard = SekolahRow & {
	tahunAjaranAktif: ActiveTahunAjaran | null;
	semesterAktif: ActiveSemester | null;
	jumlahRombel: number;
	jumlahMurid: number;
	kepalaSekolah?: PegawaiRow | null;
	alamat?: AlamatRow | null;
};
