import db from '$lib/server/db';
import { tableSekolah, tableSemester, tableTahunAjaran } from '$lib/server/db/schema';
import { cookieNames, unflattenFormData } from '$lib/utils';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

type TahunAjaranRow = typeof tableTahunAjaran.$inferSelect;
type SemesterRow = typeof tableSemester.$inferSelect;
type TanggalBagiRaportPayload = {
	ganjilId?: number;
	ganjil?: string | null;
	genapId?: number;
	genap?: string | null;
};

async function resolveSekolahAcademicContext(sekolahId: number) {
	const tahunAjaranList = await db.query.tableTahunAjaran.findMany({
		where: eq(tableTahunAjaran.sekolahId, sekolahId),
		orderBy: [desc(tableTahunAjaran.id)],
		with: {
			semester: true
		}
	});

	let activeTahunAjaranId: number | null = null;
	let activeSemesterId: number | null = null;
	let tanggalBagiRaport: TanggalBagiRaportPayload = {};

	const activeTahunAjaran =
		tahunAjaranList.find((item) => item.isAktif) ?? tahunAjaranList.at(0) ?? null;

	if (activeTahunAjaran) {
		activeTahunAjaranId = activeTahunAjaran.id;
		const activeSemester =
			activeTahunAjaran.semester.find((item) => item.isAktif) ??
			activeTahunAjaran.semester.at(0) ??
			null;
		activeSemesterId = activeSemester?.id ?? null;

		const ganjil = activeTahunAjaran.semester.find((item) => item.tipe === 'ganjil');
		const genap = activeTahunAjaran.semester.find((item) => item.tipe === 'genap');
		tanggalBagiRaport = {
			ganjilId: ganjil?.id,
			ganjil: ganjil?.tanggalBagiRaport ?? null,
			genapId: genap?.id,
			genap: genap?.tanggalBagiRaport ?? null
		};
	}

	return { tahunAjaranList, activeTahunAjaranId, activeSemesterId, tanggalBagiRaport };
}

export const load: PageServerLoad = async ({ locals }) => {
	const meta: PageMeta = {
		title: 'Data Rapor',
		description: 'Kelola sekolah aktif, tahun ajaran, semester, dan tanggal bagi rapor.'
	};

	const sekolahList = await db.query.tableSekolah.findMany({
		columns: { logo: false },
		orderBy: [desc(tableSekolah.id)]
	});

	const activeSekolahId = locals.sekolah?.id ?? null;
	let tahunAjaranList: Array<TahunAjaranRow & { semester: SemesterRow[] }> = [];
	let activeTahunAjaranId: number | null = null;
	let activeSemesterId: number | null = null;
	let tanggalBagiRaport: TanggalBagiRaportPayload = {};

	if (activeSekolahId) {
		({ tahunAjaranList, activeTahunAjaranId, activeSemesterId, tanggalBagiRaport } =
			await resolveSekolahAcademicContext(activeSekolahId));
	}

	return {
		meta,
		sekolahList,
		activeSekolahId,
		tahunAjaranList,
		activeTahunAjaranId,
		activeSemesterId,
		tanggalBagiRaport
	};
};

