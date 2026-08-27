import { error, json } from '@sveltejs/kit';
import { copyFile, mkdir, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import db from '$lib/server/db';
import { closeDbClient, reloadDbClient } from '$lib/server/db';
import { resolveDatabasePath } from '$lib/server/db-url';
import { runStartupEnsures, resetStartupEnsures } from '$lib/server/db/ensure-bootstrap';
import { cookieNames } from '$lib/utils';
import { resolveSession, verifyUserPassword } from '$lib/server/auth';

function delay(ms: number): Promise<void> {
	return new Promise((r) => setTimeout(r, ms));
}

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

	// ── Step 1: Checkpoint WAL via the live connection ──
	const libsql = db.$client as { execute: (q: { sql: string }) => Promise<unknown> };
	try {
		await libsql.execute({ sql: 'PRAGMA wal_checkpoint(FULL)' });
	} catch (err) {
		console.warn('[database-reset] WAL checkpoint warning:', err);
	}

	// ── Step 2: Backup the database file (best-effort, path may differ) ──
	const dbPath = resolveDatabasePath();
	let backupPath: string | null = null;
	try {
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
		const dbDir = dirname(dbPath);
		await mkdir(dbDir, { recursive: true });
		backupPath = join(dbDir, `database-backup-before-reset-${timestamp}.sqlite3`);
		await copyFile(dbPath, backupPath);
		console.info('[database-reset] backup dibuat di', backupPath);
	} catch (cause) {
		const code = (cause as NodeJS.ErrnoException | undefined)?.code;
		// A missing database file (ENOENT) is fine — nothing to back up. Any
		// other backup failure (disk full, permission denied, lock) is treated
		// as fatal: proceeding would wipe user data with no recovery path.
		if (code === 'ENOENT') {
			// nothing backed up (file missing) — backupPath stays null
		} else {
			console.error('[database-reset] backup gagal, reset dibatalkan', cause);
			await reloadDbClient().catch(() => {});
			throw error(
				500,
				'Gagal membuat backup sebelum reset (database tidak berubah). Periksa ruang disk / izin folder, lalu coba lagi.'
			);
		}
	}

	// ── Step 3: Drop ALL tables via the live connection ──
	// This is the authoritative clear — it uses the same db.$client that the
	// running app uses, so it always targets the correct database regardless of
	// how resolveDatabasePath() resolves the file path.
	try {
		// Disable foreign key enforcement while we drop every table in arbitrary
		// order — dropping a parent table before its children would otherwise
		// fail with SQLITE_CONSTRAINT_FOREIGNKEY.
		//
		// NOTE: SQLite DDL is auto-committed, so this is not transactional. If a
		// DROP fails partway through, some tables may already be gone. To avoid
		// leaving the DB in that broken state we restore the Step-2 backup below.
		await libsql.execute({ sql: 'PRAGMA foreign_keys=OFF' });
		const res = (await libsql.execute({
			sql: "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
		})) as { rows: { name: string }[] };
		for (const row of res.rows) {
			await libsql.execute({ sql: `DROP TABLE IF EXISTS "${row.name}"` });
		}
		// Clear any stale sequence counters so fresh rows restart at 1.
		try {
			const seq = (await libsql.execute({
				sql: 'SELECT name FROM sqlite_sequence'
			})) as { rows: { name: string }[] };
			if (seq.rows.length) {
				await libsql.execute({ sql: 'DELETE FROM sqlite_sequence' });
			}
		} catch {
			/* sqlite_sequence may not exist */
		}
		await libsql.execute({ sql: 'PRAGMA foreign_keys=ON' });
		console.info('[database-reset] semua tabel dihapus via SQL (live connection)');
	} catch (e) {
		// A drop may have partially succeeded before failing. Restore the backup
		// so the user's data is not left in a half-cleared state, then surface
		// the error. If there is no backup, at least re-enable FK enforcement.
		console.error('[database-reset] SQL drop gagal:', e);
		try {
			await libsql.execute({ sql: 'PRAGMA foreign_keys=ON' });
		} catch {
			/* ignore */
		}
		await closeDbClient().catch(() => {});
		if (backupPath) {
			try {
				await copyFile(backupPath, dbPath);
				await reloadDbClient().catch(() => {});
				console.warn('[database-reset] backup dipulihkan setelah drop gagal');
			} catch (restoreErr) {
				console.error('[database-reset] gagal memulihkan backup:', restoreErr);
			}
		}
		throw error(
			500,
			'Gagal mengosongkan database' +
				(backupPath ? '. Data yang ada telah dipulihkan dari backup sebelum reset.' : '.')
		);
	}

	// ── Step 4: Close the client so no WAL lock is held ──
	await closeDbClient();

	// ── Step 5: Best-effort delete of database + WAL/SHM files ──
	// Data is already cleared via the SQL drop in Step 3, so deleting the files
	// is cleanup only. On Windows the OS may still hold WAL/SHM handles briefly
	// after closeDbClient(), so give it a moment before unlinking; failures are
	// harmless since the database is already empty.
	if (process.platform === 'win32') await delay(200);
	for (const suffix of ['', '-wal', '-shm']) {
		try {
			await unlink(dbPath + suffix);
		} catch {
			/* best-effort — data already cleared via SQL drop */
		}
	}

	// ── Step 6: Reconnect and rebuild schema ──
	await reloadDbClient();

	try {
		resetStartupEnsures();
		await runStartupEnsures();
		console.info('[database-reset] schema ensures re-applied');
	} catch (e) {
		console.warn('[database-reset] failed to re-apply schema ensures (non-fatal):', e);
	}

	// ── Step 7: Clear auth session cookie ──
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

	console.log(
		'[database-reset] reset selesai.',
		backupPath ? `Backup disimpan di ${backupPath}` : 'Tanpa backup.'
	);

	return json({
		message: 'Database berhasil direset. Silakan login ulang.',
		logout: true,
		loginPath: '/login'
	});
}
