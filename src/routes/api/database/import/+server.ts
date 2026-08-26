import { error, json } from '@sveltejs/kit';
import { copyFile, mkdir, stat, writeFile, unlink } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { closeDbClient, reloadDbClient } from '$lib/server/db';
import { resolveDatabasePath } from '$lib/server/db-url';
import { runStartupEnsures, resetStartupEnsures } from '$lib/server/db/ensure-bootstrap';
import { execFile } from 'node:child_process';
import { cookieNames } from '$lib/utils';
import { resolveSession } from '$lib/server/auth';

function runScript(script: string, options: { env?: NodeJS.ProcessEnv; maxBuffer?: number } = {}) {
	const scriptPath = resolve(process.cwd(), 'scripts', script);
	console.info('[database-import] running', script);
	return new Promise<void>((resolvePromise, rejectPromise) => {
		const child = execFile(
			process.execPath,
			[scriptPath],
			{
				windowsHide: true,
				env: options.env,
				maxBuffer: options.maxBuffer ?? 10 * 1024 * 1024
			},
			(err, stdout, stderr) => {
				if (stdout && String(stdout).trim())
					console.info('[' + script + ' stdout]', String(stdout).trim());
				if (stderr && String(stderr).trim())
					console.warn('[' + script + ' stderr]', String(stderr).trim());
				if (err) return rejectPromise(err);
				resolvePromise();
			}
		);
		child.on('error', (e) => rejectPromise(e));
	});
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
	if (
		!resolved ||
		!resolved.user ||
		(resolved.user.type !== 'admin' && resolved.user.type !== 'kepala_sekolah')
	) {
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

	const dbPath = resolveDatabasePath();
	const dbDir = dirname(dbPath);

	await mkdir(dbDir, { recursive: true });

	// Read uploaded file into buffer
	const uploadedBuffer = Buffer.from(await file.arrayBuffer());

	// Verify buffer length matches expected file size
	if (uploadedBuffer.length !== file.size) {
		console.error(
			'[database-import] ukuran buffer tidak sesuai:',
			uploadedBuffer.length,
			'(expected:',
			file.size,
			')'
		);
		throw error(500, 'Berkas database tidak lengkap');
	}

	if (uploadedBuffer.length < 100) {
		console.error('[database-import] buffer terlalu kecil, bukan database SQLite yang valid');
		throw error(500, 'Berkas database tidak valid');
	}

	// Write to a temp file first, then atomically replace the target.
	// This prevents partial writes if the server crashes mid-import.
	const tempPath = join(dbDir, `database-import-temp-${Date.now()}.sqlite3`);
	try {
		await writeFile(tempPath, uploadedBuffer);
		const writtenStat = await stat(tempPath);
		if (writtenStat.size !== uploadedBuffer.length) {
			throw error(500, 'Gagal menulis berkas database: ukuran tidak sesuai');
		}
	} catch {
		await unlink(tempPath).catch(() => {});
		throw error(500, 'Gagal menyimpan berkas database');
	}

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const backupPath = join(dbDir, `database-backup-before-import-${timestamp}.sqlite3`);

	// Close the current DB client so no process holds a WAL lock
	await closeDbClient();

	// Backup current database (if exists)
	try {
		await copyFile(dbPath, backupPath);
	} catch (cause) {
		const errorCode = (cause as NodeJS.ErrnoException | undefined)?.code;
		if (errorCode && errorCode !== 'ENOENT') {
			console.error('[database-import] gagal membuat backup database', cause);
			throw error(500, 'Gagal membuat backup database');
		}
	}

	// Atomically replace the database file
	try {
		await unlink(dbPath).catch(() => {});
		await copyFile(tempPath, dbPath);
	} catch (cause) {
		console.error('[database-import] gagal mengganti berkas database', cause);
		throw error(500, 'Gagal menyimpan berkas database');
	} finally {
		await unlink(tempPath).catch(() => {});
	}

	// Delete stale WAL and SHM companion files
	for (const ext of ['-wal', '-shm']) {
		try {
			await unlink(dbPath + ext);
		} catch {
			/* ignore if not present */
		}
	}

	console.log('[database-import] import selesai. Backup disimpan di', backupPath);

	// Clear auth session cookie so user must re-login against the imported DB
	try {
		const secure = process.env.NODE_ENV === 'production';
		cookies.set(cookieNames.AUTH_SESSION, '', {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure,
			expires: new Date(0)
		});
		console.info('[database-import] cleared auth session cookie');
	} catch (e) {
		console.warn('[database-import] failed to clear auth session cookie (non-fatal):', e);
	}

	// Bring the imported database up to date with the current schema (the
	// equivalent of `pnpm db:push`). Older backup files may lack tables/columns
	// that the current version expects (e.g. `login_attempt`), so run the same
	// non-destructive migration steps the installer uses. We deliberately skip
	// `drizzle-kit push --force` here: pushing a newer backup onto an older app
	// version could silently drop tables/columns the current schema doesn't know.
	try {
		await runScript('fix-drizzle-indexes.mjs', {
			env: { ...process.env, DB_URL: `file:${dbPath}` }
		});
		await runScript('ensure-columns.mjs', {
			env: { ...process.env, DB_URL: `file:${dbPath}` }
		});
		console.info('[database-import] schema migration steps completed');
	} catch (e) {
		console.warn('[database-import] schema migration steps failed (non-fatal):', e);
	}

	// Run essential post-import scripts (seed admin + grant permissions).
	for (const script of ['seed-default-admin.mjs', 'grant-admin-permissions.mjs']) {
		try {
			await runScript(script);
			console.info('[database-import]', script, 'completed');
		} catch (e) {
			console.warn('[database-import]', script, 'failed (non-fatal):', e);
		}
	}

	// Reload DB client so the server picks up the imported database.
	try {
		await reloadDbClient();
		console.info('[database-import] reloaded DB client');
	} catch (e) {
		console.warn('[database-import] failed to reload DB client (non-fatal):', e);
	}

	// Re-apply the startup schema ensures against the imported DB. The in-process
	// "already ensured" cache was populated for the previous database, so without
	// a reset the ensure-* helpers would skip the imported one. This is the
	// safety net for production installs where drizzle-kit is not available.
	try {
		resetStartupEnsures();
		await runStartupEnsures();
		console.info('[database-import] schema ensures re-applied');
	} catch (e) {
		console.warn('[database-import] failed to re-apply schema ensures (non-fatal):', e);
	}

	return json({
		message: 'Database berhasil diimport. Silakan login ulang.',
		logout: true,
		loginPath: '/login'
	});
}
