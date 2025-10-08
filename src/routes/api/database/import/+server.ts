import { env } from '$env/dynamic/private';
import { error, json } from '@sveltejs/kit';
import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

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

	if (!(file instanceof File)) {
		throw error(400, 'Berkas database tidak ditemukan');
	}

	if (file.size === 0) {
		throw error(400, 'Berkas database kosong');
	}

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
			console.error('Gagal membuat backup database sebelum import', cause);
			throw error(500, 'Gagal membuat backup database sebelum import');
		}
	}

	try {
		await writeFile(dbPath, uploadedBuffer);
	} catch (cause) {
		console.error('Gagal menulis berkas database', cause);
		throw error(500, 'Gagal menyimpan berkas database');
	}

	try {
		await stat(dbPath);
	} catch (cause) {
		console.error('Database hasil import tidak ditemukan', cause);
		throw error(500, 'Import database gagal, berkas tidak ditemukan setelah penulisan');
	}

	return json({ message: 'Database berhasil diimport.' });
}
