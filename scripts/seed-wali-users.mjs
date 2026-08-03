import { createClient } from '@libsql/client';
import { randomBytes, scryptSync } from 'node:crypto';

const DEFAULT_DB_URL = 'file:./data/database.sqlite3';
const dbUrl = process.env.DB_URL || DEFAULT_DB_URL;

const client = createClient({ url: dbUrl });

const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SALT_BYTES = 16;

function nowIso() {
	return new Date().toISOString();
}

function hashPassword(password, salt) {
	const resolvedSalt = salt ?? randomBytes(PASSWORD_SALT_BYTES).toString('hex');
	const derived = scryptSync(password, resolvedSalt, PASSWORD_KEY_LENGTH);
	return { hash: derived.toString('hex'), salt: resolvedSalt };
}

// Wali kelas defaults: 16 menu tanpa sekolah/akademik/kelas/buku-tamu.
// Keep in sync dengan `defaultPermissionsByType['wali_kelas']` di src/routes/pengguna/permissions.ts.
const WALI_KELAS_DEFAULT_PERMISSIONS = [
	'informasi_umum_murid',
	'mata_pelajaran_intrakurikuler',
	'mata_pelajaran_kokurikuler',
	'mata_pelajaran_ekstrakurikuler',
	'mata_pelajaran_keasramaan',
	'input_nilai_asesmen_formatif',
	'input_nilai_asesmen_sumatif',
	'input_nilai_asesmen_kokurikuler',
	'input_nilai_nilai_ekstrakurikuler',
	'input_nilai_asesmen_keasramaan',
	'administrasi_absen',
	'administrasi_jurnal_mengajar',
	'administrasi_catatan_wali_kelas',
	'administrasi_rekap_nilai',
	'administrasi_keputusan',
	'cetak_dokumen'
];

// Compact username from a name, e.g. "Agus Wira, S.Pd." -> "aguswira".
// Tokens containing a period are treated as titles/abbreviations and dropped.
// Keep in sync dengan slugifyUsername() di src/lib/server/usernames.ts.
function slugifyUsername(nama) {
	const tokens = String(nama || '')
		.toLowerCase()
		.split(/[\s,]+/);
	const words = tokens.filter((t) => t && !t.includes('.'));
	const slug = words.join('').replace(/[^a-z0-9]/g, '');
	if (slug) return slug;
	return (
		String(nama || '')
			.toLowerCase()
			.replace(/[^a-z0-9]/g, '') || 'user'
	);
}

async function resolveUniqueUsername(client, nama) {
	const base = slugifyUsername(nama);
	let candidate = base;
	let n = 2;
	while (true) {
		const hit = await client.execute({
			sql: 'SELECT id FROM auth_user WHERE username_normalized = ? LIMIT 1',
			args: [candidate]
		});
		if (!(hit.rows && hit.rows.length)) return candidate;
		candidate = `${base}${n}`;
		n += 1;
	}
}

async function main() {
	console.info(`[seed-wali] Target DB: ${dbUrl}`);

	// Find classes that have a wali_kelas_id
	const rows = await client.execute({
		sql: `SELECT k.id AS kelas_id, k.wali_kelas_id AS wali_id, p.nama AS pegawai_nama
      FROM kelas k
      JOIN pegawai p ON p.id = k.wali_kelas_id
      WHERE k.wali_kelas_id IS NOT NULL`
	});

	const results = rows.rows || [];
	if (!results.length) {
		console.info('[seed-wali] Tidak ada kelas dengan wali_kelas_id. Tidak ada yang dibuat.');
		await client.close();
		return;
	}

	const created = [];

	for (const r of results) {
		const kelasId = r.kelas_id;
		const waliId = r.wali_id;
		const nama = (r.pegawai_nama || '').trim();
		if (!nama) continue;

		const username = await resolveUniqueUsername(client, nama);
		const usernameNormalized = username.toLowerCase();

		// Check if a user already exists for this pegawai or normalized username
		const exists = await client.execute({
			sql: `SELECT id FROM auth_user WHERE pegawai_id = ? OR username_normalized = ? LIMIT 1`,
			args: [waliId, usernameNormalized]
		});

		if (exists.rows && exists.rows.length) {
			console.info(
				`[seed-wali] Pengguna untuk pegawai ${nama} (kelas ${kelasId}) sudah ada, lewati.`
			);
			continue;
		}

		// generate a random password and store hash
		const password = randomBytes(6).toString('base64url'); // ~8 chars
		const { hash, salt } = hashPassword(password);
		const timestamp = nowIso();

		await client.execute({
			sql: `INSERT INTO auth_user (username, username_normalized, password_hash, password_salt, password_updated_at, permissions, type, pegawai_id, kelas_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			args: [
				username,
				usernameNormalized,
				hash,
				salt,
				timestamp,
				JSON.stringify(WALI_KELAS_DEFAULT_PERMISSIONS),
				'wali_kelas',
				waliId,
				kelasId,
				timestamp,
				timestamp
			]
		});

		created.push({ nama, kelasId, waliId, password });
		console.info(
			`[seed-wali] Dibuat pengguna untuk ${nama} (kelas ${kelasId}) dengan password: ${password}`
		);
	}

	console.info(`[seed-wali] Selesai. Total pengguna dibuat: ${created.length}`);
	await client.close();
}

main()
	.catch((err) => {
		console.error('[seed-wali] Gagal menjalankan seed', err);
		process.exitCode = 1;
	})
	.finally(async () => {
		if (typeof client.close === 'function') {
			try {
				await client.close();
			} catch {
				// ignore close errors
			}
		}
	});
