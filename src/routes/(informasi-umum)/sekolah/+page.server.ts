import db from '$lib/server/db';
import { tableSekolah } from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const sekolahRows = await db.query.tableSekolah.findMany({
		columns: { logo: false },
		with: {
			alamat: true,
			kepalaSekolah: true,
			tahunAjaran: { with: { semester: true } }
		},
		orderBy: [desc(tableSekolah.id)]
	});

	const sekolahList = sekolahRows.map(({ tahunAjaran, ...rest }) => {
		const activeTahunAjaran = tahunAjaran.find((item) => item.isAktif) ?? null;
		const activeSemester = activeTahunAjaran?.semester.find((item) => item.isAktif) ?? null;

		return {
			...rest,
			tahunAjaranAktif: activeTahunAjaran
				? {
						id: activeTahunAjaran.id,
						nama: activeTahunAjaran.nama
					}
				: null,
			semesterAktif: activeSemester
				? {
						id: activeSemester.id,
						nama: activeSemester.nama,
						tipe: activeSemester.tipe,
						tanggalBagiRaport: activeSemester.tanggalBagiRaport
					}
				: null
		};
	});

	return {
		sekolahList,
		sekolah: locals.sekolah,
		meta: { title: 'Data Sekolah', logoUrl: '/sekolah/logo' }
	};
};
