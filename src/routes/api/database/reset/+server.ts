import { error, json } from '@sveltejs/kit';
import { copyFile, mkdir, stat, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import db from '$lib/server/db';
import { closeDbClient, reloadDbClient } from '$lib/server/db';
import { resolveDatabasePath } from '$lib/server/db-url';
import { runStartupEnsures, resetStartupEnsures } from '$lib/server/db/ensure-bootstrap';
import { cookieNames } from '$lib/utils';
import { resolveSession, verifyUserPassword } from '$lib/server/auth';

export async function POST({ request, cookies }) {
	// Verify the caller is an admin/kepala_sekolah before touching anything.
	const existingToken = cookies?.get?.(cookieNames.AUTH_SESSION);
	if (!existingToken) {
		console.warn('[database-reset] tidak ada cookie sesi pada permintaan');
		throw error(403, 'Akses ditolak');
	}
	const resolved = await resolveSession(existingToken).catch((e) => {
		console.warn('[database-reset] gagal memverifikasi sesi', e);
		return null;
	});
	if (
		!resolved ||
		!resolved.user ||
		(resolved.user.type !== 'admin' && resolved.user.type !== 'kepala_sekolah')
	) {
		console.warn('[database-reset] user tidak memiliki izin admin');
		throw error(403, 'Akses ditolak');
	}

	// Require the caller's current password as confirmation. Must be verified
	// before the DB client is closed below, since it reads from the database.
	const formData = await request.formData();
	const password = String(formData.get('password') ?? '');
	if (!password) {
		throw error(400, 'Masukkan kata sandi untuk konfirmasi reset.');
	}
	const passwordValid = await verifyUserPassword(resolved.user.id, password);
	if (!passwordValid) {
		console.warn('[database-reset] konfirmasi kata sandi salah');
		throw error(400, 'Kata sandi tidak sesuai.');
	}

	console.info('[database-reset] permintaan reset diverifikasi');

	const dbPath = resolveDatabasePath();

	try {
		await stat(dbPath);
	} catch (cause) {
		console.error('[database-reset] berkas database tidak ditemukan', cause);
		throw error(404, 'Berkas database tidak ditemukan');
	}

	// Checkpoint WAL so the safety backup contains every committed change.
	try {
		await (db.$client as { execute: (sql: { sql: string }) => Promise<unknown> }).execute({
			sql: 'PRAGMA wal_checkpoint(FULL)'
		});
	} catch (err) {
		console.warn('[database-reset] WAL checkpoint warning:', err);
	}

	// Close the current DB client so no process holds a WAL lock.
	await closeDbClient();

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const dbDir = dirname(dbPath);
	await mkdir(dbDir, { recursive: true });
	const backupPath = join(dbDir, `database-backup-before-reset-${timestamp}.sqlite3`);

	try {
		await copyFile(dbPath, backupPath);
	} catch (cause) {
		const errorCode = (cause as NodeJS.ErrnoException | undefined)?.code;
		if (errorCode && errorCode !== 'ENOENT') {
			console.error('[database-reset] gagal membuat backup sebelum reset', cause);
			// Restore the client so the app stays usable after aborting the reset.
			await reloadDbClient().catch(() => {});
			throw error(500, 'Gagal membuat backup sebelum reset. Reset dibatalkan.');
		}
		console.warn('[database-reset] berkas database tidak ditemukan saat backup (dilanjutkan)');
	}

	// Delete the database file along with its WAL/SHM companions.
	for (const suffix of ['', '-wal', '-shm']) {
		try {
			await unlink(dbPath + suffix);
		} catch {
			/* ignore if not present */
		}
	}

	// Reconnect — libsql recreates an empty database file on connect. If this
	// fails the app would be left without a working DB, so surface the error.
	await reloadDbClient();

	// Re-apply schema migrations and bootstrap data (default admin, permission
	// migration, etc.) against the fresh database.
	try {
		resetStartupEnsures();
		await runStartupEnsures();
		console.info('[database-reset] schema ensures re-applied');
	} catch (e) {
		console.warn('[database-reset] failed to re-apply schema ensures (non-fatal):', e);
	}

	// Clear auth session cookie so the user must re-login against the fresh DB.
	try {
		const secure = process.env.NODE_ENV === 'production';
		cookies.set(cookieNames.AUTH_SESSION, '', {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure,
			expires: new Date(0)
		});
	} catch (e) {
		console.warn('[database-reset] failed to clear auth session cookie (non-fatal):', e);
	}

	console.log('[database-reset] reset selesai. Backup disimpan di', backupPath);

	return json({
		message: 'Database berhasil direset. Silakan login ulang.',
		logout: true,
		loginPath: '/login'
	});
}
