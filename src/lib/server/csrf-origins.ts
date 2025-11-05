import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { env } from '$env/dynamic/private';

// Prefer install-time data directory for persistence. Use explicit env var if set,
// otherwise use LOCALAPPDATA\Rapkumer-data on Windows, else fallback to repo ./data.
const dataDir =
	env.RAPKUMER_DATA_DIR ||
	(env.LOCALAPPDATA
		? join(env.LOCALAPPDATA, 'Rapkumer-data')
		: join(process.cwd(), 'data'));

const ORIGINS_FILE = join(dataDir, 'csrf-origins.txt');
const CACHE_TTL = 5_000; // ms

let cache: { set: Set<string>; updatedAt: number } | null = null;

function normalizeOrigin(value: string | null | undefined): string | undefined {
	if (!value) return undefined;
	try {
		const origin = new URL(value).origin.toLowerCase();
		if (!origin.startsWith('http:') && !origin.startsWith('https:')) return undefined;
		return origin;
	} catch {
		return undefined;
	}
}

async function readFileOrigins(): Promise<Set<string>> {
	try {
		const raw = await readFile(ORIGINS_FILE, { encoding: 'utf8' });
		const entries = raw
			.split(/[,\n\r]+/) // allow CSV or newline separated
			.map((s) => s.trim())
			.filter(Boolean)
			.map((s) => normalizeOrigin(s))
			.filter((s): s is string => Boolean(s));
		return new Set(entries);
	} catch {
		// file may not exist or unreadable; treat as empty
		return new Set();
	}
}

async function readRepoDataFileOrigins(): Promise<Set<string>> {
	const repoPath = join(process.cwd(), 'data', 'csrf-origins.txt');
	try {
		const raw = await readFile(repoPath, { encoding: 'utf8' });
		const entries = raw
			.split(/[,\n\r]+/)
			.map((s) => s.trim())
			.filter(Boolean)
			.map((s) => normalizeOrigin(s))
			.filter((s): s is string => Boolean(s));
		return new Set(entries);
	} catch {
		return new Set();
	}
}

export async function getFileTrustedOrigins(): Promise<Set<string>> {
	const now = Date.now();
	if (cache && now - cache.updatedAt < CACHE_TTL) return cache.set;

	const set = await readFileOrigins();
	cache = { set, updatedAt: now };
	return set;
}

export async function writeFileTrustedOrigins(origins: string[]): Promise<void> {
	const normalized: string[] = [];
	for (const o of origins) {
		const n = normalizeOrigin(o);
		if (!n) throw new Error(`Invalid origin: ${o}`);
		normalized.push(n);
	}

	const out = normalized.join(',');
	const tmp = `${ORIGINS_FILE}.tmp`;
	// ensure parent directory exists (create if necessary)
	try {
		await mkdir(dirname(ORIGINS_FILE), { recursive: true });
	} catch {
		// ignore mkdir errors (will surface on write)
	}
	await writeFile(tmp, out, { encoding: 'utf8' });
	await rename(tmp, ORIGINS_FILE);
	// update cache immediately
	cache = { set: new Set(normalized), updatedAt: Date.now() };
}

export async function readCombinedOriginsFromEnvAndFile(): Promise<Set<string>> {
	const envRaw = env.RAPKUMER_CSRF_TRUSTED_ORIGINS || '';
	const envEntries = envRaw
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.map((s) => normalizeOrigin(s))
		.filter((s): s is string => Boolean(s));

	const fileSet = await getFileTrustedOrigins();
	// Also always check repo ./data as additional source (helpful for dev and build tests)
	const repoSet = await readRepoDataFileOrigins();
	const result = new Set<string>(envEntries);
	for (const f of fileSet) result.add(f);
	for (const f of repoSet) result.add(f);
	return result;
}

export { normalizeOrigin };
