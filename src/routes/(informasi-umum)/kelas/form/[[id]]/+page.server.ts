import db from '$lib/server/db/index.js';
import { tableKelas, tablePegawai } from '$lib/server/db/schema.js';
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
	waliKelas?: Partial<Pick<Pegawai, 'nama' | 'nip'>>;
};

export async function load({ params, locals }) {
	const meta: PageMeta = { title: 'Form Kelas' };
	const jenjang = locals.sekolah?.jenjangPendidikan as keyof typeof tingkatOptionsByJenjang | undefined;
	const tingkatOptions = jenjang ? tingkatOptionsByJenjang[jenjang] : [];

	if (!params?.id) {
		return { meta, tingkatOptions };
	}

	if (!locals.sekolah?.id) error(400, `Sekolah aktif tidak ditemukan`);

	const kelas = await db.query.tableKelas.findFirst({
		where: and(eq(tableKelas.id, +params.id), eq(tableKelas.sekolahId, locals.sekolah.id)),
		with: { waliKelas: true }
	});
	if (!kelas) error(404, `Data kelas tidak ditemukan`);

	const formInit: Record<string, unknown> = {
		rombel: kelas.nama,
		fase: kelas.fase ?? ''
	};
	if (kelas.waliKelas) {
		formInit.waliKelas = {
			nama: kelas.waliKelas.nama,
			nip: kelas.waliKelas.nip
		};
	}

	return { kelas, meta, tingkatOptions, formInit };
}

export const actions = {
	async save({ request, params, locals }) {
		if (!locals.sekolah?.id) error(400, `Sekolah aktif tidak ditemukan`);

		const formData = unflattenFormData<KelasFormInput>(await request.formData());
		const rombel = formData.rombel?.trim();
		const fase = formData.fase?.trim() || null;
		const waliNama = formData.waliKelas?.nama?.trim() || '';
		const waliNip = formData.waliKelas?.nip?.trim() || '';

		if (!rombel) {
			return fail(400, { fail: `Nama rombel wajib diisi.` });
		}

		if ((waliNama && !waliNip) || (!waliNama && waliNip)) {
			return fail(400, {
				fail: `Lengkapi Nama dan NIP wali kelas atau kosongkan keduanya.`
			});
		}

		const hasWali = Boolean(waliNama && waliNip);

		const timestamp = new Date().toISOString();
		const sekolahId = locals.sekolah.id;

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
					.set({ nama: rombel, fase, sekolahId, waliKelasId, updatedAt: timestamp })
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
					waliKelasId,
					updatedAt: timestamp
				});
			}
		});
		return { message: `Data kelas berhasil disimpan` };
	}
};
