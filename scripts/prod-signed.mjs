#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function resolveExecutable(cmd, cwd) {
	// If cmd looks like a path, leave it alone.
	if (cmd.includes(path.sep) || path.isAbsolute(cmd)) return cmd;
	const root = cwd ? path.resolve(cwd) : process.cwd();
	// Prefer local node_modules/.bin when available (works in CI and local installs)
	const winExt = process.platform === 'win32' ? '.cmd' : '';
	const candidate = path.join(root, 'node_modules', '.bin', `${cmd}${winExt}`);
	const candidateNoExt = path.join(root, 'node_modules', '.bin', cmd);

	// When running under MSYS/Git Bash on Windows prefer the no-ext shim
	// (a POSIX/JS shim) to avoid spawning .cmd files which require cmd.exe.
	const isMsys = !!process.env.MSYSTEM;
	if (isMsys && fs.existsSync(candidateNoExt)) return candidateNoExt;
	if (fs.existsSync(candidate)) return candidate;
	if (fs.existsSync(candidateNoExt)) return candidateNoExt;
	return cmd;
}

function run(cmd, args = [], opts = {}) {
	console.info(`\n> ${[cmd, ...(args || [])].join(' ')}`);
	const exec = resolveExecutable(cmd, opts.cwd);
	// Prefer to spawn without a shell. If the executable is missing, fail fast
	// and return a helpful error (do not attempt to spawn cmd.exe via shell).
	const res = spawnSync(exec, args, { stdio: 'inherit', shell: false, ...opts });
	if (res.error) {
		console.error('Failed to run:', res.error);
		process.exitCode = 1;
		throw res.error;
	}
	if (res.status !== 0) {
		console.error(`Process exited with code ${res.status}`);
		process.exitCode = res.status;
		throw new Error(`Command failed: ${cmd} ${args ? args.join(' ') : ''}`);
	}
}

async function removeSqliteFiles(dir) {
	try {
		if (!fs.existsSync(dir)) {
			console.info('[prod-signed] data directory not present, nothing to remove');
			return;
		}
		const files = await fs.promises.readdir(dir);
		const toRemove = files.filter((f) => f.toLowerCase().endsWith('.sqlite3'));
		if (toRemove.length === 0) {
			console.info('[prod-signed] no sqlite3 files found in data/');
			return;
		}
		for (const f of toRemove) {
			const p = path.join(dir, f);
			try {
				await fs.promises.unlink(p);
				console.info('[prod-signed] removed', p);
			} catch (err) {
				console.warn('[prod-signed] failed to remove', p, err && (err.message || err));
			}
		}
	} catch (err) {
		console.warn('[prod-signed] error while removing sqlite files:', err && (err.message || err));
	}
}

async function main() {
	const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
	const dataDir = path.join(projectRoot, 'data');

	await removeSqliteFiles(dataDir);

	try {
		// 1) run DB migrations using the same Node binary running this script
		run(process.execPath, [path.join(projectRoot, 'scripts', 'migrate-installed-db.mjs')], {
			cwd: projectRoot
		});

		// 2) build using local Vite if available (invoke JS entry with Node to avoid .cmd/.sh shims)
		const viteBin = path.join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js');
		if (fs.existsSync(viteBin)) {
			run(process.execPath, [viteBin, 'build'], { cwd: projectRoot });
		} else {
			// fallback to invoking the resolved vite executable (may be a shim)
			run('vite', ['build'], { cwd: projectRoot });
		}

		// Ensure installer/scripts has the latest helper scripts we need for packaging
		// (copies specific files from scripts/ to installer/scripts/). This keeps
		// the installer step deterministic when packaging on CI or dev machines.
		run(process.execPath, [path.join(projectRoot, 'scripts', 'sync-to-installer.mjs')], {
			cwd: projectRoot
		});

		// 3) Windows packaging steps require PowerShell. Prefer pwsh then powershell.
		function findPowerShell() {
			// Try pwsh on PATH
			try {
				const r = spawnSync('pwsh', ['-NoProfile', '-Command', 'exit 0'], {
					stdio: 'ignore',
					shell: false
				});
				if (!r.error && r.status === 0) return 'pwsh';
			} catch {
				// ignore
			}
			// Try legacy powershell on PATH
			try {
				const r2 = spawnSync('powershell', ['-NoProfile', '-Command', 'exit 0'], {
					stdio: 'ignore',
					shell: false
				});
				if (!r2.error && r2.status === 0) return 'powershell';
			} catch {
				// ignore
			}
			// Common install paths
			const candidates = [];
			if (process.env.ProgramFiles)
				candidates.push(path.join(process.env.ProgramFiles, 'PowerShell', '7', 'pwsh.exe'));
			if (process.env.SystemRoot)
				candidates.push(
					path.join(
						process.env.SystemRoot,
						'System32',
						'WindowsPowerShell',
						'v1.0',
						'powershell.exe'
					)
				);
			for (const c of candidates) {
				if (c && fs.existsSync(c)) return c;
			}
			return null;
		}

		const powershell = findPowerShell();
		if (!powershell) {
			throw new Error(
				'PowerShell not found on PATH. Windows packaging/signing steps require PowerShell. Run this script from PowerShell or install PowerShell and ensure it is on PATH.'
			);
		}

		// prepare-windows.ps1
		run(
			powershell,
			[
				'-NoProfile',
				'-ExecutionPolicy',
				'Bypass',
				'-File',
				path.join('installer', 'prepare-windows.ps1')
			],
			{ cwd: projectRoot }
		);

		// sign executables
		run(
			powershell,
			[
				'-NoProfile',
				'-ExecutionPolicy',
				'Bypass',
				'-File',
				path.join('installer', 'scripts', 'sign-files.ps1'),
				'-SignExecutables'
			],
			{ cwd: projectRoot }
		);

		// package installer (Inno Setup) via PowerShell -Command may be required to invoke ISCC path
		// try using the same powershell to run the packaged command from package.json
		const innoCmd = `& 'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe' 'installer\\raporkumer.iss'`;
		run(powershell, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', innoCmd], {
			cwd: projectRoot
		});

		// sign installer
		run(
			powershell,
			[
				'-NoProfile',
				'-ExecutionPolicy',
				'Bypass',
				'-File',
				path.join('installer', 'scripts', 'sign-files.ps1'),
				'-SignInstaller'
			],
			{ cwd: projectRoot }
		);

		console.info('\n[prod-signed] All steps completed successfully.');
	} catch (err) {
		console.error('\n[prod-signed] Failed:', err && (err.message || err));
		process.exitCode = process.exitCode || 1;
	}
}

main();
