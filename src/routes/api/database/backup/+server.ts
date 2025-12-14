import { env } from '$env/dynamic/private';
import { error } from '@sveltejs/kit';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createClient } from '@libsql/client';

const DEFAULT_DB_URL = 'file:./data/database.sqlite3';

function resolveDatabasePath(url: string) {
	if (url.startsWith('file:')) {
		const cleaned = url.replace(/^file:/, '');
		return resolve(process.cwd(), cleaned);
	}

	throw error(500, 'Database URL tidak didukung untuk backup');
}

async function checkpointWAL(dbUrl: string) {
	try {
		const client = createClient({ url: dbUrl });
		// Force checkpoint to flush all WAL changes to main database file
		await client.execute({ sql: 'PRAGMA wal_checkpoint(FULL)' });
		if (typeof client.close === 'function') await client.close();
	} catch (err) {
		console.warn('[backup] WAL checkpoint warning:', err);
		// Continue with backup even if checkpoint fails
	}
}

export async function GET() {
	const dbUrl = env.DB_URL ?? DEFAULT_DB_URL;
	const dbPath = resolveDatabasePath(dbUrl);

	try {
		await stat(dbPath);
	} catch (cause) {
		console.error('Database file not found', cause);
		throw error(404, 'Berkas database tidak ditemukan');
	}

	// Checkpoint WAL to ensure all changes are in the main database file
	await checkpointWAL(dbUrl);

	const fileBuffer = await readFile(dbPath);
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const filename = `raporkumer-backup-${timestamp}.sqlite3`;
	const body = new Uint8Array(fileBuffer);

	return new Response(body, {
		headers: {
			'Content-Type': 'application/vnd.sqlite3',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Content-Length': fileBuffer.length.toString()
		}
	});
}
