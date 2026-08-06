export const statusKepegawaianOptions = [
	'CPNS',
	'PNS',
	'PPPK',
	'Honor Pemda',
	'Honorer Sekolah'
] as const;

export type StatusKepegawaian = (typeof statusKepegawaianOptions)[number];

const golonganCpnsPns = [
	'II/d',
	'III/a',
	'III/b',
	'III/c',
	'III/d',
	'IV/a',
	'IV/b',
	'IV/c',
	'IV/d',
	'IV/e'
] as const;

export const golonganByStatus: Record<string, readonly string[]> = {
	CPNS: golonganCpnsPns,
	PNS: golonganCpnsPns,
	PPPK: ['IX'],
	'Honor Pemda': ['-'],
	'Honorer Sekolah': ['-']
};

export const jabatanByGolongan: Record<string, readonly string[]> = {
	IX: ['Ahli Pertama'],
	'II/d': ['Guru'],
	'III/a': ['Guru Pertama'],
	'III/b': ['Guru Pertama'],
	'III/c': ['Guru Muda'],
	'III/d': ['Guru Muda'],
	'IV/a': ['Guru Madya'],
	'IV/b': ['Guru Madya'],
	'IV/c': ['Guru Madya'],
	'IV/d': ['Guru Utama'],
	'IV/e': ['Guru Utama'],
	'-': ['-']
};

export const pangkatByGolongan: Record<string, string> = {
	'II/d': 'Pengatur Tingkat I',
	'III/a': 'Penata Muda',
	'III/b': 'Penata Muda Tingkat I',
	'III/c': 'Penata',
	'III/d': 'Penata Tingkat I',
	'IV/a': 'Pembina',
	'IV/b': 'Pembina Tingkat I',
	'IV/c': 'Pembina Utama Muda',
	'IV/d': 'Pembina Utama Madya',
	'IV/e': 'Pembina Utama'
};

export function resolveProfileFields(input: {
	statusKepegawaian: string;
	golongan: string;
	jabatan: string;
}): {
	statusKepegawaian: StatusKepegawaian | null;
	golongan: string | null;
	jabatan: string | null;
	pangkat: string | null;
} {
	const rawStatus = input.statusKepegawaian.trim();
	const status = (statusKepegawaianOptions as readonly string[]).includes(rawStatus)
		? (rawStatus as StatusKepegawaian)
		: null;

	let golongan: string | null = null;
	if (status) {
		const allowedGolongan = golonganByStatus[status] ?? [];
		const candidate = input.golongan.trim();
		golongan = allowedGolongan.includes(candidate) ? candidate : (allowedGolongan[0] ?? null);
	}

	let jabatan: string | null = null;
	if (golongan) {
		const options = jabatanByGolongan[golongan] ?? [];
		jabatan = options.includes(input.jabatan.trim()) ? input.jabatan.trim() : (options[0] ?? null);
	}

	// Pangkat diturunkan otomatis dari golongan (data yang dipakai di SPPD).
	const pangkat: string | null = golongan ? (pangkatByGolongan[golongan] ?? null) : null;

	return { statusKepegawaian: status, golongan, jabatan, pangkat };
}
