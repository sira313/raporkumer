import { createClient } from '@libsql/client';

import fs from 'node:fs';
import path from 'node:path';

// Try to derive permissions list from source file `src/routes/pengguna/permissions.ts`.
// If parsing fails, fall back to a conservative static list.
function derivePermissionsFromSource() {
	try {
		const filePath = path.resolve(process.cwd(), 'src/routes/pengguna/permissions.ts');
		const src = fs.readFileSync(filePath, 'utf8');

		// Regex to capture each group and its values array content.
		// Matches patterns like: key: { values: [ ['x', '...'], ['y','...'] ], description: '...' }
		const groupRe = /(["']?)([a-zA-Z0-9_]+)\1\s*:\s*\{[\s\S]*?values\s*:\s*\[([\s\S]*?)\]/g;
		const permSet = new Set();
		let m;
		while ((m = groupRe.exec(src)) !== null) {
			const group = m[2];
			const valuesBlock = m[3];
			// Find actions inside nested arrays: ['action', 'Label']
			const actionRe = /['"]([a-zA-Z0-9_]+)['"]\s*,\s*['"]/g;
			let a;
			while ((a = actionRe.exec(valuesBlock)) !== null) {
				permSet.add(`${group}_${a[1]}`);
			}
		}

		const perms = Array.from(permSet);
		if (perms.length) return perms;
	} catch (err) {
		console.warn(
			'[grant-admin-perms] Failed to derive permissions from source:',
			err?.message ?? err
		);
	}
	// fallback
	return [
		'user_list',
		'user_detail',
		'user_add',
		'user_delete',
		'user_suspend',
		'user_set_permissions',
		'dashboard_manage',
		'sekolah_manage',
		'app_check_update',
		'rapor_manage',
		'kelas_manage',
		'kelas_pindah'
	];
}

const REQUIRED_PERMISSIONS = derivePermissionsFromSource();

const DEFAULT_DB_URL = 'file:./data/database.sqlite3';
const dbUrl = process.env.DB_URL || DEFAULT_DB_URL;

const client = createClient({ url: dbUrl });

async function mergePermissions(existingJson) {
	let existing = [];
	if (existingJson) {
		try {
			existing = JSON.parse(existingJson);
		} catch {
			existing = [];
		}
	}
	const merged = Array.from(new Set([...existing, ...REQUIRED_PERMISSIONS]));
	return merged;
}

async function main() {
	console.info('[grant-admin-perms] Target DB:', dbUrl);

	// Find admin users (type = 'admin' or username_normalized = 'admin')
	const rows = await client.execute({
		sql: "SELECT id, username, username_normalized, permissions FROM auth_user WHERE type = 'admin' OR username_normalized = 'admin'"
	});

	const results = rows.rows || [];
	if (!results.length) {
		console.info('[grant-admin-perms] No admin user found. Nothing to do.');
		await client.close();
		return;
	}

	for (const r of results) {
		const id = r.id;
		const username = r.username || r.username_normalized || String(id);
		const existingJson = r.permissions || '[]';
		const merged = await mergePermissions(existingJson);
		const mergedJson = JSON.stringify(merged);
		await client.execute({
			sql: 'UPDATE auth_user SET permissions = ? WHERE id = ?',
			args: [mergedJson, id]
		});
		console.info(
			`[grant-admin-perms] Updated admin: ${username} (id=${id}) -> ${merged.length} permissions`
		);
	}

	await client.close();
	console.info('[grant-admin-perms] Done.');
}

main().catch((err) => {
	console.error('[grant-admin-perms] Failed', err);
	process.exitCode = 1;
});
