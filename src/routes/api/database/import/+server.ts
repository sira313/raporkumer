import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { reloadDbClient } from '$lib/server/db';
import { execFile } from 'node:child_process';
import { cookieNames } from '$lib/utils';
import { ensureDefaultAdmin, resolveSession, createSession } from '$lib/server/auth';

const DEFAULT_DB_URL = 'file:./data/database.sqlite3';

function resolveDatabasePath(url: string) {
	if (url.startsWith('file:')) {
		const cleaned = url.replace(/^file:/, '');
		return resolve(process.cwd(), cleaned);
	}

	throw error(500, 'Database URL tidak didukung untuk import');
}

export async function POST({ request, cookies }) {
	const formData = await request.formData();
	const file = formData.get('database');
	console.log('[database-import] menerima permintaan import');

	// Preserve admin access across the DB swap: verify the caller is an admin
	// using the currently-open DB before we overwrite it. After the import we
	// will create a fresh session in the newly-imported DB so the client stays
	// authenticated.
	const existingToken = cookies?.get?.(cookieNames.AUTH_SESSION);
	if (!existingToken) {
		console.warn('[database-import] tidak ada cookie sesi pada permintaan');
		throw error(403, 'Akses ditolak');
	}
	const resolved = await resolveSession(existingToken).catch((e) => {
		console.warn('[database-import] gagal memverifikasi sesi sebelum import', e);
		return null;
	});
	if (!resolved || !resolved.user || resolved.user.type !== 'admin') {
		console.warn('[database-import] user tidak memiliki izin admin');
		throw error(403, 'Akses ditolak');
	}

	if (!(file instanceof File)) {
		console.warn('[database-import] gagal: field database tidak ditemukan dalam formData');
		throw error(400, 'Berkas database tidak ditemukan');
	}

	if (file.size === 0) {
		console.warn('[database-import] gagal: berkas kosong');
		throw error(400, 'Berkas database kosong');
	}

	console.log('[database-import] ukuran berkas', file.size, 'byte');

	const dbUrl = env.DB_URL ?? DEFAULT_DB_URL;
	const dbPath = resolveDatabasePath(dbUrl);
	const dbDir = dirname(dbPath);
	const uploadedBuffer = Buffer.from(await file.arrayBuffer());

	await mkdir(dbDir, { recursive: true });

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backupPath = join(dbDir, `database-backup-before-import-${timestamp}.sqlite3`);

	try {
		await copyFile(dbPath, backupPath);
	} catch (cause) {
		const errorCode = (cause as NodeJS.ErrnoException | undefined)?.code;
		if (errorCode && errorCode !== 'ENOENT') {
			console.error('[database-import] gagal membuat backup database sebelum import', cause);
			throw error(500, 'Gagal membuat backup database sebelum import');
		}
	}

	try {
		await writeFile(dbPath, uploadedBuffer);
	} catch (cause) {
		console.error('[database-import] gagal menulis berkas database', cause);
		throw error(500, 'Gagal menyimpan berkas database');
	}

	try {
		await stat(dbPath);
	} catch (cause) {
		console.error('[database-import] database hasil import tidak ditemukan', cause);
		throw error(500, 'Import database gagal, berkas tidak ditemukan setelah penulisan');
	}

	console.log('[database-import] import selesai. Backup disimpan di', backupPath);

	// After writing the new DB file, reload the server's DB client so the running
	// process uses the newly-imported file instead of any previously-opened handle.
	try {
		await reloadDbClient();
		console.info('[database-import] reloaded server DB client to use imported file');
	} catch (e) {
		console.warn('[database-import] failed to reload DB client (non-fatal):', e);
	}

	// Ensure there's an admin account in the newly-imported DB and create a
	// fresh session for the client so they remain authenticated after the DB
	// swap. We intentionally do this synchronously here so the response can set
	// a new cookie for the client.
	try {
		const admin = await ensureDefaultAdmin();
		if (admin && admin.id) {
			const session = await createSession(admin.id, {
				userAgent: request.headers.get('user-agent') ?? null,
				ipAddress:
					(request.headers.get('x-forwarded-for') as string | null) ??
					request.headers.get('remote-addr') ?? null
			});
			const secure = process.env.NODE_ENV === 'production';
			cookies.set(cookieNames.AUTH_SESSION, session.token, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure
			});
			console.info('[database-import] created session in imported DB for admin user', admin.username);
		}
	} catch (e) {
		console.warn('[database-import] failed to create/restore admin session after import (non-fatal):', e);
	}

	// attempt to normalize indexes automatically after import so older DB dumps
	// don't leave behind incompatible index names that later cause insert failures.
	(async () => {
		try {
			// Run the full migrate-installed-db wrapper so the imported DB is normalized,
			// ensured for missing columns, and any necessary drizzle migrations are applied.
			const script = resolve(process.cwd(), 'scripts', 'migrate-installed-db.mjs');
			console.info('[database-import] running migrate-installed-db script:', script);
			await new Promise((resolvePromise, rejectPromise) => {
				const child = execFile(
					process.execPath,
					[script],
					{ windowsHide: true },
					(err, stdout, stderr) => {
						if (stdout && String(stdout).trim())
							console.info('[migrate-installed-db stdout]', String(stdout).trim());
						if (stderr && String(stderr).trim())
							console.warn('[migrate-installed-db stderr]', String(stderr).trim());
						if (err) return rejectPromise(err);
						resolvePromise(null);
					}
				);
				child.on('error', (e) => rejectPromise(e));
			});
			console.info('[database-import] migrate-installed-db completed');
			try {
				await reloadDbClient();
				console.info('[database-import] reloaded DB client after migrate-installed-db');
			} catch (e) {
				console.warn(
					'[database-import] failed to reload DB client after migrate-installed-db (non-fatal):',
					e
				);
			}
		} catch (e) {
			console.warn('[database-import] migrate-installed-db failed (non-fatal):', e);
		}
	})();
	return json({ message: 'Database berhasil diimport.' });
}
