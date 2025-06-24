interface Alamat {
	jalan: string;
	desa: string;
	kecamatan: string;
	kabupaten: string;
	provinsi: string;
	kodePos: string;
}

interface Sekolah {
	id: 1; // always 1 for now
	jenjangPendidikan: string;
	nama: string;
	npsn: string;
	alamat: Alamat;
	logo?: Blob;
	logoURL?: string;
	website?: string;
	email: string;
	kepalaSekolah: {
		nama: string;
		nip: string;
	};
}

interface Kelas {
	id: number;
	nama: string;
	fase: string;
	semester: 'Genap' | 'Ganjil';
	tahunAjaran: string;
	waliKelas: {
		nama: string;
		nip: string;
	};
}

interface Murid {
	nis: string;
	nisn: string;
	kelas: Kelas;
	kelasId: Kelas['id'];
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
