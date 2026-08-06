import db from '$lib/server/db';
import { tableAuthUser, tablePegawai } from '$lib/server/db/schema';
import { resolveProfileFields } from '$lib/profile';
import { and, eq, ne, sql } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

function toNullableString(value: FormDataEntryValue | null) {
	if (value == null) return null;
	const trimmed = String(value).trim();
	return trimmed ? trimmed : null;
}

export const load: PageServerLoad = async ({ locals }) => {
	const user = locals.user;
	if (!user) throw redirect(303, '/login');

	const profile = await db.query.tableAuthUser.findFirst({
		columns: {
			id: true,
			username: true,
			namaLengkap: true,
			tempatLahir: true,
			tanggalLahir: true,
			jenisKelamin: true,
			ijazah: true,
			tahunIjazah: true,
			statusKepegawaian: true,
			golongan: true,
			jabatan: true,
			pangkat: true,
			tanggalPangkat: true,
			tanggalDiangkat: true,
			tanggalBekerja: true,
			tanggalGajiBerkala: true,
			pegawaiId: true
		},
		with: {
			// nama & NIP terintegrasi dengan data pegawai (diset di halaman /pengguna dan /kelas)
			pegawai: { columns: { id: true, nama: true, nip: true } }
		},
		where: eq(tableAuthUser.id, user.id)
	});

	return {
		meta: {
			title: 'Edit Profil',
			description: 'Edit Profil Pengguna'
		},
		profile
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		if (!locals.user) throw redirect(303, '/login');

		const formData = await request.formData();

		const namaLengkap = toNullableString(formData.get('namaLengkap'));
		const nip = toNullableString(formData.get('nip'));
		const tempatLahir = toNullableString(formData.get('tempatLahir'));
		const tanggalLahir = toNullableString(formData.get('tanggalLahir'));
		const jenisKelamin = toNullableString(formData.get('jenisKelamin'));
		const ijazah = toNullableString(formData.get('ijazah'));
		const tahunIjazahRaw = toNullableString(formData.get('tahunIjazah'));
		const tanggalDiangkat = toNullableString(formData.get('tanggalDiangkat'));
		const tanggalBekerja = toNullableString(formData.get('tanggalBekerja'));
		const tanggalGajiBerkala = toNullableString(formData.get('tanggalGajiBerkala'));
		const tanggalPangkat = toNullableString(formData.get('tanggalPangkat'));

		if (!namaLengkap) {
			return fail(400, { message: 'Nama lengkap wajib diisi.' });
		}
		const nama = namaLengkap;

		if (jenisKelamin && jenisKelamin !== 'L' && jenisKelamin !== 'P') {
			return fail(400, { message: 'Jenis kelamin tidak valid.' });
		}

		let tahunIjazah: number | null = null;
		if (tahunIjazahRaw) {
			const year = Number(tahunIjazahRaw);
			if (!Number.isInteger(year) || year < 1900 || year > 3000) {
				return fail(400, { message: 'Tahun lulus ijazah tidak valid.' });
			}
			tahunIjazah = year;
		}

		const resolved = resolveProfileFields({
			statusKepegawaian: String(formData.get('statusKepegawaian') ?? ''),
			golongan: String(formData.get('golongan') ?? ''),
			jabatan: String(formData.get('jabatan') ?? '')
		});

		const isHonor =
			resolved.statusKepegawaian === 'Honor Pemda' ||
			resolved.statusKepegawaian === 'Honorer Sekolah';
		const isPppk = resolved.statusKepegawaian === 'PPPK';
		const isGajiBerkalaLocked = isHonor || isPppk;

		const timestamp = new Date().toISOString();

		// Nama lengkap & NIP terintegrasi dengan tabel pegawai:
		// update/link data pegawai agar konsisten dengan halaman /pengguna dan /kelas.
		try {
			await db.transaction(async (tx) => {
				const current = await tx.query.tableAuthUser.findFirst({
					columns: { id: true, pegawaiId: true },
					where: eq(tableAuthUser.id, locals.user!.id)
				});

				let pegawaiId = current?.pegawaiId ?? null;
				let pegawaiNip = nip ?? '';

				if (!pegawaiId) {
					// Find-or-create pegawai by name (mirrors /pengguna) so profile saves
					// don't create duplicate pegawai rows for the same person.
					const candidate = await tx.query.tablePegawai.findFirst({
						columns: { id: true, nama: true, nip: true },
						where: sql`LOWER(trim(${tablePegawai.nama})) = ${nama.toLowerCase()}`
					});
					if (candidate) {
						// Only link if the matched row isn't already attached to another account.
						const linked = await tx.query.tableAuthUser.findFirst({
							columns: { id: true },
							where: and(
								eq(tableAuthUser.pegawaiId, candidate.id),
								ne(tableAuthUser.id, locals.user!.id)
							)
						});
						if (!linked) {
							pegawaiId = candidate.id;
							// Adopted row: keep its existing NIP when the form value is empty,
							// since the form couldn't have pre-filled it (wasn't linked before).
							if (!nip && candidate.nip) pegawaiNip = candidate.nip;
						}
					}
					if (!pegawaiId) {
						const [p] = await tx
							.insert(tablePegawai)
							.values({
								nama,
								nip: pegawaiNip,
								createdAt: timestamp,
								updatedAt: timestamp
							})
							.returning({ id: tablePegawai.id });
						pegawaiId = p?.id ?? null;
					}
				}

				if (pegawaiId) {
					await tx
						.update(tablePegawai)
						.set({
							nama,
							nip: pegawaiNip,
							updatedAt: timestamp
						})
						.where(eq(tablePegawai.id, pegawaiId));
				}

				await tx
					.update(tableAuthUser)
					.set({
						namaLengkap: nama,
						pegawaiId: pegawaiId ?? undefined,
						tempatLahir,
						tanggalLahir,
						jenisKelamin: (jenisKelamin as 'L' | 'P') ?? null,
						ijazah,
						tahunIjazah,
						statusKepegawaian: resolved.statusKepegawaian,
						golongan: resolved.golongan,
						jabatan: resolved.jabatan,
						pangkat: isGajiBerkalaLocked ? '-' : resolved.pangkat,
						tanggalPangkat: isGajiBerkalaLocked ? '-' : tanggalPangkat,
						tanggalDiangkat,
						tanggalBekerja,
						tanggalGajiBerkala: isGajiBerkalaLocked ? '-' : tanggalGajiBerkala,
						updatedAt: timestamp
					})
					.where(eq(tableAuthUser.id, locals.user!.id));
			});
		} catch (error) {
			console.error('Failed to save profile', error);
			return fail(500, { message: 'Gagal menyimpan profil. Coba lagi.' });
		}

		return { message: 'Profil berhasil diperbarui.' };
	}
};
