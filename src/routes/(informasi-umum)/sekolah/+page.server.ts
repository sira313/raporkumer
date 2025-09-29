import db from '$lib/server/db';
import { tableKelas, tableMurid, tableSekolah } from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import { desc, eq, sql } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('app:sekolah');

	const [kelasCounts, muridCounts] = await Promise.all([
		db
			.select({ sekolahId: tableKelas.sekolahId, total: sql<number>`count(*)` })
			.from(tableKelas)
			.groupBy(tableKelas.sekolahId),
		db
			.select({ sekolahId: tableMurid.sekolahId, total: sql<number>`count(*)` })
			.from(tableMurid)
			.groupBy(tableMurid.sekolahId)
	]);

	const kelasCountMap = new Map<number, number>();
	for (const row of kelasCounts) {
		kelasCountMap.set(row.sekolahId, row.total ?? 0);
	}

	const muridCountMap = new Map<number, number>();
	for (const row of muridCounts) {
		muridCountMap.set(row.sekolahId, row.total ?? 0);
	}

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
				: null,
			jumlahRombel: kelasCountMap.get(rest.id) ?? 0,
			jumlahMurid: muridCountMap.get(rest.id) ?? 0
		};
	});

	return {
		sekolahList,
		sekolah: locals.sekolah,
		meta: { title: 'Data Sekolah', logoUrl: '/sekolah/logo' }
	};
};

export const actions: Actions = {
	async delete({ request }) {
		const formData = await request.formData();
		const sekolahIdRaw = formData.get('sekolahId');
		const sekolahId = Number(sekolahIdRaw);

		if (!Number.isInteger(sekolahId) || sekolahId <= 0) {
			return fail(400, { fail: 'Sekolah tidak valid.' });
		}

		const sekolah = await db.query.tableSekolah.findFirst({
			where: eq(tableSekolah.id, sekolahId),
			columns: { id: true }
		});

		if (!sekolah) {
			return fail(404, { fail: 'Sekolah tidak ditemukan.' });
		}

		const [{ totalRombel }] = await db
			.select({ totalRombel: sql<number>`count(*)` })
			.from(tableKelas)
			.where(eq(tableKelas.sekolahId, sekolahId));

		const [{ totalMurid }] = await db
			.select({ totalMurid: sql<number>`count(*)` })
			.from(tableMurid)
			.where(eq(tableMurid.sekolahId, sekolahId));

		const rombelMasihAda = (totalRombel ?? 0) > 0;
		const muridMasihAda = (totalMurid ?? 0) > 0;

		if (rombelMasihAda || muridMasihAda) {
			const message = `Tidak bisa menghapus sekolah karena masih memiliki ${totalRombel ?? 0} rombel dan ${
				totalMurid ?? 0
			} murid. Hapus data rombel dan murid terlebih dahulu.`;
			return fail(400, { fail: message });
		}

		try {
			await db.delete(tableSekolah).where(eq(tableSekolah.id, sekolahId));
		} catch (error) {
			console.error('Gagal menghapus sekolah', error);
			return fail(400, {
				fail: 'Gagal menghapus sekolah. Pastikan tidak ada data terkait yang masih tersisa.'
			});
		}

		return { message: 'Sekolah berhasil dihapus.' };
	}
};
