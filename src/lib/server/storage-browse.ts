import fs from 'node:fs/promises';
import path from 'node:path';

export interface BrowseResponse {
	current: string;
	parent: string | null;
	entries: string[];
	drives: string[];
}

function isDotName(name: string): boolean {
	return name.startsWith('.') || name === '$RECYCLE.BIN' || name === 'System Volume Information';
}

export async function listRootDrives(): Promise<string[]> {
	if (process.platform !== 'win32') return [];
	const drives: string[] = [];
	for (let code = 65; code <= 90; code += 1) {
		const drive = `${String.fromCharCode(code)}:\\`;
		try {
			await fs.access(drive);
			drives.push(drive);
		} catch {
			// drive not available
		}
	}
	return drives;
}

export async function listDirectories(dir: string): Promise<string[]> {
	const raw = await fs.readdir(dir, { withFileTypes: true });
	const names: string[] = [];
	for (const entry of raw) {
		if (!entry.isDirectory() || isDotName(entry.name)) continue;
		try {
			await fs.access(path.join(dir, entry.name));
			names.push(entry.name);
		} catch {
			// skip unreadable dirs
		}
	}
	return names.sort((a, b) => a.localeCompare(b));
}
