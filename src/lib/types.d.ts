interface MenuItem {
	title: string;
	path?: string;
	icon?: IconName;
	tags?: string[];
	subMenu?: MenuItem[];
}

interface PageMeta {
	title?: string;
	description?: string;
	logoUrl?: string;
}

interface CoverPrintData {
	sekolah: {
		nama: string;
		jenjang: 'sd' | 'smp' | 'sma';
		npsn: string;
		alamat: {
			jalan: string;
			desa: string;
			kecamatan: string;
			kabupaten: string;
			provinsi?: string | null;
			kodePos?: string | null;
		};
		website?: string | null;
		email?: string | null;
		logoUrl?: string | null;
	};
	murid: {
		nama: string;
		nis?: string | null;
		nisn?: string | null;
	};
}

interface BiodataPrintData {
	sekolah: {
		nama: string;
	};
	murid: {
		nama: string;
		nis: string;
		nisn: string;
		tempatLahir: string;
		tanggalLahir: string;
		jenisKelamin: string;
		agama: string;
		pendidikanSebelumnya: string;
		alamat: {
			jalan: string;
			kelurahan: string;
			kecamatan: string;
			kabupaten: string;
			provinsi: string;
		};
	};
	orangTua: {
		ayah: {
			nama: string;
			pekerjaan: string;
		};
		ibu: {
			nama: string;
			pekerjaan: string;
		};
		alamat: {
			jalan: string;
			kelurahan: string;
			kecamatan: string;
			kabupaten: string;
			provinsi: string;
		};
	};
	wali: {
		nama: string;
		pekerjaan: string;
		alamat: string;
	};
	ttd: {
		tempat: string;
		tanggal: string;
		kepalaSekolah: string;
		nip: string;
	};
}

interface RaporPrintData {
	sekolah: {
		nama: string;
		alamat: string;
		logoUrl?: string | null;
	};
	murid: {
		nama: string;
		nis: string;
		nisn: string;
	};
	rombel: {
		nama: string;
		fase: string;
	};
	periode: {
		tahunPelajaran: string;
		semester: string;
	};
	waliKelas: {
		nama: string;
		nip?: string | null;
	};
	kepalaSekolah: {
		nama: string;
		nip?: string | null;
	};
	nilaiIntrakurikuler: Array<{
		kelompok?: string | null;
		mataPelajaran: string;
		nilaiAkhir: string;
		deskripsi: string;
	}>;
	kokurikuler: string;
	ekstrakurikuler: Array<{
		nama: string;
		deskripsi: string;
	}>;
	ketidakhadiran: {
		sakit: number;
		izin: number;
		tanpaKeterangan: number;
	};
	catatanWali: string;
	tanggapanOrangTua: string;
	ttd: {
		tempat: string;
		tanggal: string;
	};
}

interface PiagamPrintData {
	sekolah: {
		nama: string;
		jenjang: 'sd' | 'smp' | 'sma';
		npsn: string;
		alamat: {
			jalan: string;
			desa: string;
			kecamatan: string;
			kabupaten: string;
			provinsi?: string | null;
			kodePos?: string | null;
		};
		website?: string | null;
		email?: string | null;
		logoUrl?: string | null;
	};
	murid: {
		nama: string;
	};
	penghargaan: {
		rataRata: number | null;
		rataRataFormatted: string;
		ranking: number | null;
		rankingLabel: string;
		judul: string;
		subjudul: string;
		motivasi: string;
	};
	periode: {
		semester: string;
		tahunAjaran: string;
	};
	ttd: {
		tempat: string;
		tanggal: string;
		kepalaSekolah: {
			nama: string;
			nip?: string | null;
		};
		waliKelas: {
			nama: string;
			nip?: string | null;
		};
	};
}

type MaybePromise<T> = T | Promise<T>;

type FormSubmitEvent = SubmitEvent & { currentTarget: EventTarget & HTMLFormElement };

type OptId<T, ID = number> = Omit<T, 'id'> & { id?: ID };
