import db from '$lib/server/db';
import { tableAuthUser, tablePegawai, tableSekolah } from '$lib/server/db/schema';
import { and, eq, inArray, ne, or } from 'drizzle-orm';
import { hashPassword } from '$lib/server/auth';
import { randomBytes } from 'node:crypto';
import { resolveUniqueUsername } from '$lib/server/usernames';
import { userPermissions } from '../../routes/pengguna/permissions';
import {
	deletePegawaiIfOrphaned,
	findGuruPegawaiForKepalaSekolah,
	mergeAccountInto
} from '$lib/server/pengguna-merge';

/**
 * Ensure a `kepala_sekolah` auth account exists for a sekolah, derived from the
 * "Nama Kepala Sekolah" / "NIP Kepala Sekolah" data saved via `/sekolah/form`.
 *
 * The account mirrors the kepala sekolah pegawai record (username = nama) and
 * gets the full admin permission set, but is scoped to a single sekolah via
 * `sekolahId` so it only belongs to that (active) school.
 *
 * A PLT kepala sekolah is usually also a wali kelas / guru mapel (to keep
 * teaching hours). To avoid two accounts with the same name, the kepala sekolah
 * is linked to the existing guru pegawai when the name/NIP matches, and any
 * other guru account for the same person is converted/merged into the single
 * `kepala_sekolah` account.
 *
 * Idempotent: updates an existing account in place (syncs nama + permissions),
 * otherwise creates one with a generated password.
 */
export async function ensureKepalaSekolahUser(sekolahId: number, kepalaSekolahId: number) {
	try {
		const pegawai = await db.query.tablePegawai.findFirst({
			columns: { id: true, nama: true, nip: true },
			where: eq(tablePegawai.id, kepalaSekolahId)
		});
		const nama = (pegawai?.nama ?? '').trim();
		if (!nama) return;

		// Try to reuse an existing guru (wali kelas / guru mapel) pegawai so the
		// kepala sekolah and the teaching staff share a single person record.
		const matched = await findGuruPegawaiForKepalaSekolah(
			sekolahId,
			kepalaSekolahId,
			nama,
			pegawai?.nip
		);
		const targetPegawaiId = matched?.id ?? kepalaSekolahId;

		let repointedOldPegawaiId: number | null = null;
		if (matched && matched.id !== kepalaSekolahId) {
			await db
				.update(tableSekolah)
				.set({ kepalaSekolahId: matched.id })
				.where(eq(tableSekolah.id, sekolahId));
			repointedOldPegawaiId = kepalaSekolahId;
		}

		const timestamp = new Date().toISOString();
		const allPermissions: UserPermission[] = [...userPermissions];

		// Existing kepala_sekolah account(s) for this sekolah/person: keep the
		// oldest, sync it, and merge the rest.
		const existingKepala = await db.query.tableAuthUser.findMany({
			columns: { id: true, createdAt: true },
			where: and(
				eq(tableAuthUser.type, 'kepala_sekolah'),
				or(eq(tableAuthUser.sekolahId, sekolahId), eq(tableAuthUser.pegawaiId, targetPegawaiId))
			)
		});

		let keptUserId: number;
		if (existingKepala.length) {
			const sorted = [...existingKepala].sort(
				(a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
			);
			keptUserId = sorted[0].id;
			await db
				.update(tableAuthUser)
				.set({
					permissions: allPermissions,
					sekolahId,
					pegawaiId: targetPegawaiId,
					updatedAt: timestamp
				})
				.where(eq(tableAuthUser.id, keptUserId));
			for (const dup of sorted.slice(1)) {
				await mergeAccountInto(keptUserId, dup.id);
			}
		} else {
			// No kepala_sekolah account yet. If the person already has a guru
			// account (wali_kelas / user), convert it instead of creating a new
			// account so login + presensi history stay on one account.
			const guruAccounts = await db.query.tableAuthUser.findMany({
				columns: { id: true, type: true, createdAt: true },
				where: and(
					eq(tableAuthUser.pegawaiId, targetPegawaiId),
					eq(tableAuthUser.sekolahId, sekolahId),
					inArray(tableAuthUser.type, ['user', 'wali_kelas'])
				)
			});

			if (guruAccounts.length) {
				const sorted = [...guruAccounts].sort(
					(a, b) => new Date(a.createdAt ?? 0).getTime() - new Date(b.createdAt ?? 0).getTime()
				);
				keptUserId = sorted[0].id;
				await db
					.update(tableAuthUser)
					.set({
						type: 'kepala_sekolah',
						permissions: allPermissions,
						sekolahId,
						pegawaiId: targetPegawaiId,
						updatedAt: timestamp
					})
					.where(eq(tableAuthUser.id, keptUserId));
				console.info(
					`[kepala-sekolah] Converted guru account to kepala_sekolah for "${nama}" (userId=${keptUserId}).`
				);
				for (const dup of sorted.slice(1)) {
					await mergeAccountInto(keptUserId, dup.id);
				}
			} else {
				const username = await resolveUniqueUsername(nama);
				const usernameNormalized = username.toLowerCase();
				const password = randomBytes(6).toString('base64url');
				const { hash, salt } = hashPassword(password);

				const [created] = await db
					.insert(tableAuthUser)
					.values({
						username,
						usernameNormalized,
						passwordHash: hash,
						passwordSalt: salt,
						passwordUpdatedAt: timestamp,
						permissions: allPermissions,
						type: 'kepala_sekolah',
						sekolahId,
						pegawaiId: targetPegawaiId,
						createdAt: timestamp,
						updatedAt: timestamp
					})
					.returning({ id: tableAuthUser.id });
				keptUserId = created?.id;
				console.info(
					`[kepala-sekolah] Created user for kepala sekolah "${nama}" (sekolahId=${sekolahId}). Reset the password via /pengguna.`
				);
			}
		}

		// Defensive: merge any leftover guru accounts that belong to the same
		// pegawai within the same sekolah.
		if (keptUserId) {
			const leftovers = await db.query.tableAuthUser.findMany({
				columns: { id: true },
				where: and(
					eq(tableAuthUser.pegawaiId, targetPegawaiId),
					eq(tableAuthUser.sekolahId, sekolahId),
					ne(tableAuthUser.id, keptUserId),
					inArray(tableAuthUser.type, ['user', 'wali_kelas'])
				)
			});
			for (const l of leftovers) {
				await mergeAccountInto(keptUserId, l.id);
			}
		}

		// Clean up the now-orphaned separate kepala sekolah pegawai (if any).
		if (repointedOldPegawaiId != null) {
			await deletePegawaiIfOrphaned(repointedOldPegawaiId);
		}
	} catch (err) {
		console.warn('[kepala-sekolah] Failed to ensure kepala sekolah user:', err);
	}
}

/**
 * Backfill kepala_sekolah auth accounts for every existing sekolah that already
 * has a kepala sekolah pegawai set (covers databases created before this feature).
 * Idempotent — calls `ensureKepalaSekolahUser` per sekolah, which updates in place.
 */
export async function ensureKepalaSekolahAccounts() {
	try {
		const sekolahs = await db.query.tableSekolah.findMany({
			columns: { id: true, kepalaSekolahId: true }
		});
		for (const sekolah of sekolahs) {
			if (sekolah.kepalaSekolahId) {
				await ensureKepalaSekolahUser(sekolah.id, sekolah.kepalaSekolahId);
			}
		}
	} catch (err) {
		console.warn('[kepala-sekolah] Failed to ensure existing kepala sekolah accounts:', err);
	}
}
