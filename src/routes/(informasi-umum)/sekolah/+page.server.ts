import db from '$lib/server/db';
import {
	tableEkstrakurikuler,
	tableEkstrakurikulerTujuan,
	tableKelas,
	tableKokurikuler,
	tableMataPelajaran,
	tableMurid,
	tableSekolah,
	tableTasks,
	tableTahunAjaran,
	tableTujuanPembelajaran
} from '$lib/server/db/schema';
import { fail } from '@sveltejs/kit';
import { desc, eq, inArray, sql } from 'drizzle-orm';
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
			columns: { id: true, alamatId: true }
		});

		if (!sekolah) {
			return fail(404, { fail: 'Sekolah tidak ditemukan.' });
		}

		const forceDelete = formData.get('forceDelete') === 'true';

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

		if (!forceDelete && (rombelMasihAda || muridMasihAda)) {
			const message = `Sekolah masih memiliki ${totalRombel ?? 0} rombel dan ${
				totalMurid ?? 0
			} murid. Centang opsi "Hapus semua data sekolah beserta isinya" untuk menghapus permanen.`;
			return fail(400, { fail: message });
		}

		try {
			await db.transaction(async (tx) => {
				const kelasRows = await tx
					.select({ id: tableKelas.id })
					.from(tableKelas)
					.where(eq(tableKelas.sekolahId, sekolahId));
				const kelasIds = kelasRows.map((row) => row.id);

				if (kelasIds.length) {
					const mapelRows = await tx
						.select({ id: tableMataPelajaran.id })
						.from(tableMataPelajaran)
						.where(inArray(tableMataPelajaran.kelasId, kelasIds));
					const mapelIds = mapelRows.map((row) => row.id);

					if (mapelIds.length) {
						await tx
							.delete(tableTujuanPembelajaran)
							.where(inArray(tableTujuanPembelajaran.mataPelajaranId, mapelIds));
						await tx.delete(tableMataPelajaran).where(inArray(tableMataPelajaran.id, mapelIds));
					}

					const ekstrakRows = await tx
						.select({ id: tableEkstrakurikuler.id })
						.from(tableEkstrakurikuler)
						.where(inArray(tableEkstrakurikuler.kelasId, kelasIds));
					const ekstrakIds = ekstrakRows.map((row) => row.id);

					if (ekstrakIds.length) {
						await tx
							.delete(tableEkstrakurikulerTujuan)
							.where(inArray(tableEkstrakurikulerTujuan.ekstrakurikulerId, ekstrakIds));
						await tx.delete(tableEkstrakurikuler).where(inArray(tableEkstrakurikuler.id, ekstrakIds));
					}

					const kokurikulerRows = await tx
						.select({ id: tableKokurikuler.id })
						.from(tableKokurikuler)
						.where(inArray(tableKokurikuler.kelasId, kelasIds));
					const kokurikulerIds = kokurikulerRows.map((row) => row.id);

					if (kokurikulerIds.length) {
						await tx.delete(tableKokurikuler).where(inArray(tableKokurikuler.id, kokurikulerIds));
					}
				}

				await tx.delete(tableTasks).where(eq(tableTasks.sekolahId, sekolahId));
				await tx.delete(tableMurid).where(eq(tableMurid.sekolahId, sekolahId));
				await tx.delete(tableKelas).where(eq(tableKelas.sekolahId, sekolahId));
				await tx.delete(tableTahunAjaran).where(eq(tableTahunAjaran.sekolahId, sekolahId));
				await tx.delete(tableSekolah).where(eq(tableSekolah.id, sekolahId));
			});
		} catch (error) {
			console.error('Gagal menghapus sekolah', error);
			return fail(400, {
				fail: 'Gagal menghapus sekolah. Pastikan tidak ada data terkait yang masih tersisa.'
			});
		}

		return {
			message: forceDelete
				? 'Sekolah beserta seluruh data terkait berhasil dihapus.'
				: 'Sekolah berhasil dihapus.'
		};
	}
};
