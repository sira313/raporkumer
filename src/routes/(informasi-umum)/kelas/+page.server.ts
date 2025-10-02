import db from '$lib/server/db';
import {
	tableEkstrakurikuler,
	tableEkstrakurikulerTujuan,
	tableKelas,
	tableKokurikuler,
	tableMataPelajaran,
	tableMurid,
	tableTujuanPembelajaran
} from '$lib/server/db/schema.js';
import { fail } from '@sveltejs/kit';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

export async function load({ depends, locals }) {
	depends('app:kelas');
	const sekolahId = locals.sekolah?.id || 0;
	const daftarKelas = await db.query.tableKelas.findMany({
		where: eq(tableKelas.sekolahId, sekolahId),
		with: { waliKelas: true },
		orderBy: [asc(tableKelas.nama)]
	});

	const kelasIds = daftarKelas.map((item) => item.id);

	if (kelasIds.length === 0) {
		return { daftarKelas: [] };
	}

	const [muridCounts, mapelCounts, ekstrakCounts, kokurikulerCounts] = await Promise.all([
		db
			.select({ kelasId: tableMurid.kelasId, total: sql<number>`count(*)` })
			.from(tableMurid)
			.where(inArray(tableMurid.kelasId, kelasIds))
			.groupBy(tableMurid.kelasId),
		db
			.select({ kelasId: tableMataPelajaran.kelasId, total: sql<number>`count(*)` })
			.from(tableMataPelajaran)
			.where(inArray(tableMataPelajaran.kelasId, kelasIds))
			.groupBy(tableMataPelajaran.kelasId),
		db
			.select({ kelasId: tableEkstrakurikuler.kelasId, total: sql<number>`count(*)` })
			.from(tableEkstrakurikuler)
			.where(inArray(tableEkstrakurikuler.kelasId, kelasIds))
			.groupBy(tableEkstrakurikuler.kelasId),
		db
			.select({ kelasId: tableKokurikuler.kelasId, total: sql<number>`count(*)` })
			.from(tableKokurikuler)
			.where(inArray(tableKokurikuler.kelasId, kelasIds))
			.groupBy(tableKokurikuler.kelasId)
	]);

	const muridMap = new Map<number, number>();
	for (const row of muridCounts) {
		muridMap.set(row.kelasId, row.total ?? 0);
	}

	const mapelMap = new Map<number, number>();
	for (const row of mapelCounts) {
		mapelMap.set(row.kelasId, row.total ?? 0);
	}

	const ekstrakMap = new Map<number, number>();
	for (const row of ekstrakCounts) {
		ekstrakMap.set(row.kelasId, row.total ?? 0);
	}

	const kokurikulerMap = new Map<number, number>();
	for (const row of kokurikulerCounts) {
		kokurikulerMap.set(row.kelasId, row.total ?? 0);
	}

	const kelasList = daftarKelas.map((kelas) => ({
		...kelas,
		jumlahMurid: muridMap.get(kelas.id) ?? 0,
		jumlahMapel: mapelMap.get(kelas.id) ?? 0,
		jumlahEkstrakurikuler: ekstrakMap.get(kelas.id) ?? 0,
		jumlahKokurikuler: kokurikulerMap.get(kelas.id) ?? 0
	}));

	return { daftarKelas: kelasList };
}

