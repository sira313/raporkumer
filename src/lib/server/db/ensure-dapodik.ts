import db from '$lib/server/db';
import { normMapelName } from '$lib/server/dapodik';
import { agamaMapelNames } from '$lib/statics';
import { ensureSchema } from './ensure-helper';
import { eq, sql } from 'drizzle-orm';
import { tableMataPelajaran } from './schema';

const TABLE = 'dapodik_settings';

// Kolom referensi Dapodik yang ditambahkan ke tabel yang sudah ada.
// Data Dapodik disimpan di tabel lokal (sekolah, pegawai, kelas, murid,
// mata_pelajaran, tahun_ajaran, semester) dengan kolom cermin `dapodik_*`
// agar idempotent saat sinkronisasi diulang (pola updateOrCreate docs/erapor.md §7.1).
const COLUMNS: Array<{ table: string; column: string; type: string }> = [
	{ table: 'sekolah', column: 'dapodik_sekolah_id', type: 'text' },
	{ table: 'pegawai', column: 'dapodik_ptk_id', type: 'text' },
	{ table: 'pegawai', column: 'nuptk', type: 'text' },
	{ table: 'tahun_ajaran', column: 'dapodik_tahun_ajaran_id', type: 'text' },
	{ table: 'semester', column: 'dapodik_semester_id', type: 'text' },
	{ table: 'kelas', column: 'dapodik_rombongan_belajar_id', type: 'text' },
	{ table: 'murid', column: 'dapodik_peserta_didik_id', type: 'text' },
	{ table: 'murid', column: 'dapodik_anggota_rombel_id', type: 'text' },
	{ table: 'murid', column: 'nik', type: 'text' },
	{ table: 'murid', column: 'anak_ke', type: 'integer' },
	{
		table: 'mata_pelajaran',
		column: 'pengampu_id',
		type: 'integer REFERENCES pegawai(id) ON DELETE SET NULL'
	},
	{ table: 'mata_pelajaran', column: 'dapodik_pembelajaran_id', type: 'text' },
	{ table: 'mata_pelajaran', column: 'dapodik_mata_pelajaran_id', type: 'text' },
	{ table: 'mata_pelajaran', column: 'dapodik_induk_pembelajaran_id', type: 'text' },
	{ table: 'mata_pelajaran', column: 'nama_lokal', type: 'text' },
	// Nomor urut tampil mapel (tabel intrakurikuler & cetak rapor).
	{ table: 'mata_pelajaran', column: 'urutan', type: 'integer' },
	{ table: TABLE, column: 'npsn', type: 'text' }
];

export async function ensureDapodikSchema() {
	await ensureSchema(TABLE, [
		`CREATE TABLE IF NOT EXISTS "${TABLE}" (
			"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			"sekolah_id" integer NOT NULL REFERENCES sekolah(id) ON DELETE CASCADE,
			"url" text NOT NULL,
			"token" text NOT NULL,
			"npsn" text,
			"semester_id_dapodik_terakhir" text,
			"last_sync_at" text,
			"created_at" text NOT NULL,
			"updated_at" text,
			UNIQUE(sekolah_id)
		)`,
		// Referensi mata pelajaran nasional Dapodik (getMataPelajaran).
		// Primary key = ID referensi Dapodik agar upsert idempotent dan mapel buatan
		// sekolah bisa dirujuk saat posting nilai balik ke Dapodik.
		`CREATE TABLE IF NOT EXISTS "dapodik_mata_pelajaran" (
			"mata_pelajaran_id" integer PRIMARY KEY NOT NULL,
			"nama" text NOT NULL,
			"jurusan_id" text,
			"pilihan_sekolah" integer DEFAULT 0 NOT NULL,
			"pilihan_buku" integer DEFAULT 0 NOT NULL,
			"pilihan_kepengawasan" integer DEFAULT 0 NOT NULL,
			"pilihan_evaluasi" integer DEFAULT 0 NOT NULL,
			"created_at" text NOT NULL,
			"updated_at" text
		)`,
		// Cermin pembelajaran Dapodik per rombel — sumber daftar nama mapel
		// pada form "Tambah Mata Pelajaran", difilter per kelas aktif.
		`CREATE TABLE IF NOT EXISTS "dapodik_pembelajaran" (
			"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			"kelas_id" integer NOT NULL REFERENCES kelas(id) ON DELETE CASCADE,
			"pembelajaran_id" text NOT NULL,
			"mata_pelajaran_id" text,
			"nama" text NOT NULL,
			"created_at" text NOT NULL,
			"updated_at" text,
			UNIQUE(pembelajaran_id)
		)`
	]);

	for (const { table, column, type } of COLUMNS) {
		try {
			await db.$client.execute(`ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}`);
		} catch {
			// column already exists
		}
	}

	await mergeDuplicateAgamaMapel();
}

