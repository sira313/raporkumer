// Varian / jenjang sederajat — daftar institusi yang setara untuk setiap jenjang
export const jenjangPendidikanSederajat: Record<
	'sd' | 'smp' | 'sma' | 'slb' | 'pkbm',
	{ key: string; label: string }[]
> = {
	sd: [
		{ key: 'sd', label: 'Sekolah Dasar (SD)' },
		{ key: 'mi', label: 'Madrasah Ibtidaiyah (MI)' }
	],
	smp: [
		{ key: 'smp', label: 'Sekolah Menengah Pertama (SMP)' },
		{ key: 'mts', label: 'Madrasah Tsanawiyah (MTs)' }
	],
	sma: [
		{ key: 'sma', label: 'Sekolah Menengah Atas (SMA)' },
		{ key: 'smk', label: 'Sekolah Menengah Kejuruan (SMK)' },
		{ key: 'ma', label: 'Madrasah Aliyah (MA)' },
		{ key: 'mak', label: 'Madrasah Aliyah Kejuruan (MAK)' }
	],
	slb: [{ key: 'slb', label: 'Sekolah Luar Biasa (SLB)' }],
	pkbm: [{ key: 'pkbm', label: 'Pusat Kegiatan Belajar Masyarakat (PKBM)' }]
};

export const nauganOptions = [
	{ key: 'kemendikbud', label: 'Kementerian Pendidikan Dasar dan Menengah' },
	{ key: 'kemsos', label: 'Kementerian Sosial Republik Indonesia' },
	{ key: 'kemenag', label: 'Kementerian Agama Republik Indonesia' }
] as const;

export type NauganKey = (typeof nauganOptions)[number]['key'];

export const nauganLabelByKey = nauganOptions.reduce<Record<NauganKey, string>>(
	(acc, option) => {
		acc[option.key] = option.label;
		return acc;
	},
	{} as Record<NauganKey, string>
);

export const nauganHeaderByKey: Record<NauganKey, [string, string]> = {
	kemendikbud: ['KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH', 'REPUBLIK INDONESIA'],
	kemsos: ['KEMENTERIAN SOSIAL', 'REPUBLIK INDONESIA'],
	kemenag: ['KEMENTERIAN AGAMA', 'REPUBLIK INDONESIA']
};

export const jenisKelamin: Record<Murid['jenisKelamin'], string> = {
	L: 'Laki-laki',
	P: 'Perempuan'
};

export const jenisMapel: Record<MataPelajaran['jenis'], string> = {
	wajib: 'Mata Pelajaran wajib',
	pilihan: 'Mata Pelajaran pilihan',
	mulok: 'Muatan Lokal'
};

export const agamaMapelOptions = [
	{ key: 'umum', label: 'Umum', name: 'Pendidikan Agama dan Budi Pekerti' },
	{ key: 'islam', label: 'Islam', name: 'Pendidikan Agama Islam dan Budi Pekerti' },
	{ key: 'kristen', label: 'Kristen', name: 'Pendidikan Agama Kristen dan Budi Pekerti' },
	{ key: 'katolik', label: 'Katolik', name: 'Pendidikan Agama Katolik dan Budi Pekerti' },
	{ key: 'buddha', label: 'Buddha', name: 'Pendidikan Agama Buddha dan Budi Pekerti' },
	{ key: 'hindu', label: 'Hindu', name: 'Pendidikan Agama Hindu dan Budi Pekerti' },
	{ key: 'konghuchu', label: 'Konghuchu', name: 'Pendidikan Agama Konghuchu dan Budi Pekerti' }
] as const;

export type AgamaMapelKey = (typeof agamaMapelOptions)[number]['key'];

export const agamaParentOption = agamaMapelOptions[0];
export const agamaVariantOptions = agamaMapelOptions.filter((option) => option.key !== 'umum');
export const agamaParentName = agamaParentOption.name;
export const agamaVariantNames = agamaVariantOptions.map((option) => option.name);

export const agamaMapelNames = agamaMapelOptions.map((option) => option.name);

export const agamaMapelLabelByName = agamaMapelOptions.reduce<Record<string, string>>(
	(acc, option) => {
		acc[option.name] = option.label;
		return acc;
	},
	{}
);

export const agamaMapelKeyByName = agamaMapelOptions.reduce<Record<string, AgamaMapelKey>>(
	(acc, option) => {
		acc[option.name] = option.key;
		return acc;
	},
	{}
);

export const profilPelajarPancasilaDimensions = [
	{
		key: 'ketakwaan',
		label: 'Keimanan dan Ketakwaan kepada Tuhan Yang Maha Esa'
	},
	{ key: 'kewargaan', label: 'Kewargaan' },
	{ key: 'penalaran-kritis', label: 'Penalaran kritis' },
	{ key: 'kreativitas', label: 'Kreativitas' },
	{ key: 'kolaborasi', label: 'Kolaborasi' },
	{ key: 'kemandirian', label: 'Kemandirian' },
	{ key: 'kesehatan', label: 'Kesehatan' },
	{ key: 'komunikasi', label: 'Komunikasi' }
] as const;

export type DimensiProfilLulusanKey = (typeof profilPelajarPancasilaDimensions)[number]['key'];

export const profilPelajarPancasilaDimensionLabelByKey = profilPelajarPancasilaDimensions.reduce<
	Record<DimensiProfilLulusanKey, string>
>(
	(acc, dim) => {
		acc[dim.key] = dim.label;
		return acc;
	},
	{} as Record<DimensiProfilLulusanKey, string>
);
