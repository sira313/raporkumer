import db from '$lib/server/db';
import { resolveSekolahAcademicContext } from '$lib/server/db/academic';
import {
	tableAlamat,
	tableEkstrakurikuler,
	tableEkstrakurikulerTujuan,
	tableKelas,
	tableKokurikuler,
	tableMataPelajaran,
	tableMurid,
	tablePegawai,
	tableSemester,
	tableSekolah,
	tableTahunAjaran,
	tableTujuanPembelajaran,
	tableWaliMurid
} from '$lib/server/db/schema.js';
import { fail } from '@sveltejs/kit';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

export async function load({ depends, locals }) {
	depends('app:kelas');
	const sekolahId = locals.sekolah?.id ?? null;

	let academicContext = null;
	let daftarKelas: (typeof tableKelas.$inferSelect & {
		waliKelas: (typeof tablePegawai.$inferSelect) | null;
		semester?: (typeof tableSemester.$inferSelect) | null;
		tahunAjaran?: (typeof tableTahunAjaran.$inferSelect) | null;
	})[] = [];

	if (sekolahId) {
		academicContext = await resolveSekolahAcademicContext(sekolahId);
		const whereClause = academicContext.activeSemesterId
			? and(eq(tableKelas.sekolahId, sekolahId), eq(tableKelas.semesterId, academicContext.activeSemesterId))
			: eq(tableKelas.sekolahId, sekolahId);

		daftarKelas = await db.query.tableKelas.findMany({
			where: whereClause,
			with: { waliKelas: true, semester: true, tahunAjaran: true },
			orderBy: [asc(tableKelas.nama)]
		});
	}

	const kelasIds = daftarKelas.map((item) => item.id);

	if (kelasIds.length === 0) {
		return { daftarKelas: [], academicContext };
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

	return { daftarKelas: kelasList, academicContext };
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
			columns: { id: true, waliKelasId: true }
		});

		if (!kelas) {
			return fail(404, { fail: 'Kelas tidak ditemukan.' });
		}

		const forceDelete = formData.get('forceDelete') === 'true';
	const hasWaliPegawai = Boolean(kelas.waliKelasId);

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
			totalMurid > 0 ||
			totalMapel > 0 ||
			totalEkstrak > 0 ||
			totalKokurikuler > 0 ||
			hasWaliPegawai;

		const dependencyList: string[] = [];
		if (totalMurid > 0) dependencyList.push(`${totalMurid} murid`);
		if (totalMapel > 0) dependencyList.push(`${totalMapel} mata pelajaran`);
		if (totalEkstrak > 0) dependencyList.push(`${totalEkstrak} ekstrakurikuler`);
		if (totalKokurikuler > 0) dependencyList.push(`${totalKokurikuler} kokurikuler`);
		if (hasWaliPegawai) dependencyList.push('wali kelas yang terhubung');
		const dependencyText = dependencyList.join(', ');

		if (!forceDelete && masihAdaRelasi) {
			return fail(400, {
				fail:
					`Kelas masih memiliki ${dependencyText}. Centang opsi "Hapus semua data kelas beserta isinya" untuk melanjutkan.`
			});
		}

		try {
			await db.transaction(async (tx) => {
				const muridDetails = await tx
					.select({
						alamatId: tableMurid.alamatId,
						ibuId: tableMurid.ibuId,
						ayahId: tableMurid.ayahId,
						waliId: tableMurid.waliId
					})
					.from(tableMurid)
					.where(eq(tableMurid.kelasId, kelasIdNumber));

				const alamatIds = new Set<number>();
				const waliMuridIds = new Set<number>();
				for (const row of muridDetails) {
					if (row.alamatId) {
						alamatIds.add(row.alamatId);
					}
					if (row.ibuId) {
						waliMuridIds.add(row.ibuId);
					}
					if (row.ayahId) {
						waliMuridIds.add(row.ayahId);
					}
					if (row.waliId) {
						waliMuridIds.add(row.waliId);
					}
				}

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

				const waliIdsArray = Array.from(waliMuridIds);
				if (waliIdsArray.length) {
					const stillReferencedParents = new Set<number>();
					const ibuRefs = await tx
						.selectDistinct({ id: tableMurid.ibuId })
						.from(tableMurid)
						.where(inArray(tableMurid.ibuId, waliIdsArray));
					for (const row of ibuRefs) {
						if (row.id) stillReferencedParents.add(row.id);
					}
					const ayahRefs = await tx
						.selectDistinct({ id: tableMurid.ayahId })
						.from(tableMurid)
						.where(inArray(tableMurid.ayahId, waliIdsArray));
					for (const row of ayahRefs) {
						if (row.id) stillReferencedParents.add(row.id);
					}
					const waliRefs = await tx
						.selectDistinct({ id: tableMurid.waliId })
						.from(tableMurid)
						.where(inArray(tableMurid.waliId, waliIdsArray));
					for (const row of waliRefs) {
						if (row.id) stillReferencedParents.add(row.id);
					}
					const parentIdsToDelete = waliIdsArray.filter((id) => !stillReferencedParents.has(id));
					if (parentIdsToDelete.length) {
						await tx
							.delete(tableWaliMurid)
							.where(inArray(tableWaliMurid.id, parentIdsToDelete));
					}
				}

				if (kelas.waliKelasId) {
					const pegawaiCandidate = kelas.waliKelasId;
					const pegawaiStillUsed = new Set<number>();
					const kepalaRefs = await tx
						.selectDistinct({ id: tableSekolah.kepalaSekolahId })
						.from(tableSekolah)
						.where(inArray(tableSekolah.kepalaSekolahId, [pegawaiCandidate]));
					for (const row of kepalaRefs) {
						if (row.id) pegawaiStillUsed.add(row.id);
					}
					const waliRefs = await tx
						.selectDistinct({ id: tableKelas.waliKelasId })
						.from(tableKelas)
						.where(inArray(tableKelas.waliKelasId, [pegawaiCandidate]));
					for (const row of waliRefs) {
						if (row.id) pegawaiStillUsed.add(row.id);
					}
					if (!pegawaiStillUsed.has(pegawaiCandidate)) {
						await tx.delete(tablePegawai).where(eq(tablePegawai.id, pegawaiCandidate));
					}
				}

				const alamatIdsArray = Array.from(alamatIds);
				if (alamatIdsArray.length) {
					const alamatStillDigunakan = new Set<number>();
					const sekolahAlamatRefs = await tx
						.selectDistinct({ alamatId: tableSekolah.alamatId })
						.from(tableSekolah)
						.where(inArray(tableSekolah.alamatId, alamatIdsArray));
					for (const row of sekolahAlamatRefs) {
						if (row.alamatId) alamatStillDigunakan.add(row.alamatId);
					}
					const muridAlamatRefs = await tx
						.selectDistinct({ alamatId: tableMurid.alamatId })
						.from(tableMurid)
						.where(inArray(tableMurid.alamatId, alamatIdsArray));
					for (const row of muridAlamatRefs) {
						if (row.alamatId) alamatStillDigunakan.add(row.alamatId);
					}
					const alamatToDelete = alamatIdsArray.filter((id) => !alamatStillDigunakan.has(id));
					if (alamatToDelete.length) {
						await tx.delete(tableAlamat).where(inArray(tableAlamat.id, alamatToDelete));
					}
				}
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
