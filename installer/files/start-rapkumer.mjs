import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, spawnSync } from 'child_process';
import net from 'net';
import os from 'os';

function timeStamp() {
	return new Date().toISOString();
}

async function ensureDir(dir) {
	try {
		await fsPromises.mkdir(dir, { recursive: true });
	} catch {
		void 0;
	}
}

// Copy a directory tree, keeping destination files that already exist.
// Used to migrate legacy user data (ttd, dinas-luar, uploads) from the old
// install-dir location (<install>/data/<sub>) into %LOCALAPPDATA%\Rapkumer-data
// on first run after an upgrade. Returns the number of files copied.
async function copyTreeIfMissing(src, dst, logFile) {
	try {
		const stat = await fsPromises.stat(src);
		if (!stat.isDirectory()) return 0;
	} catch {
		return 0;
	}
	let copied = 0;
	await fsPromises.mkdir(dst, { recursive: true });
	const entries = await fsPromises.readdir(src, { withFileTypes: true });
	for (const entry of entries) {
		const s = path.join(src, entry.name);
		const d = path.join(dst, entry.name);
		if (entry.isDirectory()) {
			copied += await copyTreeIfMissing(s, d, logFile);
		} else if (entry.isFile()) {
			try {
				await fsPromises.access(d);
			} catch {
				try {
					await fsPromises.mkdir(path.dirname(d), { recursive: true });
					await fsPromises.copyFile(s, d);
					copied += 1;
				} catch (err) {
					await appendLog(logFile, `Migrasi data gagal menyalin ${s}: ${String(err)}`);
				}
			}
		}
	}
	return copied;
}

async function appendLog(logFile, msg) {
	const line = `[${timeStamp()}] ${msg}\n`;
	try {
		await fsPromises.appendFile(logFile, line, { encoding: 'utf8' });
	} catch {
		try {
			fs.writeFileSync(logFile, line, { flag: 'a' });
		} catch {
			void 0;
		}
	}
}

async function waitForPort(port, attempts = 10, delayMs = 1000) {
	for (let i = 0; i < attempts; i++) {
		const ok = await new Promise((resolve) => {
			const socket = new net.Socket();
			socket.setTimeout(1000);
			socket.once('error', () => {
				socket.destroy();
				resolve(false);
			});
			socket.once('timeout', () => {
				socket.destroy();
				resolve(false);
			});
			socket.connect(port, '127.0.0.1', () => {
				socket.end();
				resolve(true);
			});
		});
		if (ok) return true;
		await new Promise((r) => setTimeout(r, delayMs));
	}
	return false;
}

