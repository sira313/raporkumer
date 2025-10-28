import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { reloadDbClient } from '$lib/server/db';
import { execFile } from 'node:child_process';

const DEFAULT_DB_URL = 'file:./data/database.sqlite3';

function resolveDatabasePath(url: string) {
	if (url.startsWith('file:')) {
		const cleaned = url.replace(/^file:/, '');
		return resolve(process.cwd(), cleaned);
	}

	throw error(500, 'Database URL tidak didukung untuk import');
}

export async function POST({ request }) {
	const formData = await request.formData();
	const file = formData.get('database');
	console.log('[database-import] menerima permintaan import');

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

	// attempt to normalize indexes automatically after import so older DB dumps
	// don't leave behind incompatible index names that later cause insert failures.
	(async () => {
		try {
			const script = resolve(process.cwd(), 'scripts', 'fix-drizzle-indexes.mjs');
			console.info('[database-import] running index-fixer script:', script);
			await new Promise((resolvePromise, rejectPromise) => {
				const child = execFile(
					process.execPath,
					[script],
					{ windowsHide: true },
					(err, stdout, stderr) => {
						if (stdout && String(stdout).trim())
							console.info('[fix-drizzle-indexes stdout]', String(stdout).trim());
						if (stderr && String(stderr).trim())
							console.warn('[fix-drizzle-indexes stderr]', String(stderr).trim());
						if (err) return rejectPromise(err);
						resolvePromise(null);
					}
				);
				// safety: if the child doesn't start, reject
				child.on('error', (e) => rejectPromise(e));
			});
			console.info('[database-import] index-fixer completed');
			// after fixing indexes on disk, reload client again to ensure any internal
			// cached schema state is refreshed
			try {
				await reloadDbClient();
				console.info('[database-import] reloaded DB client after index-fixer');
			} catch (e) {
				console.warn('[database-import] failed to reload DB client after fixer (non-fatal):', e);
			}
		} catch (e) {
			console.warn('[database-import] index-fixer failed (non-fatal):', e);
		}
	})();
	return json({ message: 'Database berhasil diimport.' });
}
