export const appMenuItems: MenuItem[] = [
	{
		title: 'Informasi Umum',
		subMenu: [
			{
				title: 'Data Sekolah',
				path: '/sekolah'
			},
			{
				title: 'Data Kelas',
				path: '/kelas'
			},
			{
				title: 'Data Murid',
				path: '/murid'
			}
		]
	},
	{
		title: 'Mata Pelajaran',
		subMenu: [
			{
				title: 'Daftar Mata Pelajaran',
				path: '/mata-pelajaran'
			},
			{
				title: 'Ekstrakurikuler',
				path: '/ekstrakurikuler'
			}
		]
	},
	{
		title: 'Input Nilai',
		subMenu: [
			{
				title: 'Kurikulum Merdeka',
				subMenu: [
					{
						title: 'Tujuan Pembelajaran',
						path: '/tujuan-pembelajaran'
					},
					{
						title: 'Lingkup Materi',
						path: '/lingkup-materi'
					},
					{
						title: 'Asesmen Formatif',
						path: '/asesmen-formatif'
					},
					{
						title: 'Asesmen Sumatif',
						path: '/asesmen-sumatif'
					},
					{
						title: 'Nilai Akhir',
						path: '/nilai-akhir'
					}
				]
			},
			{
				title: 'Absen',
				path: '/absen'
			},
			{
				title: 'Nilai Ekstrakurikuler',
				path: '/nilai-ekstrakurikuler'
			}
		]
	},
	{
		title: 'Cetak Dokumen',
		subMenu: [
			{
				title: 'Cetak Rapor',
				path: '/cetak/rapor'
			},
			{
				title: 'Cetak Cover',
				path: '/cetak/cover'
			},
			{
				title: 'Cetak Biodata',
				path: '/cetak/biodata'
			}
		]
	}
];