async function main() {
	const __filename = fileURLToPath(import.meta.url);
	const APP_HOME = path.dirname(__filename);

	const PORT = process.env.PORT || '3000';
	const NODE_ENV = process.env.NODE_ENV || 'production';

	const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
	const USER_STATE_ROOT = path.join(localAppData, 'Rapkumer-data');
	const LOG_DIR = path.join(USER_STATE_ROOT, 'logs');
	const LOG_FILE = path.join(LOG_DIR, 'rapkumer.log');

	await ensureDir(LOG_DIR);
	await ensureDir(USER_STATE_ROOT);

	await appendLog(LOG_FILE, `Starting Rapkumer (app home: ${APP_HOME})`);

	// Ensure database exists in user folder
	const srcDb = path.join(APP_HOME, '..', 'data', 'database.sqlite3');
	const dstDb = path.join(USER_STATE_ROOT, 'database.sqlite3');
	try {
		if (!fs.existsSync(dstDb)) {
			await appendLog(LOG_FILE, 'Menyalin basis data awal ke direktori pengguna...');
			if (fs.existsSync(srcDb)) {
				await fsPromises.copyFile(srcDb, dstDb);
				await appendLog(LOG_FILE, `Database awal disalin ke ${dstDb}`);
			} else {
				await appendLog(LOG_FILE, `Peringatan: file database sumber tidak ditemukan di ${srcDb}`);
			}
		}
	} catch (err) {
		await appendLog(LOG_FILE, `Error while ensuring database: ${String(err)}`);
	}

	// Migrate legacy user data from the install dir into the user-data root on
	// first run, so ttd / dinas-luar / uploads keep working after an in-place
	// upgrade. The pre-upgrade app wrote to <cwd>/data/<sub> with cwd = the app
	// dir, so check {app}\data first, then {app}\..\data for older layouts.
	// Files that already exist in the target win (photos uploaded via the
	// `photo` env already live in the user dir).
	const legacyCandidates = [path.join(APP_HOME, 'data'), path.join(APP_HOME, '..', 'data')];
	let legacyDataRoot = null;
	for (const cand of legacyCandidates) {
		try {
			const st = await fsPromises.stat(cand);
			if (st.isDirectory()) {
				legacyDataRoot = cand;
				break;
			}
		} catch {
			// keep looking
		}
	}
	if (legacyDataRoot) {
		for (const sub of ['ttd', 'dinas-luar', 'uploads', 'sounds']) {
			const srcSub = path.join(legacyDataRoot, sub);
			if (!fs.existsSync(srcSub)) continue;
			const dstSub = path.join(USER_STATE_ROOT, sub);
			try {
				const copied = await copyTreeIfMissing(srcSub, dstSub, LOG_FILE);
				if (copied > 0) {
					await appendLog(LOG_FILE, `Data ${sub} dipindahkan dari ${srcSub} (${copied} file baru)`);
				}
			} catch (err) {
				await appendLog(LOG_FILE, `Gagal memigrasi ${sub}: ${String(err)}`);
			}
		}
	}

	// PagedJS + Puppeteer will use system Chrome/Chromium for PDF generation

	// Prepare DB URL (replace backslashes with slashes)
	const DB_URL = 'file:' + dstDb.replace(/\\/g, '/');

	await appendLog(LOG_FILE, `Using DB_URL=${DB_URL}`);

	console.log(`Menjalankan Rapkumer pada http://localhost:${PORT}`);
	await appendLog(
		LOG_FILE,
		`Starting Rapkumer using node start-build.mjs on port ${PORT} with DB_URL=${DB_URL}`
	);

	const childEnv = {
		...process.env,
		PORT: String(PORT),
		NODE_ENV,
		BODY_SIZE_LIMIT: '5242880',
		DB_URL,
		DATABASE_URL: DB_URL,
		RAPKUMER_DATA_DIR: USER_STATE_ROOT
	};
	const nodeBin = process.execPath || 'node';

	// Run database migration synchronously before starting the server
	// This ensures the schema is always up-to-date (especially after version upgrades)
	const migrateScript = path.join(APP_HOME, 'scripts', 'migrate-installed-db.mjs');
	if (fs.existsSync(migrateScript)) {
		await appendLog(LOG_FILE, 'Menjalankan migrasi database...');
		try {
			const result = spawnSync(nodeBin, [migrateScript], {
				cwd: APP_HOME,
				env: childEnv,
				stdio: ['ignore', 'pipe', 'pipe'],
				timeout: 120000
			});
			if (result.error) {
				await appendLog(LOG_FILE, `Migrasi database error: ${result.error.message}`);
				console.error('[start-rapkumer] Database migration error:', result.error.message);
			} else if (result.status === 0) {
				await appendLog(LOG_FILE, 'Migrasi database berhasil');
			} else {
				const stderr = result.stderr?.toString() || '';
				const stdout = result.stdout?.toString() || '';
				await appendLog(
					LOG_FILE,
					`Migrasi database gagal (exit code ${result.status}): ${stderr}${stdout}`
				);
				console.error('[start-rapkumer] Database migration failed:', stderr || stdout);
			}
		} catch (err) {
			await appendLog(LOG_FILE, `Error saat migrasi database: ${String(err)}`);
			console.error('[start-rapkumer] Database migration error:', err);
		}
	} else {
		await appendLog(LOG_FILE, `Script migrasi tidak ditemukan di ${migrateScript}, dilewati`);
	}

	// Spawn the start-build script as a detached background process.
	// Redirect stdout/stderr directly into the log file so the parent can exit.
	let outFd = null;
	try {
		outFd = fs.openSync(LOG_FILE, 'a');
	} catch (e) {
		await appendLog(LOG_FILE, `Failed to open log file descriptor: ${String(e)}`);
	}

	const stdio = outFd !== null ? ['ignore', outFd, outFd] : ['ignore', 'ignore', 'ignore'];

	const child = spawn(nodeBin, ['start-build.mjs'], {
		cwd: APP_HOME,
		env: childEnv,
		detached: true,
		stdio,
		windowsHide: true
	});

	child.on('error', async (err) => {
		await appendLog(LOG_FILE, `Failed to spawn start-build.mjs: ${String(err)}`);
	});

	try {
		child.unref();
	} catch {
		void 0;
	}

	// Close our copy of the descriptor; the child has its own copy.
	if (outFd !== null) {
		try {
			fs.closeSync(outFd);
		} catch {
			void 0;
		}
	}

	// Wait for server to be available, then open browser on Windows
	const listening = await waitForPort(Number(PORT), 10, 1000);
	if (listening) {
		await appendLog(LOG_FILE, 'Server is listening on port ' + PORT);
		if (process.platform === 'win32') {
			const url = `http://localhost:${PORT}`;
			console.log('Sedang membuka Rapkumer...');
			await appendLog(LOG_FILE, `Opening browser to ${url}`);
			const cmdPath = process.env.ComSpec || 'cmd.exe';
			try {
				const opener = spawn(cmdPath, ['/c', 'start', '', url], {
					windowsHide: true,
					detached: true
				});
				opener.on('error', async (e) => {
					await appendLog(LOG_FILE, `Failed to open browser (spawn error): ${String(e)}`);
				});
				try {
					opener.unref();
				} catch {
					void 0;
				}
			} catch (err) {
				await appendLog(LOG_FILE, `Failed to open browser: ${String(err)}`);
			}

			// Exit parent process so the terminal closes, leaving the detached server running
			process.exit(0);
		}
	} else {
		await appendLog(LOG_FILE, 'Warning: server did not respond after waiting');
	}
}

main().catch(async (err) => {
	const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
	const LOG_FILE = path.join(localAppData, 'Rapkumer-data', 'logs', 'rapkumer.log');
	try {
		await appendLog(LOG_FILE, `Fatal: ${String(err)}`);
	} catch {
		void 0;
	}
	console.error(err);

	// Detect @libsql native addon failure
	const msg = (err && (err.message || String(err))) || '';
	if (
		msg.includes('@libsql') &&
		(msg.includes('index.node') || msg.includes('ERR_DLOPEN_FAILED'))
	) {
		console.error('');
		console.error('=====================================================================');
		console.error('KESALAHAN: Native addon @libsql/win32-x64-msvc gagal dimuat.');
		console.error('');
		console.error('Kemungkinan penyebab: Microsoft Visual C++ Redistributable');
		console.error('2015-2022 (x64) belum terinstall di komputer ini.');
		console.error('');
		console.error('Solusi: Jalankan ulang installer Rapkumer, atau unduh dan');
		console.error('install langsung dari Microsoft:');
		console.error('  https://aka.ms/vs/17/release/vc_redist.x64.exe');
		console.error('=====================================================================');
	}

	process.exit(1);
});
