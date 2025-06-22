interface Alamat {
	jalan: string;
	desa: string;
	kecamatan: string;
	kabupaten: string;
	provinsi: string;
	kodePos: string;
}

interface Sekolah {
	id: 1; // always 1
	jenjangPendidikan: string;
	nama: string;
	npsn: string;
	alamat: Alamat;
	logo?: Blob;
	logoURL?: string;
	website?: string;
	email: string;
}

interface Murid {
	nis: string;
	nisn: string;
	nama: string;
	tempatLahir: string;
	tanggalLahir: string;
	jenisKelamin: 'Laki-laki' | 'Perempuan';
	agama: string;
	alamat: Alamat;
	orangTua: {
		namaAyah: string;
		namaIbu: string;
		pekerjaanAyah: string;
		pekerjaanIbu: string;
		kontak: string;
	};
	wali: {
		nama: string;
		pekerjaan: string;
		alamat: string;
		kontak: string;
	};
}