export const actions = {
	async delete({ request, locals }) {
		const formData = await request.formData();
		const kelasId = formData.get('id')?.toString();
		if (!kelasId) {
			return fail(400, { fail: `ID kelas kosong, hapus kelas gagal.` });
		}

		const kelasIdNumber = Number(kelasId);
		if (!Number.isInteger(kelasIdNumber) || kelasIdNumber <= 0) {
			return fail(400, { fail: 'Kelas tidak valid.' });
		}

		const sekolahId = locals.sekolah?.id;
		if (!sekolahId) {
			return fail(403, { fail: 'Pilih sekolah aktif sebelum menghapus kelas.' });
		}

		const kelas = await db.query.tableKelas.findFirst({
			where: and(eq(tableKelas.id, kelasIdNumber), eq(tableKelas.sekolahId, sekolahId)),
			columns: { id: true }
		});

		if (!kelas) {
			return fail(404, { fail: 'Kelas tidak ditemukan.' });
		}

		const forceDelete = formData.get('forceDelete') === 'true';

		const [muridRows, mapelRows, ekstrakRows, kokurikulerRows] = await Promise.all([
			db
				.select({ total: sql<number>`count(*)` })
				.from(tableMurid)
				.where(eq(tableMurid.kelasId, kelasIdNumber)),
			db
				.select({ total: sql<number>`count(*)` })
				.from(tableMataPelajaran)
				.where(eq(tableMataPelajaran.kelasId, kelasIdNumber)),
			db
				.select({ total: sql<number>`count(*)` })
				.from(tableEkstrakurikuler)
				.where(eq(tableEkstrakurikuler.kelasId, kelasIdNumber)),
			db
				.select({ total: sql<number>`count(*)` })
				.from(tableKokurikuler)
				.where(eq(tableKokurikuler.kelasId, kelasIdNumber))
		]);

		const totalMurid = muridRows[0]?.total ?? 0;
		const totalMapel = mapelRows[0]?.total ?? 0;
		const totalEkstrak = ekstrakRows[0]?.total ?? 0;
		const totalKokurikuler = kokurikulerRows[0]?.total ?? 0;

		const masihAdaRelasi =
			totalMurid > 0 || totalMapel > 0 || totalEkstrak > 0 || totalKokurikuler > 0;

		if (!forceDelete && masihAdaRelasi) {
			return fail(400, {
				fail:
					`Kelas masih memiliki ${totalMurid} murid, ${totalMapel} mata pelajaran, ${totalEkstrak} ekstrakurikuler, dan ${totalKokurikuler} kokurikuler. Centang opsi "Hapus semua data kelas beserta isinya" untuk melanjutkan.`
			});
		}

		try {
			await db.transaction(async (tx) => {
				const mataPelajaranIds = await tx
					.select({ id: tableMataPelajaran.id })
					.from(tableMataPelajaran)
					.where(eq(tableMataPelajaran.kelasId, kelasIdNumber));
				const mapelIds = mataPelajaranIds.map((row) => row.id);

				if (mapelIds.length) {
					await tx
						.delete(tableTujuanPembelajaran)
						.where(inArray(tableTujuanPembelajaran.mataPelajaranId, mapelIds));
					await tx
						.delete(tableMataPelajaran)
						.where(inArray(tableMataPelajaran.id, mapelIds));
				}

				const ekstrakIdsRows = await tx
					.select({ id: tableEkstrakurikuler.id })
					.from(tableEkstrakurikuler)
					.where(eq(tableEkstrakurikuler.kelasId, kelasIdNumber));
				const ekstrakIds = ekstrakIdsRows.map((row) => row.id);

				if (ekstrakIds.length) {
					await tx
						.delete(tableEkstrakurikulerTujuan)
						.where(inArray(tableEkstrakurikulerTujuan.ekstrakurikulerId, ekstrakIds));
					await tx
						.delete(tableEkstrakurikuler)
						.where(inArray(tableEkstrakurikuler.id, ekstrakIds));
				}

				await tx.delete(tableKokurikuler).where(eq(tableKokurikuler.kelasId, kelasIdNumber));
				await tx.delete(tableMurid).where(eq(tableMurid.kelasId, kelasIdNumber));
				await tx.delete(tableKelas).where(eq(tableKelas.id, kelasIdNumber));
			});
		} catch (error) {
			console.error('Gagal menghapus kelas', error);
			return fail(400, {
				fail: 'Gagal menghapus kelas. Pastikan tidak ada data terkait yang tersisa.'
			});
		}

		return {
			message: forceDelete
				? 'Kelas dan seluruh data terkait berhasil dihapus.'
				: 'Kelas berhasil dihapus.'
		};
	}
};
