import type { PageLoad } from './$types';

export const load = (async () => {
	const rapor: RaporPrintData = {
		sekolah: {
			nama: 'SD Negeri 19 Periji',
			alamat: 'Jl. Pendidikan No. 12, Desa Periji, Kec. Noyan, Kab. Sanggau, Kalimantan Barat'
		},
		murid: {
			nama: 'Yohana Sarah Simaremare',
			nis: '0074',
			nisn: '3125283683'
		},
		rombel: {
			nama: 'IV A',
			fase: 'B'
		},
		periode: {
			tahunPelajaran: '2024/2025',
			semester: '1'
		},
		waliKelas: {
			nama: 'Maria Yosefa, S.Pd.',
			nip: '19800912 200901 2 001'
		},
		kepalaSekolah: {
			nama: 'Johar, A.Ma.Pd.',
			nip: '19631212 198606 1 006'
		},
		nilaiIntrakurikuler: [
			{
				kelompok: 'Muatan Lokal',
				mataPelajaran: 'Pendidikan Agama dan Budi Pekerti',
				nilaiAkhir: '88',
				deskripsi:
					'Mampu mengenal huruf hijaiyah dan melafalkan doa-doa harian dengan lafal yang tepat. Perlu pendampingan menjaga konsistensi hafalan surat pendek.'
			},
			{
				kelompok: 'Kewarganegaraan',
				mataPelajaran: 'Pendidikan Pancasila',
				nilaiAkhir: '86',
				deskripsi:
					'Aktif berdiskusi mengenai simbol-simbol negara dan menunjukkan sikap gotong-royong saat kegiatan kelas.'
			},
			{
				kelompok: 'Bahasa',
				mataPelajaran: 'Bahasa Indonesia',
				nilaiAkhir: '84',
				deskripsi:
					'Membaca lancar, mampu menyusun teks narasi sederhana, dan meningkatkan ketepatan tanda baca dalam menulis.'
			},
			{
				kelompok: 'Matematika',
				mataPelajaran: 'Matematika',
				nilaiAkhir: '82',
				deskripsi:
					'Menguasai operasi pecahan dan menerapkan strategi berbeda saat memecahkan masalah kontekstual.'
			},
			{
				kelompok: 'IPA',
				mataPelajaran: 'Ilmu Pengetahuan Alam dan Sosial',
				nilaiAkhir: '87',
				deskripsi:
					'Menunjukkan rasa ingin tahu tinggi ketika melakukan percobaan dan mampu menjelaskan hasil pengamatan lisan.'
			},
			{
				kelompok: 'Seni Budaya',
				mataPelajaran: 'Seni Budaya dan Prakarya',
				nilaiAkhir: '89',
				deskripsi:
					'Kreatif membuat karya kriya dari bahan alam dan percaya diri mempresentasikan hasilnya di depan kelas.'
			},
			{
				kelompok: 'PJOK',
				mataPelajaran: 'Pendidikan Jasmani, Olahraga, dan Kesehatan',
				nilaiAkhir: '85',
				deskripsi:
					'Memiliki kebugaran baik, disiplin mengikuti instruksi permainan, dan menjaga sportivitas bersama teman.'
			}
		],
		kokurikuler:
			'Ananda menunjukkan kemajuan dalam penalaran kritis serta konsisten melibatkan diri pada diskusi kelompok tentang kepedulian lingkungan.',
		ekstrakurikuler: [
			{
				nama: 'Pramuka',
				deskripsi: 'Baik, aktif mengikuti latihan dan memahami tugas regu saat penjelajahan.'
			},
			{
				nama: 'Paduan Suara',
				deskripsi: 'Sangat baik, berani mengambil part vokal utama dan menjaga kekompakan tim.'
			}
		],
		ketidakhadiran: {
			sakit: 2,
			izin: 1,
			tanpaKeterangan: 0
		},
		catatanWali:
			'Yohana sangat antusias mengikuti pembelajaran berbasis projek. Terus latih kepercayaan diri saat presentasi agar semakin mantap.',
		tanggapanOrangTua: '',
		ttd: {
			tempat: 'Periji',
			tanggal: '15 Desember 2024'
		}
	};

	return {
		meta: {
			title: `Rapor - ${rapor.murid.nama}`
		},
		raporData: rapor
	};
}) satisfies PageLoad;
