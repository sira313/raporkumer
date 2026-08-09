import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Helpers to read/update the `.env` file that the app loads at startup
 * (<cwd>/.env, same location used by scripts/start-build.mjs). Used by the
 * admin "Lokasi Data" settings so storage paths can be changed from the UI
 * without hand-editing the file.
 */

export function envFilePath(): string {
	return path.resolve(process.cwd(), '.env');
}

export async function readEnvFile(): Promise<Record<string, string>> {
	const file = envFilePath();
	let raw: string;
	try {
		raw = await fs.readFile(file, 'utf8');
	} catch {
		return {};
	}
	const result: Record<string, string> = {};
	for (const line of raw.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const m = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
		if (!m) continue;
		let val = m[2] ?? '';
		if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
			val = val.slice(1, -1);
		}
		result[m[1]] = val;
	}
	return result;
}

function formatLine(key: string, value: string): string {
	// Quote with single quotes (literal, no escape processing) when the value
	// would otherwise be ambiguous (empty, whitespace, or comment chars).
	const needsQuote = value === '' || /[#\s;]/.test(value);
	return needsQuote ? `${key}='${value}'` : `${key}=${value}`;
}

/**
 * Update specific keys in `.env`, preserving every other line (comments and
 * unrelated keys) and their position. Missing keys are appended at the end.
 * The write is atomic (temp file + rename).
 */
export async function updateEnvFile(updates: Record<string, string>): Promise<void> {
	const file = envFilePath();
	let lines: string[];
	try {
		const raw = await fs.readFile(file, 'utf8');
		lines = raw.split(/\r?\n/);
	} catch {
		lines = [];
	}

	const keys = Object.keys(updates);
	const remaining = new Set(keys);
	const out: string[] = [];
	for (const line of lines) {
		const m = line.match(/^([A-Za-z0-9_]+)\s*=/);
		if (m && remaining.has(m[1])) {
			remaining.delete(m[1]);
			out.push(formatLine(m[1], updates[m[1]]));
		} else {
			out.push(line);
		}
	}
	for (const key of remaining) {
		out.push(formatLine(key, updates[key]));
	}

	let content = out.join('\n');
	if (content !== '' && !content.endsWith('\n')) content += '\n';

	await fs.mkdir(path.dirname(file), { recursive: true });
	const tmp = `${file}.tmp`;
	await fs.writeFile(tmp, content, 'utf8');
	await fs.rename(tmp, file);
}