export const actions: Actions = {
	switch: async ({ request, cookies, locals }) => {
		const formData = await request.formData();
		const sekolahIdRaw = formData.get('sekolahId');

		const sekolahId = Number(sekolahIdRaw);
		if (!sekolahIdRaw || Number.isNaN(sekolahId)) {
			error(400, 'Identitas sekolah tidak valid');
		}

		const sekolah = await db.query.tableSekolah.findFirst({
			columns: { id: true },
			where: eq(tableSekolah.id, sekolahId)
		});

		if (!sekolah) {
			error(404, 'Data sekolah tidak ditemukan');
		}

		cookies.set(cookieNames.ACTIVE_SEKOLAH_ID, String(sekolah.id), { path: '/' });
		locals.sekolahDirty = true;

		const context = await resolveSekolahAcademicContext(sekolah.id);

		return {
			message: 'Sekolah aktif diperbarui',
			activeSekolahId: sekolah.id,
			...context
		};
	},
	save: async ({ request, locals }) => {
		const sekolahId = locals.sekolah?.id;
		if (!sekolahId) {
			return fail(400, { fail: 'Pilih sekolah terlebih dahulu' });
		}

		const formData = await request.formData();
		const tahunAjaranIdRaw = formData.get('tahunAjaranId');
		const semesterIdRaw = formData.get('semesterId');
		const tahunAjaranId = Number(tahunAjaranIdRaw);
		const semesterId = Number(semesterIdRaw);
		const hasSemester = Number.isFinite(semesterId) && semesterId > 0;
		const hasTahunAjaran = Number.isFinite(tahunAjaranId) && tahunAjaranId > 0;

		if (hasSemester) {
			const semester = await db.query.tableSemester.findFirst({
				where: eq(tableSemester.id, semesterId),
				with: { tahunAjaran: true }
			});

			if (!semester || semester.tahunAjaran.sekolahId !== sekolahId) {
				return fail(404, { fail: 'Data semester tidak ditemukan.' });
			}

			await db.transaction(async (tx) => {
				await tx
					.update(tableTahunAjaran)
					.set({ isAktif: false })
					.where(eq(tableTahunAjaran.sekolahId, sekolahId));
				await tx
					.update(tableTahunAjaran)
					.set({ isAktif: true })
					.where(eq(tableTahunAjaran.id, semester.tahunAjaranId));
				await tx
					.update(tableSemester)
					.set({ isAktif: false })
					.where(eq(tableSemester.tahunAjaranId, semester.tahunAjaranId));
				await tx
					.update(tableSemester)
					.set({ isAktif: true })
					.where(eq(tableSemester.id, semesterId));
			});
		} else if (hasTahunAjaran) {
			const tahunAjaran = await db.query.tableTahunAjaran.findFirst({
				where: and(
					eq(tableTahunAjaran.id, tahunAjaranId),
					eq(tableTahunAjaran.sekolahId, sekolahId)
				),
				with: { semester: true }
			});

			if (!tahunAjaran) {
				return fail(404, { fail: 'Data tahun ajaran tidak ditemukan.' });
			}

			await db.transaction(async (tx) => {
				await tx
					.update(tableTahunAjaran)
					.set({ isAktif: false })
					.where(eq(tableTahunAjaran.sekolahId, sekolahId));
				await tx
					.update(tableTahunAjaran)
					.set({ isAktif: true })
					.where(eq(tableTahunAjaran.id, tahunAjaranId));

				if (!tahunAjaran.semester.some((item) => item.isAktif)) {
					const ganjil = tahunAjaran.semester.find((item) => item.tipe === 'ganjil');
					if (ganjil) {
						await tx
							.update(tableSemester)
							.set({ isAktif: true })
							.where(eq(tableSemester.id, ganjil.id));
					}
				}
			});
		}

		const form = unflattenFormData<{
			ganjil?: { id?: string; tanggalBagiRaport?: string };
			genap?: { id?: string; tanggalBagiRaport?: string };
		}>(formData);

		const ids = [form.ganjil?.id, form.genap?.id]
			.map((value) => Number(value))
			.filter((value) => Number.isFinite(value) && value > 0) as number[];

		if (ids.length) {
			const semesterList = await db.query.tableSemester.findMany({
				where: inArray(tableSemester.id, ids),
				with: { tahunAjaran: true }
			});

			for (const semester of semesterList) {
				if (semester.tahunAjaran.sekolahId !== sekolahId) {
					return fail(403, { fail: 'Semester tidak sesuai dengan sekolah aktif' });
				}
			}

			await db.transaction(async (tx) => {
				for (const semester of semesterList) {
					const tipe = semester.tipe as 'ganjil' | 'genap';
					const tanggal = form[tipe]?.tanggalBagiRaport?.trim() || null;
					await tx
						.update(tableSemester)
						.set({ tanggalBagiRaport: tanggal })
						.where(eq(tableSemester.id, semester.id));
				}
			});
		}

		return { message: 'Pengaturan tersimpan' };
	},
	'set-tahun-ajaran': async ({ request, locals }) => {
		const sekolahId = locals.sekolah?.id;
		if (!sekolahId) {
			return fail(400, { fail: 'Pilih sekolah terlebih dahulu' });
		}

		const formData = await request.formData();
		const tahunAjaranId = Number(formData.get('tahunAjaranId'));
		if (!tahunAjaranId) {
			return fail(400, { fail: 'Tahun ajaran tidak valid' });
		}

		const tahunAjaran = await db.query.tableTahunAjaran.findFirst({
			where: and(eq(tableTahunAjaran.id, tahunAjaranId), eq(tableTahunAjaran.sekolahId, sekolahId)),
			with: { semester: true }
		});

		if (!tahunAjaran) {
			return fail(404, { fail: 'Data tahun ajaran tidak ditemukan' });
		}

		await db.transaction(async (tx) => {
			await tx
				.update(tableTahunAjaran)
				.set({ isAktif: false })
				.where(eq(tableTahunAjaran.sekolahId, sekolahId));
			await tx
				.update(tableTahunAjaran)
				.set({ isAktif: true })
				.where(eq(tableTahunAjaran.id, tahunAjaranId));

			if (!tahunAjaran.semester.some((item) => item.isAktif)) {
				const ganjil = tahunAjaran.semester.find((item) => item.tipe === 'ganjil');
				if (ganjil) {
					await tx
						.update(tableSemester)
						.set({ isAktif: true })
						.where(eq(tableSemester.id, ganjil.id));
				}
			}
		});

		return { message: 'Tahun ajaran aktif diperbarui' };
	},
	'set-semester': async ({ request, locals }) => {
		const sekolahId = locals.sekolah?.id;
		if (!sekolahId) {
			return fail(400, { fail: 'Pilih sekolah terlebih dahulu' });
		}

		const formData = await request.formData();
		const semesterId = Number(formData.get('semesterId'));
		if (!semesterId) {
			return fail(400, { fail: 'Semester tidak valid' });
		}

		const semester = await db.query.tableSemester.findFirst({
			where: eq(tableSemester.id, semesterId),
			with: {
				tahunAjaran: true
			}
		});

		if (!semester || semester.tahunAjaran.sekolahId !== sekolahId) {
			return fail(404, { fail: 'Data semester tidak ditemukan' });
		}

		await db.transaction(async (tx) => {
			await tx
				.update(tableTahunAjaran)
				.set({ isAktif: false })
				.where(eq(tableTahunAjaran.sekolahId, sekolahId));
			await tx
				.update(tableTahunAjaran)
				.set({ isAktif: true })
				.where(eq(tableTahunAjaran.id, semester.tahunAjaranId));
			await tx
				.update(tableSemester)
				.set({ isAktif: false })
				.where(eq(tableSemester.tahunAjaranId, semester.tahunAjaranId));
			await tx.update(tableSemester).set({ isAktif: true }).where(eq(tableSemester.id, semesterId));
		});

		return { message: 'Semester aktif diperbarui' };
	},
	'update-rapor': async ({ request, locals }) => {
		const sekolahId = locals.sekolah?.id;
		if (!sekolahId) {
			return fail(400, { fail: 'Pilih sekolah terlebih dahulu' });
		}

		const formData = await request.formData();
		const form = unflattenFormData<{
			ganjil?: { id?: string; tanggalBagiRaport?: string };
			genap?: { id?: string; tanggalBagiRaport?: string };
		}>(formData);

		const ids = [form.ganjil?.id, form.genap?.id]
			.map((value) => Number(value))
			.filter((value) => Number.isFinite(value)) as number[];

		if (!ids.length) {
			return fail(400, { fail: 'Tidak ada semester yang diperbarui' });
		}

		const semesterList = await db.query.tableSemester.findMany({
			where: inArray(tableSemester.id, ids),
			with: { tahunAjaran: true }
		});

		for (const semester of semesterList) {
			if (semester.tahunAjaran.sekolahId !== sekolahId) {
				return fail(403, { fail: 'Semester tidak sesuai dengan sekolah aktif' });
			}
		}

		await db.transaction(async (tx) => {
			for (const semester of semesterList) {
				const tipe = semester.tipe as 'ganjil' | 'genap';
				const tanggal = form[tipe]?.tanggalBagiRaport?.trim() || null;
				await tx
					.update(tableSemester)
					.set({ tanggalBagiRaport: tanggal })
					.where(eq(tableSemester.id, semester.id));
			}
		});

		return { message: 'Tanggal bagi rapor diperbarui' };
	}
};
