import db from '$lib/server/db';
import { ensureSchema } from './ensure-helper';

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
}