/**
 * Gabungkan duplikat agama yang tercipta karena ejaan berbeda (mis. "Katholik"
 * dari Dapodik vs "Katolik" buatan ensureAgamaMapelForClasses). Baris "canonical"
 * (yang cocok dengan agamaMapelNames) dipertahankan; baris duplikat dihapus
 * setelah kolom Dapodik dipindahkan.
 */
let mergedAgamaDupes = false;

// Tabel yang mereferensikan mata_pelajaran_id — semua harus dipindahkan ke baris
// canonical SEBELUM dup dihapus. Beberapa ber-FK ON DELETE CASCADE (formatif,
// sumatif, sumatif_tujuan, jurnal) yang menghapus nilai, bukan meng-null-kan.
const MAPEL_FK_TABLES = [
	'auth_user',
	'auth_user_mata_pelajaran',
	'murid_mata_pelajaran',
	'tujuan_pembelajaran',
	'asesmen_formatif',
	'asesmen_sumatif',
	'asesmen_sumatif_tujuan',
	'jurnal_mengajar',
	'absensi',
	'ketidakhadiran_harian'
] as const;

async function mergeDuplicateAgamaMapel() {
	if (mergedAgamaDupes) return;
	mergedAgamaDupes = true;

	const canonicalSet = new Set(agamaMapelNames);
	const allAgama = await db.query.tableMataPelajaran.findMany({
		columns: {
			id: true,
			kelasId: true,
			nama: true,
			dapodikPembelajaranId: true,
			dapodikMataPelajaranId: true
		},
		where: sql`lower(nama) LIKE 'pendidikan agama%' OR lower(nama) LIKE 'pendidikan kepercayaan%'`
	});

	type Row = (typeof allAgama)[number];
	// Grup per (kelas, nama) — baris agama ada di SEMUA kelas; tanpa scoping kelas,
	// merge akan menghapus row kelas lain dan memindahkan FK ke kelas yang salah.
	const groups = new Map<string, Row[]>();
	for (const r of allAgama) {
		const key = `${r.kelasId}:${normAgama(r.nama)}`;
		if (!groups.has(key)) groups.set(key, []);
		groups.get(key)!.push(r);
	}

	for (const [, rows] of groups) {
		if (rows.length <= 1) continue;
		try {
			// Pilih canonical deterministik: lebih dulu yang terikat Dapodik,
			// lalu any canonical-named, terakhir id terkecil — bukan ambil arbitrary.
			const canonicalRows = rows.filter((r) => canonicalSet.has(r.nama));
			if (canonicalRows.length === 0) continue;
			const canonical =
				canonicalRows.find((r) => r.dapodikPembelajaranId || r.dapodikMataPelajaranId) ??
				canonicalRows.reduce((a, b) => (a.id < b.id ? a : b));
			for (const dup of rows) {
				if (dup.id === canonical.id) continue;
				const dupData = await db.query.tableMataPelajaran.findFirst({
					columns: {
						dapodikPembelajaranId: true,
						dapodikMataPelajaranId: true,
						dapodikIndukPembelajaranId: true,
						pengampuId: true
					},
					where: eq(tableMataPelajaran.id, dup.id)
				});
				if (!dupData) continue;
				const hasDapodikBinding = dupData.dapodikPembelajaranId || dupData.dapodikMataPelajaranId;
				const canonicalData = await db.query.tableMataPelajaran.findFirst({
					columns: {
						dapodikPembelajaranId: true,
						pengampuId: true
					},
					where: eq(tableMataPelajaran.id, canonical.id)
				});
				const needsBinding = !canonicalData?.dapodikPembelajaranId && hasDapodikBinding;
				const needsPengampu = !canonicalData?.pengampuId && dupData.pengampuId;
				if (needsBinding || needsPengampu) {
					await db
						.update(tableMataPelajaran)
						.set({
							...(needsBinding
								? {
										dapodikPembelajaranId: dupData.dapodikPembelajaranId,
										dapodikMataPelajaranId: dupData.dapodikMataPelajaranId
									}
								: {}),
							...(needsPengampu ? { pengampuId: dupData.pengampuId } : {})
						})
						.where(eq(tableMataPelajaran.id, canonical.id));
				}
				// Pindahkan semua referensi FK ke canonical sebelum hapus —
				// kalau tidak, ON DELETE CASCADE menghapus nilai rapor.
				for (const tableName of MAPEL_FK_TABLES) {
					await db.run(
						sql`update ${sql.raw(tableName)} set mata_pelajaran_id = ${canonical.id} where mata_pelajaran_id = ${dup.id}`
					);
				}
				await db.delete(tableMataPelajaran).where(eq(tableMataPelajaran.id, dup.id));
			}
		} catch (error) {
			// Jangan biarkan kegagalan merge menggagalkan boot aplikasi.
			console.error('[ensure-dapodik] mergeDuplicateAgamaMapel gagal:', error);
		}
	}
}

function normAgama(name: string): string {
	return normMapelName(name);
}
