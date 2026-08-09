import fs from 'node:fs/promises';
import path from 'node:path';
import { dataRoot, defaultDataRoot, soundsDir, uploadsDir } from '$lib/server/data-dirs';
import { envFilePath } from '$lib/server/env-file';

export interface StorageInfo {
	dataRoot: string;
	uploads: string;
	sounds: string;
	envFile: string;
	envFileExists: boolean;
	/** True when the running process overrides RAPKUMER_DATA_DIR (Windows launcher). */
	rootManagedByLauncher: boolean;
}

/** Current effective storage locations, as resolved by the running process. */
export async function getStorageInfo(): Promise<StorageInfo> {
	const envFile = envFilePath();
	let envFileExists: boolean;
	try {
		const st = await fs.stat(envFile);
		envFileExists = st.isFile();
	} catch {
		envFileExists = false;
	}
	return {
		dataRoot: dataRoot(),
		uploads: uploadsDir(),
		sounds: soundsDir(),
		envFile,
		envFileExists,
		// Only the Windows launcher (start-rapkumer.mjs) forces the root on
		// every start; on other platforms RAPKUMER_DATA_DIR comes from `.env`
		// and remains editable through this UI.
		rootManagedByLauncher: process.platform === 'win32' && Boolean(process.env.RAPKUMER_DATA_DIR)
	};
}

/**
 * Normalize a user-supplied storage path. Empty input returns null (meaning
 * "use the default"). Values must be absolute, optionally prefixed with
 * `file:` (the convention used by the `photo`/`sounds` env vars).
 */
export function normalizeStoragePath(value: string): string | null {
	const raw = value.trim();
	if (!raw) return null;
	const stripped = raw.startsWith('file:') ? raw.slice(5) : raw;
	if (!path.isAbsolute(stripped)) {
		throw new Error(
			'Path harus absolut (mis. C:\\Users\\... atau /home/...), boleh diawali "file:".'
		);
	}
	return path.normalize(stripped);
}

/** Compute the effective data root after a `.env` change (no env override yet). */
export function effectiveDataRoot(rootValue: string | null): string {
	return rootValue ?? defaultDataRoot();
}

/**
 * Copy a single file to `dst` only if it does not exist there yet. Missing
 * `src` and copy failures are non-fatal (returns 0). Used for loose files
 * like `csrf-origins.txt` that live directly under the data root.
 */
export async function copyFileIfMissing(src: string, dst: string): Promise<number> {
	try {
		await fs.access(dst);
		return 0;
	} catch {
		// dst missing — try to copy
	}
	try {
		await fs.mkdir(path.dirname(dst), { recursive: true });
		await fs.copyFile(src, dst);
		return 1;
	} catch {
		return 0;
	}
}

/**
 * Create the standard user-data tree under a storage root so picking the root
 * once is enough: `ttd/{guru,tamu}`, `dinas-luar`, plus the effective
 * uploads/sounds dirs (which default to `<root>/uploads` and `<root>/sounds`
 * when not overridden). Idempotent.
 */
export async function ensureStorageTree(
	root: string,
	uploads: string,
	sounds: string
): Promise<void> {
	await fs.mkdir(path.join(root, 'ttd', 'guru'), { recursive: true });
	await fs.mkdir(path.join(root, 'ttd', 'tamu'), { recursive: true });
	await fs.mkdir(path.join(root, 'dinas-luar'), { recursive: true });
	await fs.mkdir(uploads, { recursive: true });
	await fs.mkdir(sounds, { recursive: true });
}

/**
 * Copy every file (recursively) from `src` to `dst` that does not already
 * exist in `dst`. Never deletes anything. Returns the number of files copied.
 * Used to move user data to a new storage root after the admin changes `.env`.
 */
export async function copyMissingFiles(src: string, dst: string): Promise<number> {
	try {
		const stat = await fs.stat(src);
		if (!stat.isDirectory()) return 0;
	} catch {
		return 0;
	}

	let copied = 0;
	await fs.mkdir(dst, { recursive: true });
	const entries = await fs.readdir(src, { withFileTypes: true });
	for (const entry of entries) {
		const s = path.join(src, entry.name);
		const d = path.join(dst, entry.name);
		if (entry.isDirectory()) {
			copied += await copyMissingFiles(s, d);
		} else if (entry.isFile()) {
			try {
				await fs.access(d);
			} catch {
				await fs.mkdir(path.dirname(d), { recursive: true });
				await fs.copyFile(s, d);
				copied += 1;
			}
		}
	}
	return copied;
}
