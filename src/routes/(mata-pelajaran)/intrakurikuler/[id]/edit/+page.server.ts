import db from '$lib/server/db/index.js';
import { normMapelName } from '$lib/server/dapodik';
import { tableDapodikPembelajaran, tableMataPelajaran } from '$lib/server/db/schema.js';
import { agamaMapelNames, pksMapelNames } from '$lib/statics';
import { unflattenFormData } from '$lib/utils';
import { fail } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';

const AGAMA_MAPEL_NAME_SET = new Set<string>(agamaMapelNames);
const PKS_MAPEL_NAME_SET = new Set<string>(pksMapelNames);
const JENIS_VALUES = [
	'belum_dipetakan',
	'wajib',
	'pilihan',
	'mulok',
	'kejuruan',
	'pemberdayaan'
] as const;
function isValidJenis(value: string): value is (typeof JENIS_VALUES)[number] {
	return (JENIS_VALUES as readonly string[]).includes(value);
}

export async function load({ parent }) {
	const { mapel } = await parent();
	const indukList = await db
		.select({
			nama: tableDapodikPembelajaran.nama,
			pembelajaranId: tableDapodikPembelajaran.pembelajaranId
		})
		.from(tableDapodikPembelajaran)
		.where(eq(tableDapodikPembelajaran.kelasId, mapel.kelasId));
	return {
		meta: { title: `Edit Mata Pelajaran - ${mapel.nama}` },
		kelasAktif: mapel.kelas,
		indukList: indukList.sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
	};
}

export const actions = {
	async update({ params, request, locals }) {
		const id = Number(params.id);
		if (!Number.isInteger(id)) {
			return fail(400, { fail: 'Data mata pelajaran tidak valid.' });
		}

		const formMapel = unflattenFormData<{
			nama?: string;
			jenis?: string;
			kkm?: string;
			kode?: string;
			induk_pembelajaran_id?: string;
		}>(await request.formData());

		const sekolahId = locals.sekolah?.id;
		if (!sekolahId) {
			return fail(400, { fail: 'Pilih sekolah aktif terlebih dahulu.' });
		}

		const existing = await db.query.tableMataPelajaran.findFirst({
			where: eq(tableMataPelajaran.id, id),
			with: { kelas: true }
		});

		if (!existing || existing.kelas.sekolahId !== sekolahId) {
			return fail(404, { fail: 'Data mata pelajaran tidak ditemukan.' });
		}

		const kkmValue = formMapel.kkm ? Number(formMapel.kkm) : Number.NaN;
		const kode = formMapel.kode?.toString().trim() ?? '';
		if (Number.isNaN(kkmValue)) {
			return fail(400, { fail: 'KKM tidak valid.' });
		}

		const isAgamaGroup = AGAMA_MAPEL_NAME_SET.has(existing.nama);
		const isPksGroup = PKS_MAPEL_NAME_SET.has(existing.nama);
		const now = new Date().toISOString();
		const kkm = Math.max(0, Math.round(kkmValue));

		// Logika konsisten dengan modal Tambah: nama tidak terdaftar sebagai
		// pembelajaran Dapodik → Mata Pelajaran Induk wajib dipilih.
		const indukRows = await db
			.select({
				nama: tableDapodikPembelajaran.nama,
				pembelajaranId: tableDapodikPembelajaran.pembelajaranId
			})
			.from(tableDapodikPembelajaran)
			.where(eq(tableDapodikPembelajaran.kelasId, existing.kelasId));
		const terdaftarDiDapodik =
			indukRows.length > 0 &&
			indukRows.some(
				(r) => r.nama === existing.nama || normMapelName(r.nama) === normMapelName(existing.nama)
			);
		let indukBaru: string | null | undefined;
		const indukRaw = formMapel.induk_pembelajaran_id;
		if (indukRaw !== undefined) {
			const v = indukRaw.trim();
			if (v) {
				if (!indukRows.some((r) => r.pembelajaranId === v)) {
					return fail(400, { fail: 'Pembelajaran induk tidak valid untuk kelas ini.' });
				}
				indukBaru = v;
			} else {
				indukBaru = null;
			}
		}
		if (
			indukRows.length > 0 &&
			!terdaftarDiDapodik &&
			(indukBaru === undefined || indukBaru === null)
		) {
			return fail(400, {
				fail: `"${existing.nama}" belum terdaftar sebagai pembelajaran Dapodik — pilih "Mata Pelajaran Induk" agar dapat dikirim sebagai Sub Pembelajaran.`
			});
		}

		if (isAgamaGroup) {
			// enforce PAPB code for agama group and update KKM and kode across all variants
			const setAgama: Partial<typeof tableMataPelajaran.$inferInsert> = {
				kkm,
				kode: 'PAPB',
				updatedAt: now
			};
			// Induk pilihan (Sub Pembelajaran) berlaku ke seluruh varian agama kelas ini.
			if (indukBaru !== undefined) setAgama.dapodikIndukPembelajaranId = indukBaru;
			await db
				.update(tableMataPelajaran)
				.set(setAgama)
				.where(
					and(
						eq(tableMataPelajaran.kelasId, existing.kelasId),
						inArray(tableMataPelajaran.nama, agamaMapelNames)
					)
				);

			return { message: `Data Pendidikan Agama dan Budi Pekerti diperbarui` };
		}

		if (isPksGroup) {
			// enforce PKS code for PKS group and update KKM, jenis, and kode across all variants
			const jenisRaw = formMapel.jenis?.toString().toLowerCase() ?? existing.jenis;
			if (!isValidJenis(jenisRaw)) {
				return fail(400, { fail: 'Jenis mata pelajaran tidak valid.' });
			}

			const setPks: Record<string, unknown> = {
				kkm,
				jenis: jenisRaw,
				kode: 'PKS',
				updatedAt: now
			};
			if (indukBaru !== undefined) setPks.dapodikIndukPembelajaranId = indukBaru;
			await db
				.update(tableMataPelajaran)
				.set(setPks)
				.where(
					and(
						eq(tableMataPelajaran.kelasId, existing.kelasId),
						inArray(tableMataPelajaran.nama, pksMapelNames)
					)
				);

			return { message: `KKM dan jenis Pendalaman Kitab Suci diperbarui` };
		}

		const nama = formMapel.nama?.toString().trim();
		if (!nama) {
			return fail(400, { fail: 'Nama mata pelajaran wajib diisi.' });
		}

		const jenisRaw = formMapel.jenis?.toString().toLowerCase() ?? '';
		if (!isValidJenis(jenisRaw)) {
			return fail(400, { fail: 'Jenis mata pelajaran tidak valid.' });
		}

		// For non-agama subjects update kode if provided
		const updates: Record<string, unknown> = { nama, jenis: jenisRaw, kkm, updatedAt: now };
		if (kode) updates.kode = kode;
		if (indukBaru !== undefined) updates.dapodikIndukPembelajaranId = indukBaru;

		await db.update(tableMataPelajaran).set(updates).where(eq(tableMataPelajaran.id, id));

		return { message: `Data mata pelajaran berhasil diperbarui` };
	}
};
