import db from '$lib/server/db';
import { tableAuthUser, tablePegawai } from '$lib/server/db/schema';
import { and, eq, or } from 'drizzle-orm';
import { hashPassword } from '$lib/server/auth';
import { randomBytes } from 'node:crypto';
import { resolveUniqueUsername } from '$lib/server/usernames';
import { userPermissions } from '../../routes/pengguna/permissions';

/**
 * Ensure a `kepala_sekolah` auth account exists for a sekolah, derived from the
 * "Nama Kepala Sekolah" / "NIP Kepala Sekolah" data saved via `/sekolah/form`.
 *
 * The account mirrors the kepala sekolah pegawai record (username = nama) and
 * gets the full admin permission set, but is scoped to a single sekolah via
 * `sekolahId` so it only belongs to that (active) school.
 *
 * Idempotent: updates an existing account in place (syncs nama + permissions),
 * otherwise creates one with a generated password.
 */
export async function ensureKepalaSekolahUser(sekolahId: number, kepalaSekolahId: number) {
	try {
		const pegawai = await db.query.tablePegawai.findFirst({
			columns: { id: true, nama: true },
			where: eq(tablePegawai.id, kepalaSekolahId)
		});
		const nama = (pegawai?.nama ?? '').trim();
		if (!nama) return;

		const existing = await db.query.tableAuthUser.findFirst({
			columns: { id: true },
			where: and(
				eq(tableAuthUser.type, 'kepala_sekolah'),
				or(eq(tableAuthUser.sekolahId, sekolahId), eq(tableAuthUser.pegawaiId, kepalaSekolahId))
			)
		});

		const timestamp = new Date().toISOString();
		const allPermissions: UserPermission[] = [...userPermissions];

		if (existing) {
			await db
				.update(tableAuthUser)
				.set({
					permissions: allPermissions,
					sekolahId,
					pegawaiId: kepalaSekolahId,
					updatedAt: timestamp
				})
				.where(eq(tableAuthUser.id, existing.id));
			return;
		}

		const username = await resolveUniqueUsername(nama);
		const usernameNormalized = username.toLowerCase();
		const password = randomBytes(6).toString('base64url');
		const { hash, salt } = hashPassword(password);

		await db.insert(tableAuthUser).values({
			username,
			usernameNormalized,
			passwordHash: hash,
			passwordSalt: salt,
			passwordUpdatedAt: timestamp,
			permissions: allPermissions,
			type: 'kepala_sekolah',
			sekolahId,
			pegawaiId: kepalaSekolahId,
			createdAt: timestamp,
			updatedAt: timestamp
		});
		console.info(
			`[kepala-sekolah] Created user for kepala sekolah "${nama}" (sekolahId=${sekolahId}). Reset the password via /pengguna.`
		);
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
