import db from '$lib/server/db';
import { resolveSekolahAcademicContext } from '$lib/server/db/academic';
import { tableKelas, tablePegawai, tableSemester, tableTahunAjaran } from '$lib/server/db/schema.js';
import { unflattenFormData } from '$lib/utils.js';
import { error, fail } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';

type TingkatOption = { fase: string; label: string };

const tingkatOptionsByJenjang: Record<'sd' | 'smp' | 'sma', TingkatOption[]> = {
	sd: [
		{ fase: 'Fase A', label: 'Fase A' },
		{ fase: 'Fase B', label: 'Fase B' },
		{ fase: 'Fase C', label: 'Fase C' }
	],
	smp: [{ fase: 'Fase D', label: 'Fase D' }],
	sma: [
		{ fase: 'Fase E', label: 'Fase E' },
		{ fase: 'Fase F', label: 'Fase F' }
	]
};

type KelasFormInput = {
	rombel?: string;
	fase?: string;
	tahunAjaranId?: string;
	semesterId?: string;
	waliKelas?: Partial<Pick<Pegawai, 'nama' | 'nip'>>;
};

export async function load({ params, locals }) {
	const meta: PageMeta = { title: 'Form Kelas' };
	const jenjang = locals.sekolah?.jenjangPendidikan as keyof typeof tingkatOptionsByJenjang | undefined;
	const tingkatOptions = jenjang ? tingkatOptionsByJenjang[jenjang] : [];

	if (!locals.sekolah?.id) error(400, `Sekolah aktif tidak ditemukan`);

	const sekolahId = locals.sekolah.id;
	const academicContext = await resolveSekolahAcademicContext(sekolahId);
	const tahunAjaranOptions = academicContext.tahunAjaranList.map((item) => ({
		id: item.id,
		nama: item.nama,
		isAktif: item.isAktif,
		semester: item.semester
	}));

	const findSemesterFallback = (tahunId: number | null | undefined) => {
		if (!tahunId) return null;
		const tahun = tahunAjaranOptions.find((option) => option.id === tahunId);
		if (!tahun) return null;
		const kandidat =
			tahun.semester.find((item) => item.isAktif) ??
			tahun.semester.find((item) => item.tipe === 'ganjil') ??
			tahun.semester[0] ??
			null;
		return kandidat?.id ?? null;
	};

	let kelas = null as (typeof tableKelas.$inferSelect & {
		waliKelas: Pegawai | null;
		semester?: typeof tableSemester.$inferSelect | null;
		tahunAjaran?: typeof tableTahunAjaran.$inferSelect | null;
	}) | null;

	if (params?.id) {
		const kelasRow = await db.query.tableKelas.findFirst({
			where: and(eq(tableKelas.id, +params.id), eq(tableKelas.sekolahId, sekolahId)),
			with: { waliKelas: true, semester: true, tahunAjaran: true }
		});
		if (!kelasRow) error(404, `Data kelas tidak ditemukan`);
		kelas = kelasRow;
	}

	const defaultTahunAjaranId =
		kelas?.tahunAjaranId ??
		academicContext.activeTahunAjaranId ??
		tahunAjaranOptions.find((item) => item.isAktif)?.id ??
		tahunAjaranOptions[0]?.id ??
		null;

	const defaultSemesterId =
		kelas?.semesterId ??
		academicContext.activeSemesterId ??
		findSemesterFallback(defaultTahunAjaranId);

	const formInit: Record<string, unknown> = {
		rombel: kelas?.nama ?? '',
		fase: kelas?.fase ?? '',
		tahunAjaranId: defaultTahunAjaranId ? String(defaultTahunAjaranId) : '',
		semesterId: defaultSemesterId ? String(defaultSemesterId) : ''
	};
	if (kelas?.waliKelas) {
		formInit.waliKelas = {
			nama: kelas.waliKelas.nama,
			nip: kelas.waliKelas.nip
		};
	}

	return { meta, tingkatOptions, kelas, tahunAjaranOptions, formInit };
}

