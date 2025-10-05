import type { PageLoad } from './$types';

export const load = (async () => {
	const sekolah = {
		nama: 'SD NEGERI 19 PERIJI',
		logoUrl: '/tutwuri-bw.png'
	};

	const murid = {
		nama: 'MUHAMMAD ALI',
		nisn: '1234567890',
		nis: '0239'
	};

	return {
		meta: {
			title: `Cover Rapor - ${murid.nama}`
		},
		coverData: {
			sekolah,
			murid
		}
	};
}) satisfies PageLoad;
