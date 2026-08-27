import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Jalankan pipeline `pnpm db:push` (scripts/migrate-installed-db.mjs) di background
 * sebagai rekonsiliasi skema setelah peristiwa besar seperti sinkronisasi Dapodik.
 *
 * Skrip itu sendiri sudah aman-dijalankan-ulang (idempoten) dan melompati drizzle-kit
 * bila tidak tersedia pada instalasi produksi — tabel tetap dibuat oleh ensure-* saat
 * startup. Setelah selesai, skrip memanggil notify-server-reload sehingga proses server
 * yang sedang berjalan memuat ulang klien DB.
 */

const DEBOUNCE_MS = 30_000;

let lastTriggeredAt = 0;
let inFlight = false;

function resolveScriptPath(): string | null {
	const candidates = [
		path.join(process.cwd(), 'scripts', 'migrate-installed-db.mjs'),
		// Layout build terpasang: build/index.js berjalan dengan cwd <install>, skrip
		// mungkin berada satu tingkat di atas.
		path.resolve(process.cwd(), '..', 'scripts', 'migrate-installed-db.mjs')
	];
	for (const candidate of candidates) {
		try {
			if (fs.existsSync(candidate)) return candidate;
		} catch {
			// ignore fs errors and try next candidate
		}
	}
	return null;
}

/**
 * Picu rekonsiliasi skema sekali jalan tanpa menahan respons. Dipanggil setelah
 * sinkronisasi Dapodik berhasil; diam-diam dilewati bila skrip tidak ditemukan
 * (mis. layout produksi tanpa folder scripts) atau masih dalam jeda debounce.
 */
export function triggerSchemaSync(): void {
	if (inFlight) return;
	if (Date.now() - lastTriggeredAt < DEBOUNCE_MS) return;
	const script = resolveScriptPath();
	if (!script) {
		console.info(
			'[schema-sync] scripts/migrate-installed-db.mjs tidak ditemukan; lewati auto db:push'
		);
		return;
	}

	lastTriggeredAt = Date.now();
	inFlight = true;
	console.info('[schema-sync] menjalankan db:push di latar belakang:', script);

	try {
		const child = spawn(process.execPath, [script], {
			detached: true,
			stdio: 'ignore',
			env: process.env,
			windowsHide: true
		});
		child.on('exit', (code) => {
			inFlight = false;
			console.info(`[schema-sync] db:push selesai (exit code ${code ?? '?'})`);
		});
		child.on('error', (err) => {
			inFlight = false;
			console.warn('[schema-sync] gagal menjalankan db:push:', err.message);
		});
		child.unref();
	} catch (e) {
		inFlight = false;
		console.warn('[schema-sync] spawn gagal:', e instanceof Error ? e.message : String(e));
	}
}
