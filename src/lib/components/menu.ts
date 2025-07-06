export const appMenuItems: MenuItem[] = [
	{
		title: 'Informasi Umum',
		icon: 'chart',
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
		icon: 'book',
		subMenu: [
			{
				title: 'Daftar Mata Pelajaran',
				path: '/mata-pelajaran',
				tags: ['tujuan pembelajaran', 'lingkup materi']
			},
			{
				title: 'Ekstrakurikuler',
				path: '/ekstrakurikuler'
			}
		]
	},
	{
		title: 'Input Nilai',
		icon: 'pen',
		subMenu: [
			{
				title: 'Kurikulum Merdeka',
				subMenu: [
					{
						title: 'Asesmen Formatif',
						path: '/asesmen-formatif',
						tags: ['nilai']
					},
					{
						title: 'Asesmen Sumatif',
						path: '/asesmen-sumatif',
						tags: ['nilai']
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
		icon: 'print',
		path: '/cetak'
	}
];
