import fs from 'node:fs/promises';
import path from 'node:path';
import { eq } from 'drizzle-orm';
import db from '$lib/server/db';
import { dataRoot } from '$lib/server/data-dirs';
import { tableAuthUser, tablePegawai } from '$lib/server/db/schema';

// Dinas luar files live under the user-data root (dataRoot()):
//   - undangan PDFs:   <root>/dinas-luar/undangan/
//   - SPPD bukti PDFs: <root>/dinas-luar/sppd/<sppdId>/
//   - bukti foto:      <root>/dinas-luar/<nama-akun>/<sppdId>/
// One kegiatan (SPPD) = one folder, so all files for a single trip stay together.
const DINAS_LUAR_DIR = path.join(dataRoot(), 'dinas-luar');
const UNDANGAN_DIR = path.join(DINAS_LUAR_DIR, 'undangan');
const SPPD_DIR = path.join(DINAS_LUAR_DIR, 'sppd');

const REL_PREFIX = 'undangan/';
const SAFE_NAME = /^[A-Za-z0-9._-]+$/;

/** Write an undangan PDF to data/dinas-luar/undangan/ and return the relative path. */
export async function saveUndanganFile(filename: string, buffer: Buffer): Promise<string> {
	if (!SAFE_NAME.test(filename)) {
		throw new Error('Nama file undangan tidak valid.');
	}
	if (!buffer.length) {
		throw new Error('File undangan kosong.');
	}
	await fs.mkdir(UNDANGAN_DIR, { recursive: true });
	await fs.writeFile(path.join(UNDANGAN_DIR, filename), buffer);
	return `${REL_PREFIX}${filename}`;
}

/** Read an undangan PDF by its stored relative path (e.g. `undangan/foo.pdf`). */
export async function readUndanganFile(relPath: string): Promise<Buffer | null> {
	if (!relPath || relPath.includes('..') || relPath.includes('\\')) return null;
	if (!relPath.startsWith(REL_PREFIX)) return null;
	const filename = relPath.slice(REL_PREFIX.length);
	if (!SAFE_NAME.test(filename)) return null;
	try {
		return await fs.readFile(path.join(UNDANGAN_DIR, filename));
	} catch {
		return null;
	}
}

export async function deleteUndanganFile(relPath: string | null): Promise<void> {
	if (!relPath || relPath.includes('..') || relPath.includes('\\')) return;
	if (!relPath.startsWith(REL_PREFIX)) return;
	const filename = relPath.slice(REL_PREFIX.length);
	if (!SAFE_NAME.test(filename)) return;
	await fs.rm(path.join(UNDANGAN_DIR, filename), { force: true }).catch(() => {});
}

// --- Bukti perjalanan dinas (SPPD) ---

const ACCOUNT_SEGMENT = /^[A-Za-z0-9._-]+$/;

/** Turn an account name (username) into a safe folder segment. */
export function sanitizeAccountName(namaAkun: string): string {
	const clean = namaAkun
		.trim()
		.replace(/[^A-Za-z0-9._-]+/g, '_')
		.replace(/^[._-]+|[._-]+$/g, '')
		.replace(/_+/g, '_');
	return clean || 'akun';
}

/**
 * Write an SPPD bukti PDF to data/dinas-luar/sppd/<sppdId>/ and return the
 * relative path (e.g. `sppd/3/foo.pdf`).
 */
export async function saveSppdFile(
	sppdId: number,
	filename: string,
	buffer: Buffer
): Promise<string> {
	if (!SAFE_NAME.test(filename)) {
		throw new Error('Nama file bukti tidak valid.');
	}
	if (!buffer.length) {
		throw new Error('File bukti kosong.');
	}
	const dir = path.join(SPPD_DIR, String(sppdId));
	await fs.mkdir(dir, { recursive: true });
	await fs.writeFile(path.join(dir, filename), buffer);
	return `sppd/${sppdId}/${filename}`;
}

/**
 * Write a bukti foto to data/dinas-luar/<nama-akun>/<sppdId>/ and return the
 * relative path (e.g. `aris/3/foo.jpg`).
 */
export async function saveGambarFile(
	namaAkun: string,
	sppdId: number,
	filename: string,
	buffer: Buffer
): Promise<string> {
	if (!SAFE_NAME.test(filename)) {
		throw new Error('Nama file bukti tidak valid.');
	}
	if (!buffer.length) {
		throw new Error('File bukti kosong.');
	}
	const account = sanitizeAccountName(namaAkun);
	const dir = path.join(DINAS_LUAR_DIR, account, String(sppdId));
	await fs.mkdir(dir, { recursive: true });
	await fs.writeFile(path.join(dir, filename), buffer);
	return `${account}/${sppdId}/${filename}`;
}

/**
 * Resolve a stored bukti relative path to an absolute file path, or null when
 * the path is malformed/unsafe. Accepts `sppd/<id>/<file>`, `<akun>/<id>/<file>`
 * and the legacy `bukti/<id>/<file>` layout.
 */
function resolveBuktiPath(relPath: string): string | null {
	if (!relPath || relPath.includes('..') || relPath.includes('\\')) return null;
	const segments = relPath.split('/');
	if (segments.length !== 3) return null;
	const [dir, idStr, filename] = segments;
	if (!/^\d+$/.test(idStr) || !SAFE_NAME.test(filename)) return null;
	if (dir === 'sppd') return path.join(SPPD_DIR, idStr, filename);
	if (dir === 'bukti') return path.join(DINAS_LUAR_DIR, 'bukti', idStr, filename);
	if (ACCOUNT_SEGMENT.test(dir)) return path.join(DINAS_LUAR_DIR, dir, idStr, filename);
	return null;
}

/** Read a bukti file by its stored relative path (e.g. `sppd/3/foo.pdf`). */
export async function readBuktiFile(relPath: string): Promise<Buffer | null> {
	const abs = resolveBuktiPath(relPath);
	if (!abs) return null;
	try {
		return await fs.readFile(abs);
	} catch {
		return null;
	}
}

export async function deleteBuktiFile(relPath: string | null): Promise<void> {
	if (!relPath) return;
	const abs = resolveBuktiPath(relPath);
	if (!abs) return;
	await fs.rm(abs, { force: true }).catch(() => {});
}

/** Resolve the human-readable name of the logged-in user for display/storage. */
export async function resolveUserName(
	user: Pick<AuthUser, 'id' | 'username' | 'pegawaiId'> | undefined | null
): Promise<string> {
	if (!user) return 'Pengguna';
	if (user.pegawaiId) {
		const peg = await db.query.tablePegawai.findFirst({
			columns: { nama: true },
			where: eq(tablePegawai.id, Number(user.pegawaiId))
		});
		if (peg?.nama) return peg.nama;
	}
	const auth = await db.query.tableAuthUser.findFirst({
		columns: { namaLengkap: true, username: true },
		where: eq(tableAuthUser.id, Number(user.id))
	});
	return auth?.namaLengkap?.trim() || auth?.username || 'Pengguna';
}
