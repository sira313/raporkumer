import db from '$lib/server/db';
import { env } from '$env/dynamic/private';
import { tableAuthUser, tablePegawai, tableKelas, tableMataPelajaran } from '$lib/server/db/schema';
import { tableSekolah } from '$lib/server/db/schema';
import { sql, eq, and, inArray, desc } from 'drizzle-orm';
import { authority } from './utils.server';
import { hashPassword } from '$lib/server/auth';
import { randomBytes } from 'node:crypto';
import { fail } from '@sveltejs/kit';

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

	// fetch sekolah list so the Add User modal can offer a sekolah selection
	const sekolahList = await db
		.select({ id: tableSekolah.id, nama: tableSekolah.nama })
		.from(tableSekolah)
		.limit(1000);

	return { meta: { title: 'Manajemen Pengguna' }, users, mataPelajaran, sekolahList };
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
	},
	create_user: async ({ request }) => {
		authority('user_add');
		const form = await request.formData();
		const username = String(form.get('username') ?? '').trim();
		const password = String(form.get('password') ?? '').trim();
		const nama = String(form.get('nama') ?? '').trim();
		const roleValue = String(form.get('type') ?? 'user');
		const mataPelajaranIdRaw = form.get('mataPelajaranId');
		let mataPelajaranId = mataPelajaranIdRaw ? Number(String(mataPelajaranIdRaw)) : null;
		const sekolahIdRaw = form.get('sekolahId');
		const sekolahId = sekolahIdRaw ? Number(String(sekolahIdRaw)) : null;

		if (!username) return fail(400, { message: 'username required' });
		if (!password) return fail(400, { message: 'password required' });

		try {
			const { hash, salt } = hashPassword(password);
			const timestamp = new Date().toISOString();
			// if a nama was provided, create a pegawai row and link the user to it
			let pegawaiId: number | null = null;
			if (nama) {
				// `nip` is required by the schema; use empty string when not provided
				const [p] = await db
					.insert(tablePegawai)
					.values({ nama, nip: '' })
					.returning({ id: tablePegawai.id });
				if (p && typeof p.id === 'number') pegawaiId = p.id;
			}

			// If a sekolahId was provided but no specific mataPelajaranId, try to
			// resolve any mata_pelajaran owned by that sekolah and assign the first
			// found mapel to the user so the login flow (which maps mataPelajaran->kelas->sekolah)
			// can pick the correct sekolah automatically.
			if (!mataPelajaranId && sekolahId) {
				try {
					const [mp] = await db
						.select({ id: tableMataPelajaran.id })
						.from(tableMataPelajaran)
						.leftJoin(tableKelas, eq(tableMataPelajaran.kelasId, tableKelas.id))
						.where(eq(tableKelas.sekolahId, sekolahId))
						.limit(1);
					if (mp && typeof mp.id === 'number') mataPelajaranId = mp.id;
				} catch (err) {
					console.warn('[pengguna] failed to resolve mataPelajaran for sekolahId', sekolahId, err);
				}
			}

			// @ts-expect-error: allow simple insertion shape here
			await db.insert(tableAuthUser).values({
				username,
				usernameNormalized: username.toLowerCase(),
				passwordHash: hash,
				passwordSalt: salt,
				passwordUpdatedAt: timestamp,
				permissions: [],
				type: roleValue,
				// store assigned mata pelajaran when creating a 'user' account
				mataPelajaranId: mataPelajaranId ?? undefined,
				// persist sekolah selection when provided so login reliably selects it
				sekolahId: sekolahId ?? undefined,
				pegawaiId: pegawaiId ?? undefined,
				createdAt: timestamp,
				updatedAt: timestamp
			});

			// fetch created user record to return the created user object reliably.
			// select the most-recent row matching usernameNormalized in case multiple exist.
			const [created] = await db
				.select({
					id: u.id,
					username: u.username,
					createdAt: u.createdAt,
					type: u.type,
					passwordUpdatedAt: u.passwordUpdatedAt
				})
				.from(u)
				.where(eq(u.usernameNormalized, username.toLowerCase()))
				.orderBy(desc(u.id))
				.limit(1);

			console.info(`[pengguna] Created user via action: ${username} -> id=${created?.id}`);

			// include mataPelajaranId in the response so the client can keep track of the selection
			// diagnostic logs to help track persistence issues after DB imports
			try {
				console.info(
					`[pengguna] create_user diagnostic: cwd=${process.cwd()} DB_URL=${env.DB_URL ?? 'file:./data/database.sqlite3'}`
				);
				const [{ count }] = await db.select({ count: sql`COUNT(*)` }).from(u);
				console.info('[pengguna] total auth_user rows after insert:', count);
			} catch (diagErr) {
				console.warn('[pengguna] diagnostic failed:', diagErr);
			}
			return {
				success: true,
				user: created,
				displayName: nama,
				mataPelajaranId: mataPelajaranId ?? null
			};
		} catch (err: unknown) {
			console.error('Failed to create user', err);
			// detect sqlite unique constraint on normalized username and return a user-friendly error
			// safely extract message fields from unknown error
			const e = err as Record<string, unknown>;
			const cause = (e.cause as Record<string, unknown> | undefined) ?? undefined;
			const causeMsg = (
				(cause && String(cause.message)) ||
				(e.message && String(e.message)) ||
				String(err)
			).toString();
			if (
				causeMsg.includes('UNIQUE constraint failed') &&
				causeMsg.includes('auth_user.username_normalized')
			) {
				return fail(400, { message: 'Username sudah digunakan' });
			}
			return fail(500, { message: 'Internal Error' });
		}
	},
	delete_users: async ({ request }) => {
		authority('user_delete');
		let ids: number[] = [];
		try {
			// try JSON first
			const contentType = request.headers.get('content-type') || '';
			if (contentType.includes('application/json')) {
				const body = await request.json();
				ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
			} else {
				const form = await request.formData();
				const raw = String(form.get('ids') ?? '');
				// accept comma-separated ids
				ids = raw
					.split(',')
					.map((s) => Number(s))
					.filter(Boolean);
			}
		} catch (err) {
			console.warn('Failed to parse ids for deletion', err);
			return new Response('Invalid request', { status: 400 });
		}

		// only keep valid positive integers
		ids = ids.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0);
		if (!ids.length) return new Response('No ids provided', { status: 400 });

		try {
			// fetch candidate users and join pegawai/kelas to detect wali_kelas and get names
			const candidates = await db
				.select({
					id: tableAuthUser.id,
					type: tableAuthUser.type,
					username: tableAuthUser.username,
					pegawaiName: tablePegawai.nama,
					kelasName: tableKelas.nama
				})
				.from(tableAuthUser)
				.leftJoin(tablePegawai, eq(tableAuthUser.pegawaiId, tablePegawai.id))
				.leftJoin(tableKelas, eq(tableAuthUser.kelasId, tableKelas.id))
				.where(inArray(tableAuthUser.id, ids));

			const blocked = candidates.filter((c) => c.type === 'wali_kelas');
			if (blocked.length) {
				// construct warning messages for blocked users
				const messages = blocked.map((b) => {
					const name = b.pegawaiName || b.username || 'Pengguna';
					const kelas = b.kelasName || '';
					return (
						`${name} adalah Wali Kelas ${kelas || ''}`.trim() +
						`, tidak dapat dihapus. Untuk menggantinya silahkan buka menu Data Kelas`
					);
				});
				return new Response(JSON.stringify({ type: 'warning', message: messages.join(' | ') }), {
					status: 400,
					headers: { 'Content-Type': 'application/json' }
				});
			}

			await db.delete(tableAuthUser).where(inArray(tableAuthUser.id, ids));
			return { success: true, deleted: ids };
		} catch (err) {
			console.error('Failed to delete users', err);
			return new Response(String(err), { status: 500 });
		}
	}
};
