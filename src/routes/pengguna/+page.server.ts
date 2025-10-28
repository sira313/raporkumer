import db from '$lib/server/db';
import { tableAuthUser, tablePegawai, tableKelas, tableMataPelajaran } from '$lib/server/db/schema';
import { sql, eq, and } from 'drizzle-orm';
import { authority } from './utils.server';
import { hashPassword } from '$lib/server/auth';
import { randomBytes } from 'node:crypto';

const u = tableAuthUser;

export async function load({ url }) {
	authority('user_list');

	// Ensure there are auth_user entries for any kelas that has a wali_kelas assigned.
	// This mirrors `scripts/seed-wali-users.mjs` but runs lazily during the users page load
	// so admins don't need to run a separate seed script after importing old DBs.
	try {
		const kelasWithWali = await db.query.tableKelas.findMany({
			where: sql`${tableKelas.waliKelasId} IS NOT NULL`,
			columns: { id: true, waliKelasId: true }
		});
		for (const k of kelasWithWali) {
			if (!k.waliKelasId) continue;
			const exists = await db.query.tableAuthUser.findFirst({
				where: eq(tableAuthUser.pegawaiId, k.waliKelasId),
				columns: { id: true }
			});
			if (exists) continue;
			// fetch pegawai name
			const peg = await db.query.tablePegawai.findFirst({
				where: eq(tablePegawai.id, k.waliKelasId),
				columns: { nama: true }
			});
			const nama = (peg?.nama || '').trim();
			if (!nama) continue;
			const username = nama;
			const usernameNormalized = username.toLowerCase();
			// generate a random password (approx 8 chars) and hash it
			const password = randomBytes(6).toString('base64url');
			const { hash, salt } = hashPassword(password);
			const timestamp = new Date().toISOString();

			await db.insert(tableAuthUser).values({
				username,
				usernameNormalized,
				passwordHash: hash,
				passwordSalt: salt,
				passwordUpdatedAt: timestamp,
				permissions: [],
				type: 'wali_kelas',
				pegawaiId: k.waliKelasId,
				kelasId: k.id,
				createdAt: timestamp,
				updatedAt: timestamp
			});
			console.info(`[pengguna] Created user for wali_kelas ${nama} (kelas ${k.id})`);
		}
	} catch (err) {
		console.warn('[pengguna] Failed to ensure wali_kelas users:', err);
	}

	// TODO: implement pagination
	const q = url.searchParams.get('q');

	const users = await db
		.select({
			id: u.id,
			username: u.username,
			createdAt: u.createdAt,
			type: u.type,
			pegawaiId: u.pegawaiId,
			pegawaiName: tablePegawai.nama,
			kelasId: u.kelasId,
			kelasName: tableKelas.nama,
			passwordUpdatedAt: u.passwordUpdatedAt
		})
		.from(u)
		.leftJoin(tablePegawai, eq(u.pegawaiId, tablePegawai.id))
		.leftJoin(tableKelas, eq(u.kelasId, tableKelas.id))
		.where(
			and(
				// exclude admin users from the listing
				sql`${u.type} != ${'admin'}`,
				q ? sql` lower(${u.username}) like ${'%' + q.toLowerCase() + '%'}` : sql` true`
			)
		)
		.limit(100);

	// fetch mata pelajaran to populate select in the inline-add row
	const mataPelajaran = await db
		.select({ id: tableMataPelajaran.id, nama: tableMataPelajaran.nama })
		.from(tableMataPelajaran)
		.limit(1000);

	return { meta: { title: 'Manajemen Pengguna' }, users, mataPelajaran };
}

export const actions = {
	update_credentials: async ({ request }) => {
		authority('user_set_permissions');
		const form = await request.formData();
		const id = Number(form.get('id'));
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '').trim();

		const updateData: Record<string, unknown> = {};
		if (username) {
			updateData.username = username;
			updateData.usernameNormalized = username.toLowerCase();
		}
		if (password) {
			const { hash, salt } = hashPassword(password);
			updateData.passwordHash = hash;
			updateData.passwordSalt = salt;
			updateData.passwordUpdatedAt = new Date().toISOString();
		}

		if (Object.keys(updateData).length === 0) {
			return new Response('No changes provided', { status: 400 });
		}

		try {
			await db.update(u).set(updateData).where(eq(u.id, id));
			const [updated] = await db
				.select({
					id: u.id,
					username: u.username,
					usernameNormalized: u.usernameNormalized,
					passwordUpdatedAt: u.passwordUpdatedAt
				})
				.from(u)
				.where(eq(u.id, id));
			return { success: true, user: updated };
		} catch (err) {
			console.error('Failed to update user credentials', err);
			return new Response(String(err), { status: 500 });
		}
	}
,
	create_user: async ({ request }) => {
		authority('user_add');
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '').trim();
		const nama = String(form.get('nama') ?? '').trim();
		const roleValue = String(form.get('type') ?? 'user');

		if (!username) return new Response('username required', { status: 400 });
		if (!password) return new Response('password required', { status: 400 });

		try {
			const { hash, salt } = hashPassword(password);
			const timestamp = new Date().toISOString();
			// @ts-expect-error: allow simple insertion shape here
			await db.insert(tableAuthUser).values({
				username,
				usernameNormalized: username.toLowerCase(),
				passwordHash: hash,
				passwordSalt: salt,
				passwordUpdatedAt: timestamp,
				permissions: [],
				type: roleValue,
				createdAt: timestamp,
				updatedAt: timestamp
			});

			// fetch created user record to return minimal info to client
			const [created] = await db
				.select({ id: u.id, username: u.username, createdAt: u.createdAt, type: u.type, passwordUpdatedAt: u.passwordUpdatedAt })
				.from(u)
				.where(eq(u.usernameNormalized, username.toLowerCase()));

			return { success: true, user: created, displayName: nama };
		} catch (err) {
			console.error('Failed to create user', err);
			return new Response(String(err), { status: 500 });
		}
	}
};
