import type { PageLoad } from './$types';

export const load = (async () => {
	const biodata: BiodataPrintData = {
		sekolah: {
			nama: 'SD Negeri 19 Periji'
		},
		murid: {
			nama: 'Yohana Sarah Simaremare',
			nis: '0074',
			nisn: '3125283683',
			tempatLahir: 'Rising Jaya',
			tanggalLahir: '20 November 2012',
			jenisKelamin: 'Perempuan',
			agama: 'Kristen',
			pendidikanSebelumnya: 'PAUD Tunas Pertiwi',
			alamat: {
				jalan: 'Periji',
				kelurahan: 'Periji',
				kecamatan: 'Noyan',
				kabupaten: 'Sanggau',
				provinsi: 'Kalimantan Barat'
			}
		},
		orangTua: {
			ayah: {
				nama: 'Cipto Simaremare',
				pekerjaan: 'Karyawan BUMN'
			},
			ibu: {
				nama: 'Fortunata Ayyu Winda',
				pekerjaan: 'Ibu Rumah Tangga'
			},
			alamat: {
				jalan: 'Periji',
				kelurahan: 'Periji',
				kecamatan: 'Noyan',
				kabupaten: 'Sanggau',
				provinsi: 'Kalimantan Barat'
			}
		},
		wali: {
			nama: '—',
			pekerjaan: '—',
			alamat: '—'
		},
		ttd: {
			tempat: 'Periji',
			tanggal: '17 Juli 2019',
			kepalaSekolah: 'Johar, A.Ma.Pd.',
			nip: '19631212 198606 1 006'
		}
	};

	return {
		meta: {
			title: `Biodata Murid - ${biodata.murid.nama}`
		},
		biodataData: biodata
	};
}) satisfies PageLoad;
