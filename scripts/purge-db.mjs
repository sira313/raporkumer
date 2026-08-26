#!/usr/bin/env node
// Purges SQLite database files (main DB + WAL/SHM sidecars).
//
// Target resolution:
//   1. .env / DB_URL env (file: URL or plain path) -> only that DB is purged
//   2. Otherwise: <project>/data/database.sqlite3 plus any stray
//      .sqlite3/.sqlite3-wal/.sqlite3-shm files in <project>/data/
//      (same scope as scripts/cleanup-db.mjs used by `pnpm prod`)
//
// Usage:
//   node scripts/purge-db.mjs        # asks for confirmation first
//   node scripts/purge-db.mjs -y     # skip confirmation

import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const skipConfirm = args.includes('-y') || args.includes('--yes');

function stripFileUrl(url) {
	if (!url) return null;
	return url.startsWith('file:') ? url.slice('file:'.length) : url;
}

// Same dependency-free `.env` loader as src/lib/server/db/index.ts so the purge
// target matches the DB the app actually uses.
function loadDotEnvIfPresent() {
	if (process.env.DB_URL) return;

	try {
		const envPath = path.resolve(process.cwd(), '.env');
		if (!fs.existsSync(envPath)) return;
		const raw = fs.readFileSync(envPath, 'utf8');
		for (const line of raw.split(/\r?\n/)) {
			const m = line.match(/^\s*DB_URL\s*=\s*(.*)\s*$/);
			if (m) process.env.DB_URL = m[1].replace(/^["']|["']$/g, '');
		}
	} catch {
		// Non-fatal: fall back to project data dir sweep
	}
}

function formatBytes(bytes) {
	if (bytes < 1024) return `${bytes} B`;
	const units = ['KB', 'MB', 'GB'];
	let value = bytes;
	let unit = 'B';
	for (const u of units) {
		if (value < 1024) break;
		value /= 1024;
		unit = u;
	}
	return `${value.toFixed(1)} ${unit}`;
}

function collectTargets() {
	const targets = [];
	const seen = new Set();
	const push = (p) => {
		const resolved = path.resolve(p);
		if (seen.has(resolved) || !fs.existsSync(resolved)) return;
		seen.add(resolved);
		targets.push({ path: resolved, size: fs.statSync(resolved).size });
	};
	const withSidecars = (dbPath) => {
		push(dbPath);
		push(`${dbPath}-wal`);
		push(`${dbPath}-shm`);
	};

	loadDotEnvIfPresent();
	const envDb = stripFileUrl(process.env.DB_URL);
	if (envDb) {
		withSidecars(envDb);
	} else {
		withSidecars(path.join(projectRoot, 'data', 'database.sqlite3'));

		// Sweep any other SQLite files in the project data dir
		const dataDir = path.join(projectRoot, 'data');
		if (fs.existsSync(dataDir)) {
			for (const file of fs.readdirSync(dataDir)) {
				if (/\.sqlite3(-wal|-shm)?$/.test(file)) push(path.join(dataDir, file));
			}
		}
	}

	return targets;
}

async function confirmDeletion(targets) {
	console.log('[purge-db] The following files will be permanently deleted:');
	for (const t of targets) {
		console.log(`[purge-db]   - ${t.path} (${formatBytes(t.size)})`);
	}
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	const answer = (await rl.question('[purge-db] Continue? [y/N] ')).trim().toLowerCase();
	rl.close();
	return answer === 'y' || answer === 'yes';
}

async function main() {
	const targets = collectTargets();

	if (targets.length === 0) {
		console.log('[purge-db] ✓ Nothing to purge');
		process.exit(0);
	}

	if (!skipConfirm && !(await confirmDeletion(targets))) {
		console.log('[purge-db] Aborted, no files were deleted');
		process.exit(0);
	}

	let removed = 0;
	for (const t of targets) {
		try {
			fs.unlinkSync(t.path);
			removed++;
			console.log(`[purge-db] ✓ Removed: ${t.path}`);
		} catch (err) {
			console.error(`[purge-db] ✗ Failed to remove ${t.path}: ${err.message}`);
			process.exitCode = 1;
		}
	}

	console.log(`[purge-db] ✓ Done: ${removed}/${targets.length} file(s) removed`);
}

main();
