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

type MaybePromise<T> = T | Promise<T>;

type FormSubmitEvent = SubmitEvent & { currentTarget: EventTarget & HTMLFormElement };

type OptId<T, ID = number> = Omit<T, 'id'> & { id?: ID };