export const actions = {
	async save({ request, params, locals }) {
		if (!locals.sekolah?.id) error(400, `Sekolah aktif tidak ditemukan`);

		const formData = unflattenFormData<KelasFormInput>(await request.formData());
		const rombel = formData.rombel?.trim();
		const fase = formData.fase?.trim() || null;
		const tahunAjaranIdRaw = formData.tahunAjaranId?.trim() || '';
		const semesterIdRaw = formData.semesterId?.trim() || '';
		const waliNama = formData.waliKelas?.nama?.trim() || '';
		const waliNip = formData.waliKelas?.nip?.trim() || '';

		if (!rombel) {
			return fail(400, { fail: `Nama rombel wajib diisi.` });
		}

		const tahunAjaranId = Number(tahunAjaranIdRaw);
		if (!Number.isInteger(tahunAjaranId) || tahunAjaranId <= 0) {
			return fail(400, { fail: `Tahun ajaran wajib dipilih.` });
		}

		const semesterId = Number(semesterIdRaw);
		if (!Number.isInteger(semesterId) || semesterId <= 0) {
			return fail(400, { fail: `Semester wajib dipilih.` });
		}

		if ((waliNama && !waliNip) || (!waliNama && waliNip)) {
			return fail(400, {
				fail: `Lengkapi Nama dan NIP wali kelas atau kosongkan keduanya.`
			});
		}

		const hasWali = Boolean(waliNama && waliNip);

		const timestamp = new Date().toISOString();
		const sekolahId = locals.sekolah.id;

		const semester = await db.query.tableSemester.findFirst({
			where: and(eq(tableSemester.id, semesterId), eq(tableSemester.tahunAjaranId, tahunAjaranId)),
			with: { tahunAjaran: true }
		});

		if (!semester || semester.tahunAjaran.sekolahId !== sekolahId) {
			return fail(400, { fail: `Semester tidak valid untuk sekolah aktif.` });
		}

		await db.transaction(async (tx) => {
			if (params.id) {
				const kelas = await tx.query.tableKelas.findFirst({
					columns: {
						id: true,
						waliKelasId: true
					},
					where: and(eq(tableKelas.id, +params.id), eq(tableKelas.sekolahId, sekolahId))
				});
				if (!kelas) error(404, `Data kelas tidak ditemukan`);

				let waliKelasId = kelas.waliKelasId ?? null;

				if (hasWali) {
					if (waliKelasId) {
						await tx
							.update(tablePegawai)
							.set({ nama: waliNama, nip: waliNip, updatedAt: timestamp })
							.where(eq(tablePegawai.id, waliKelasId));
					} else {
						const [pegawai] = await tx
							.insert(tablePegawai)
							.values({ nama: waliNama, nip: waliNip, updatedAt: timestamp })
							.returning({ id: tablePegawai.id });
						waliKelasId = pegawai?.id ?? null;
					}
				} else {
					waliKelasId = null;
				}

				await tx
					.update(tableKelas)
					.set({
						nama: rombel,
						fase,
						sekolahId,
						waliKelasId,
						tahunAjaranId,
						semesterId,
						updatedAt: timestamp
					})
					.where(eq(tableKelas.id, kelas.id));
			} else {
				let waliKelasId: number | null = null;
				if (hasWali) {
					const [pegawai] = await tx
						.insert(tablePegawai)
						.values({ nama: waliNama, nip: waliNip, updatedAt: timestamp })
						.returning({ id: tablePegawai.id });
					waliKelasId = pegawai?.id ?? null;
				}

				await tx.insert(tableKelas).values({
					nama: rombel,
					fase,
					sekolahId,
				tahunAjaranId,
				semesterId,
					waliKelasId,
					updatedAt: timestamp
				});
			}
		});
		return { message: `Data kelas berhasil disimpan` };
	}
};
