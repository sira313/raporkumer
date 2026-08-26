import db from '$lib/server/db/index.js';
import { tableAlamat, tablePegawai, tableSekolah } from '$lib/server/db/schema.js';
import { cookieNames, unflattenFormData } from '$lib/utils';
import { ensureKepalaSekolahUser } from '$lib/server/kepala-sekolah.js';
import {
	deletePegawaiIfOrphaned,
	findGuruPegawaiForKepalaSekolah
} from '$lib/server/pengguna-merge.js';
import { error, fail } from '@sveltejs/kit';
import { eq, isNotNull } from 'drizzle-orm';
import { authority } from '../../../pengguna/utils.server';

export async function load({ url, locals }) {
	authority('informasi_umum_sekolah');
	const isInit = url.searchParams.has('init');
	const isNew = url.searchParams.get('mode') === 'new';
	const sekolahIdParam = url.searchParams.get('sekolahId');

	// Kepala sekolah is scoped to their own sekolah — ignore ?sekolahId= and
	// always edit the active (own) sekolah via locals.sekolah (pinned in hooks).
	const activeUser = locals.user as { type?: string } | null;
	const isKepalaSekolah = activeUser?.type === 'kepala_sekolah';

	// Jika ada parameter sekolahId, load sekolah tersebut
	let sekolahToEdit: Sekolah | Omit<Sekolah, 'logo'> | undefined = undefined;
	if (sekolahIdParam && !isNew && !isKepalaSekolah) {
		const sekolahId = Number(sekolahIdParam);
		if (Number.isInteger(sekolahId) && sekolahId > 0) {
			const sekolah = await db.query.tableSekolah.findFirst({
				where: eq(tableSekolah.id, sekolahId),
				with: {
					alamat: true,
					kepalaSekolah: true
				}
			});
			if (!sekolah) {
				error(404, 'Sekolah tidak ditemukan');
			}
			// Exclude logo and logoDinas from form init (can't populate file inputs anyway)
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const { logo, logoType, logoDinas, logoDinasType, ...sekolahData } = sekolah;
			sekolahToEdit = sekolahData as Sekolah;
		}
	} else if (!isNew) {
		// Jika tidak ada parameter sekolahId dan bukan mode new, gunakan sekolah aktif
		// locals.sekolah already has logo excluded by type
		sekolahToEdit = locals.sekolah;
	}

	// Daftar pendidik & tenaga pendidik untuk combobox "Nama Kepala Sekolah"
	// (mirip logika "Nama Mata Pelajaran" pada Tambah Mata Pelajaran: bila data
	// GTK hasil Sinkron Dapodik tersedia → pilih dari daftar, selain itu teks bebas).
	const pegawaiRaw = await db
		.select({
			id: tablePegawai.id,
			nama: tablePegawai.nama,
			nip: tablePegawai.nip,
			dapodikPtkId: tablePegawai.dapodikPtkId
		})
		.from(tablePegawai);
	const seenNama = new Set<string>();
	const pegawaiList = pegawaiRaw.filter((p) => {
		const key = (p.nama || '').trim().toLowerCase();
		if (!key || key === '-' || seenNama.has(key)) return false;
		seenNama.add(key);
		return true;
	});

	// Data Dapodik tersedia → nama & NIP kepala sekolah terkunci (ubah hanya
	// lewat /pengaturan/profil masing-masing akun).
	const dapodikAktif = pegawaiRaw.some((p) => Boolean(p.dapodikPtkId));

	return {
		isInit,
		isNew,
		sekolah: sekolahToEdit,
		pegawaiList,
		dapodikAktif,
		meta: { title: isNew ? 'Tambah Sekolah' : 'Form Sekolah' }
	};
}

