#!/usr/bin/env node
import { createClient } from '@libsql/client';

const DEFAULT_DB_URL = 'file:./data/database.sqlite3';
const dbUrl = process.env.DB_URL || DEFAULT_DB_URL;

async function tableHasColumn(client, table, column) {
	// Return detailed info: { exists: boolean, type: string | undefined }
	try {
		const res = await client.execute({ sql: `PRAGMA table_info('${table}')` });
		const rows = res.rows || [];
		// PRAGMA table_info returns rows with columns: cid, name, type, notnull, dflt_value, pk
		for (const r of rows) {
			const name = (r.name || r[1] || '').toString();
			if (name.toLowerCase() === column.toLowerCase()) {
				const type = (r.type || r[2] || '').toString();
				return { exists: true, type };
			}
		}
		return { exists: false };
	} catch (err) {
		const msg = err && (err.message || err.toString());
		if (msg && /no such table/i.test(msg)) {
			console.warn(`[ensure-columns] Table not present: ${table}`);
			return { exists: false };
		}
		throw err;
	}
}

async function addColumnIfMissing(client, table, column, type) {
	const info = await tableHasColumn(client, table, column);
	if (info.exists) {
		console.info(
			`[ensure-columns] Column ${column} already present on ${table} (type=${info.type || 'unknown'})`
		);
		// If type is provided and looks different, warn but do not attempt risky migration here
		if (info.type && type && info.type.toUpperCase() !== String(type).split(' ')[0].toUpperCase()) {
			console.warn(
				`[ensure-columns] Column ${column} on ${table} has type ${info.type} which differs from expected ${type}.` +
					' Leave as-is; manual migration may be required.'
			);
		}

		return { added: false };
	}

	console.info(`[ensure-columns] Adding column ${column} to ${table}`);
	try {
		await client.execute({ sql: `ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}` });
		console.info(`[ensure-columns] Added ${column} on ${table}`);
		return { added: true };
	} catch (err) {
		const msg = err && (err.message || err.toString());
		console.error(`[ensure-columns] Failed to add column ${column} to ${table}:`, msg || err);
		// don't throw - allow migrate process to continue and let drizzle report final error
		return { added: false, error: msg };
	}
}

async function main() {
	console.info('[ensure-columns] Target DB:', dbUrl);
	const client = createClient({ url: dbUrl });
	const added = [];
	const skipped = [];

	try {
		// Columns referenced by migrations that may be missing in older installed DBs.
		// If missing, add them so subsequent migration UPDATE statements do not fail.
		const checks = [
			{ table: 'tasks', column: 'sekolah_id', type: 'INTEGER' },
			{ table: 'tasks', column: 'kelas_id', type: 'INTEGER' },
			{ table: 'kelas', column: 'sekolah_id', type: 'INTEGER' },
			{ table: 'mata_pelajaran', column: 'kelas_id', type: 'INTEGER' },
			// permissions column stores a JSON array as TEXT (default '[]').
			// Add this so older DBs without the column won't break seed/migration scripts.
			{ table: 'auth_user', column: 'permissions', type: "TEXT NOT NULL DEFAULT '[]'" },
			// 'type' column indicates user type; keep default in sync with schema (admin/wali_kelas/user)
			{ table: 'auth_user', column: 'type', type: "TEXT NOT NULL DEFAULT 'admin'" },
			// Common foreign key columns older DBs may lack
			{ table: 'auth_user', column: 'pegawai_id', type: 'INTEGER' },
			{ table: 'auth_user', column: 'kelas_id', type: 'INTEGER' },
			{ table: 'auth_user', column: 'mata_pelajaran_id', type: 'INTEGER' },
			{ table: 'sekolah', column: 'kepala_sekolah_id', type: 'INTEGER' },
			{ table: 'kelas', column: 'wali_kelas_id', type: 'INTEGER' },
			{ table: 'murid', column: 'kelas_id', type: 'INTEGER' },
			// Columns for mata_pelajaran relations used by asesmen/tujuan tables
			{ table: 'tujuan_pembelajaran', column: 'mata_pelajaran_id', type: 'INTEGER' },
			{ table: 'asesmen_sumatif', column: 'mata_pelajaran_id', type: 'INTEGER' },
			{ table: 'asesmen_sumatif_tujuan', column: 'mata_pelajaran_id', type: 'INTEGER' },
			{ table: 'asesmen_formatif', column: 'mata_pelajaran_id', type: 'INTEGER' },
			// Columns referenced by newer migrations that older DBs may not have
			{ table: 'auth_user', column: 'sekolah_id', type: 'INTEGER' },
			{ table: 'feature_unlock', column: 'sekolah_id', type: 'INTEGER' },
			{ table: 'tahun_ajaran', column: 'sekolah_id', type: 'INTEGER' }
		];

		for (const c of checks) {
			const res = await addColumnIfMissing(client, c.table, c.column, c.type);
			if (res && res.added) added.push(`${c.table}.${c.column}`);
			else skipped.push(`${c.table}.${c.column}`);
		}

		console.info('[ensure-columns] Summary:');
		console.info('[ensure-columns] Added columns:', added.length ? added.join(', ') : '(none)');
		console.info(
			'[ensure-columns] Skipped (already present):',
			skipped.length ? skipped.join(', ') : '(none)'
		);
	} catch (err) {
		console.error('[ensure-columns] Unexpected error:', err && (err.message || err.toString()));
		process.exitCode = 1;
	} finally {
		if (typeof client.close === 'function') await client.close();
	}
}

main().catch((err) => {
	console.error('[ensure-columns] Unhandled error:', err && (err.message || err.toString()));
	process.exitCode = 1;
});
