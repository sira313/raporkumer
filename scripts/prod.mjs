#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function resolveExecutable(cmd, cwd) {
    if (cmd.includes(path.sep) || path.isAbsolute(cmd)) return cmd;
    const root = cwd ? path.resolve(cwd) : process.cwd();
    const winExt = process.platform === 'win32' ? '.cmd' : '';
    const candidate = path.join(root, 'node_modules', '.bin', `${cmd}${winExt}`);
    const candidateNoExt = path.join(root, 'node_modules', '.bin', cmd);

    const isMsys = !!process.env.MSYSTEM;
    if (isMsys && fs.existsSync(candidateNoExt)) return candidateNoExt;
    if (fs.existsSync(candidate)) return candidate;
    if (fs.existsSync(candidateNoExt)) return candidateNoExt;
    return cmd;
}

function run(cmd, args = [], opts = {}) {
    console.info(`\n> ${[cmd, ...(args || [])].join(' ')}`);
    const exec = resolveExecutable(cmd, opts.cwd);
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
            console.info('[prod] data directory not present, nothing to remove');
            return;
        }
        const files = await fs.promises.readdir(dir);
        const toRemove = files.filter((f) => f.toLowerCase().endsWith('.sqlite3'));
        if (toRemove.length === 0) {
            console.info('[prod] no sqlite3 files found in data/');
            return;
        }
        for (const f of toRemove) {
            const p = path.join(dir, f);
            try {
                await fs.promises.unlink(p);
                console.info('[prod] removed', p);
            } catch (err) {
                console.warn('[prod] failed to remove', p, err && (err.message || err));
            }
        }
    } catch (err) {
        console.warn('[prod] error while removing sqlite files:', err && (err.message || err));
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
            run('vite', ['build'], { cwd: projectRoot });
        }

        // Ensure installer/scripts has the latest helper scripts we need for packaging
        run(process.execPath, [path.join(projectRoot, 'scripts', 'sync-to-installer.mjs')], {
            cwd: projectRoot
        });

        // Windows packaging steps: prefer pwsh then powershell if available. We still use PowerShell
        // to run installer preparation and Inno Setup packaging, but do NOT perform signing.
        function findPowerShell() {
            try {
                const r = spawnSync('pwsh', ['-NoProfile', '-Command', 'exit 0'], {
                    stdio: 'ignore',
                    shell: false
                });
                if (!r.error && r.status === 0) return 'pwsh';
            } catch (_) { void _; }
            try {
                const r2 = spawnSync('powershell', ['-NoProfile', '-Command', 'exit 0'], {
                    stdio: 'ignore',
                    shell: false
                });
                if (!r2.error && r2.status === 0) return 'powershell';
            } catch (_) { void _; }
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
                'PowerShell not found on PATH. Windows packaging steps require PowerShell. Run this script from PowerShell or install PowerShell and ensure it is on PATH.'
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
                path.join('installer', 'prepare-windows.ps1'),
                '-SkipBuild'
            ],
            { cwd: projectRoot }
        );

        // Package installer (Inno Setup). This will create an unsigned installer.
        const innoCmd = `& 'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe' 'installer\\raporkumer.iss'`;
        run(powershell, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', innoCmd], {
            cwd: projectRoot
        });

        console.info('\n[prod] All steps completed successfully (unsigned build/installer).');
    } catch (err) {
        console.error('\n[prod] Failed:', err && (err.message || err));
        process.exitCode = process.exitCode || 1;
    }
}

main();