export const actions = {
	async save({ locals, cookies, request }) {
		authority('informasi_umum_sekolah');

		const formData = await request.formData();
		const formSekolah = unflattenFormData<Sekolah>(formData);

		// Kepala sekolah can only save their own sekolah — never edit another one.
		const activeUser = locals.user as { type?: string; sekolahId?: number } | null;
		if (
			activeUser?.type === 'kepala_sekolah' &&
			(formSekolah.id ? Number(formSekolah.id) !== activeUser.sekolahId : true)
		) {
			error(403, 'Kepala Sekolah hanya dapat mengubah data sekolah aktifnya.');
		}

		// TODO: input validation

		// Prepare update data - exclude logo fields if not provided
		const updateData: Partial<typeof formSekolah> = { ...formSekolah };

		const logo = formData.get('logo') as File;
		if (logo?.size) {
			updateData.logo = new Uint8Array(await logo.arrayBuffer());
			updateData.logoType = logo.type;
		} else {
			// Jika tidak ada file baru di-upload, jangan ubah nilai logo yang ada
			delete updateData.logo;
			delete updateData.logoType;
		}

		const logoDinas = formData.get('logoDinas') as File;
		if (logoDinas?.size) {
			updateData.logoDinas = new Uint8Array(await logoDinas.arrayBuffer());
			updateData.logoDinasType = logoDinas.type;
		} else {
			// Jika tidak ada file baru di-upload, jangan ubah nilai logoDinas yang ada
			delete updateData.logoDinas;
			delete updateData.logoDinasType;
		}

		// Use updateData for further processing
		const formSekolahFinal = updateData as typeof formSekolah;

		// A PLT kepala sekolah is often also a wali kelas / guru mapel (must keep
		// teaching hours). Reuse that existing guru pegawai instead of keeping a
		// separate person record — otherwise the same name produces two accounts
		// in /pengguna and two rows in presensi guru.
		const dapodikAktif = await db
			.select({ id: tablePegawai.id })
			.from(tablePegawai)
			.where(isNotNull(tablePegawai.dapodikPtkId))
			.limit(1);
		const lockKepalaSekolah = dapodikAktif.length > 0;
		let kpNama = formSekolah.kepalaSekolah?.nama?.trim();
		let kpNip = formSekolah.kepalaSekolah?.nip?.trim();
		// Nilai nama/NIP yang ditulis ke pegawai kepala sekolah.
		const kpValues: { nama: string; nip: string } = formSekolah.kepalaSekolah ?? {
			nama: kpNama ?? '',
			nip: kpNip ?? ''
		};
		const kepalaPegawaiIdRaw = Number(formData.get('kepalaSekolahId') ?? 0);
		const kepalaPegawaiId =
			Number.isInteger(kepalaPegawaiIdRaw) && kepalaPegawaiIdRaw > 0 ? kepalaPegawaiIdRaw : null;
		const currentSekolah = formSekolah.id
			? await db.query.tableSekolah.findFirst({
					columns: { id: true, kepalaSekolahId: true },
					where: eq(tableSekolah.id, +formSekolah.id)
				})
			: null;

		// Mode terkunci (data Dapodik ada): kepala sekolah hanya bisa DIGANTI
		// orangnya via pilihan daftar — identitas pegawai tidak pernah ditimpa.
		let lockedKepalaTargetId: number | null = null;
		if (currentSekolah && lockKepalaSekolah) {
			let targetId: number | null = null;
			if (kepalaPegawaiId && kepalaPegawaiId !== currentSekolah.kepalaSekolahId) {
				const exists = await db.query.tablePegawai.findFirst({
					columns: { id: true },
					where: eq(tablePegawai.id, kepalaPegawaiId)
				});
				targetId = exists?.id ?? null;
			}
			if (!targetId && kpNama) {
				// Nama persis sama dengan kepala sekolah tersimpan → tetap orang itu.
				const stored = await db.query.tablePegawai.findFirst({
					columns: { id: true, nama: true },
					where: eq(tablePegawai.id, currentSekolah.kepalaSekolahId)
				});
				if (stored && stored.nama.trim().toLowerCase() === kpNama.toLowerCase()) {
					targetId = currentSekolah.kepalaSekolahId;
				}
			}
			if (!targetId) {
				return fail(400, { fail: `Pilih Kepala Sekolah dari daftar.` });
			}
			lockedKepalaTargetId = targetId;
			if (targetId === currentSekolah.kepalaSekolahId) {
				const stored = await db.query.tablePegawai.findFirst({
					columns: { nama: true, nip: true },
					where: eq(tablePegawai.id, targetId)
				});
				kpNama = stored?.nama ?? kpNama;
				kpNip = stored?.nip ?? kpNip;
			}
		}

		const matchedKepalaPegawai =
			!lockedKepalaTargetId && currentSekolah && kpNama
				? await findGuruPegawaiForKepalaSekolah(
						currentSekolah.id,
						currentSekolah.kepalaSekolahId,
						kpNama,
						kpNip
					)
				: null;
		let orphanedKepalaSekolahPegawaiId: number | null = null;

		await db.transaction(async (db) => {
			if (formSekolah.id) {
				const sekolah = await db.query.tableSekolah.findFirst({
					where: eq(tableSekolah.id, +formSekolah.id)
				});
				if (!sekolah) error(404, `Data sekolah tidak ditemukan`);

				let resolvedKepalaSekolahId = sekolah.kepalaSekolahId;
				if (lockedKepalaTargetId) {
					// Ganti orang tanpa rename — cukup tautkan sekolah ke pegawai lain.
					resolvedKepalaSekolahId = lockedKepalaTargetId;
					if (lockedKepalaTargetId !== sekolah.kepalaSekolahId) {
						orphanedKepalaSekolahPegawaiId = sekolah.kepalaSekolahId;
					}
				} else if (matchedKepalaPegawai) {
					// Link the kepala sekolah to the existing guru pegawai (the
					// match already excludes the current kepala sekolah pegawai).
					await db
						.update(tablePegawai)
						.set(kpValues)
						.where(eq(tablePegawai.id, matchedKepalaPegawai.id));
					resolvedKepalaSekolahId = matchedKepalaPegawai.id;
					orphanedKepalaSekolahPegawaiId = sekolah.kepalaSekolahId;
				} else {
					await db
						.update(tablePegawai)
						.set(kpValues)
						.where(eq(tablePegawai.id, sekolah.kepalaSekolahId));
				}

				await db
					.update(tableAlamat) //
					.set(formSekolah.alamat)
					.where(eq(tableAlamat.id, sekolah.alamatId));

				await db
					.update(tableSekolah)
					.set({
						...formSekolahFinal,
						alamatId: sekolah.alamatId,
						kepalaSekolahId: resolvedKepalaSekolahId,
						updatedAt: new Date().toISOString()
					})
					.where(eq(tableSekolah.id, formSekolah.id));

				// Keep the kepala sekolah auth account in sync with the saved pegawai
				formSekolah.kepalaSekolahId = resolvedKepalaSekolahId;
			} else {
				if (formSekolah.alamat) {
					const [alamat] = await db
						.insert(tableAlamat)
						.values(formSekolah.alamat)
						.returning({ id: tableAlamat.id });
					formSekolah.alamatId = alamat?.id;
					// also attach to the final insert payload so inserted sekolah gets the foreign key
					formSekolahFinal.alamatId = alamat?.id;
				}

				if (formSekolah.kepalaSekolah) {
					// Combobox mengirim ID pegawai — reuse orang yang sudah ada
					// (jangan buat duplikat) kecuali benar-benar teks baru.
					const pickId = Number(formData.get('kepalaSekolahId') ?? 0);
					const existingPegawai =
						Number.isInteger(pickId) && pickId > 0
							? await db.query.tablePegawai.findFirst({
									columns: { id: true },
									where: eq(tablePegawai.id, pickId)
								})
							: null;
					if (existingPegawai) {
						formSekolah.kepalaSekolahId = existingPegawai.id;
						formSekolahFinal.kepalaSekolahId = existingPegawai.id;
					} else {
						const [pegawai] = await db
							.insert(tablePegawai)
							.values(formSekolah.kepalaSekolah)
							.returning({ id: tablePegawai.id });
						formSekolah.kepalaSekolahId = pegawai?.id;
						formSekolahFinal.kepalaSekolahId = pegawai?.id;
					}
				}

				const [newSekolah] = await db
					.insert(tableSekolah)
					.values(formSekolahFinal)
					.returning({ id: tableSekolah.id });
				formSekolah.id = newSekolah?.id;
			}

			if (!formSekolah.id) error(409, `Gagal simpan data sekolah`);
		});

		// Auto-create/update the kepala sekolah login account for this sekolah.
		if (formSekolah.id && formSekolah.kepalaSekolahId) {
			await ensureKepalaSekolahUser(Number(formSekolah.id), formSekolah.kepalaSekolahId);
		}

		// Remove the now-orphaned separate kepala sekolah pegawai (only if nothing
		// references it anymore; otherwise the /pengguna consolidation will clean it).
		if (orphanedKepalaSekolahPegawaiId != null) {
			await deletePegawaiIfOrphaned(orphanedKepalaSekolahPegawaiId);
		}

		locals.sekolahDirty = true;
		const secure = locals.requestIsSecure ?? false;
		cookies.set(cookieNames.ACTIVE_SEKOLAH_ID, String(formSekolah.id), {
			path: '/',
			secure
		});
		return { message: 'Data sekolah berhasil disimpan' };
	}
};
