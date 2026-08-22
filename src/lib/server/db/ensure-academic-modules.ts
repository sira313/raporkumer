import { ensureSchema } from './ensure-helper';

/**
 * Create tables for academic modules that are not covered by any other
 * ensure-* helper: penilaian (tujuan pembelajaran), presensi rekap,
 * ekstrakurikuler, kokurikuler, dan keasramaan. These used to exist only on
 * databases provisioned via `pnpm db:push`; fresh databases (e.g. first run
 * filled directly by Dapodik sync) need them created at startup.
 *
 * Idempotent — safe to run on every startup.
 */
export async function ensureAcademicModulesSchema() {
	await ensureSchema('academic_modules', [
		// --- Penilaian intrakurikuler ---
		`CREATE TABLE IF NOT EXISTS tujuan_pembelajaran (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			mata_pelajaran_id INTEGER NOT NULL REFERENCES mata_pelajaran(id),
			deskripsi TEXT NOT NULL,
			lingkup_materi TEXT NOT NULL,
			bobot REAL NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL,
			updated_at TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS murid_mata_pelajaran (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			murid_id INTEGER NOT NULL REFERENCES murid(id) ON DELETE CASCADE,
			mata_pelajaran_id INTEGER NOT NULL REFERENCES mata_pelajaran(id) ON DELETE CASCADE,
			nilai_kosong INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL,
			updated_at TEXT,
			UNIQUE(murid_id, mata_pelajaran_id)
		)`,
		`CREATE INDEX IF NOT EXISTS murid_mata_pelajaran_murid_idx ON murid_mata_pelajaran(murid_id)`,
		`CREATE INDEX IF NOT EXISTS murid_mata_pelajaran_mapel_idx ON murid_mata_pelajaran(mata_pelajaran_id)`,
		`CREATE TABLE IF NOT EXISTS asesmen_keasramaan (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			murid_id INTEGER NOT NULL REFERENCES murid(id) ON DELETE CASCADE,
			keasramaan_id INTEGER NOT NULL REFERENCES keasramaan(id) ON DELETE CASCADE,
			tujuan_id INTEGER NOT NULL REFERENCES keasramaan_tujuan(id) ON DELETE CASCADE,
			kategori TEXT NOT NULL,
			dinilai_pada TEXT,
			created_at TEXT NOT NULL,
			updated_at TEXT,
			UNIQUE(murid_id, keasramaan_id, tujuan_id)
		)`,
		`CREATE INDEX IF NOT EXISTS asesmen_keasramaan_murid_idx ON asesmen_keasramaan(murid_id)`,
		`CREATE INDEX IF NOT EXISTS asesmen_keasramaan_keasramaan_idx ON asesmen_keasramaan(keasramaan_id)`,
		`CREATE INDEX IF NOT EXISTS asesmen_keasramaan_tujuan_idx ON asesmen_keasramaan(tujuan_id)`,
		// --- Presensi murid (rekap) & keputusan kenaikan ---
		`CREATE TABLE IF NOT EXISTS kehadiran_murid (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			murid_id INTEGER NOT NULL REFERENCES murid(id) ON DELETE CASCADE,
			sakit INTEGER NOT NULL DEFAULT 0,
			izin INTEGER NOT NULL DEFAULT 0,
			alfa INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL,
			updated_at TEXT,
			UNIQUE(murid_id)
		)`,
		`CREATE INDEX IF NOT EXISTS kehadiran_murid_murid_idx ON kehadiran_murid(murid_id)`,
		`CREATE TABLE IF NOT EXISTS keputusan_murid (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			murid_id INTEGER NOT NULL REFERENCES murid(id) ON DELETE CASCADE,
			naik INTEGER NOT NULL DEFAULT 1,
			created_at TEXT NOT NULL,
			updated_at TEXT,
			UNIQUE(murid_id)
		)`,
		`CREATE INDEX IF NOT EXISTS keputusan_murid_murid_idx ON keputusan_murid(murid_id)`,
		// --- Ekstrakurikuler ---
		`CREATE TABLE IF NOT EXISTS ekstrakurikuler (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			nama TEXT NOT NULL,
			kelas_id INTEGER NOT NULL REFERENCES kelas(id),
			created_at TEXT NOT NULL,
			updated_at TEXT,
			UNIQUE(kelas_id, nama)
		)`,
		`CREATE TABLE IF NOT EXISTS murid_ekstrakurikuler (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			murid_id INTEGER NOT NULL REFERENCES murid(id) ON DELETE CASCADE,
			ekstrakurikuler_id INTEGER NOT NULL REFERENCES ekstrakurikuler(id) ON DELETE CASCADE,
			nilai_kosong INTEGER NOT NULL DEFAULT 0,
			created_at TEXT NOT NULL,
			updated_at TEXT,
			UNIQUE(murid_id, ekstrakurikuler_id)
		)`,
		`CREATE INDEX IF NOT EXISTS murid_ekstrakurikuler_murid_idx ON murid_ekstrakurikuler(murid_id)`,
		`CREATE INDEX IF NOT EXISTS murid_ekstrakurikuler_ekstrak_idx ON murid_ekstrakurikuler(ekstrakurikuler_id)`,
		`CREATE TABLE IF NOT EXISTS ekstrakurikuler_tujuan (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			ekstrakurikuler_id INTEGER NOT NULL REFERENCES ekstrakurikuler(id) ON DELETE CASCADE,
			deskripsi TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT
		)`,
		// --- Kokurikuler ---
		`CREATE TABLE IF NOT EXISTS kokurikuler (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			kelas_id INTEGER NOT NULL REFERENCES kelas(id),
			kode TEXT NOT NULL UNIQUE,
			dimensi TEXT NOT NULL,
			tujuan TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT
		)`,
		// --- Keasramaan ---
		`CREATE TABLE IF NOT EXISTS keasramaan (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			nama TEXT NOT NULL,
			kelas_id INTEGER NOT NULL REFERENCES kelas(id),
			created_at TEXT NOT NULL,
			updated_at TEXT,
			UNIQUE(kelas_id, nama)
		)`,
		`CREATE TABLE IF NOT EXISTS keasramaan_indikator (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			keasramaan_id INTEGER NOT NULL REFERENCES keasramaan(id) ON DELETE CASCADE,
			deskripsi TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT
		)`,
		`CREATE TABLE IF NOT EXISTS keasramaan_tujuan (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			indikator_id INTEGER NOT NULL REFERENCES keasramaan_indikator(id) ON DELETE CASCADE,
			deskripsi TEXT NOT NULL,
			created_at TEXT NOT NULL,
			updated_at TEXT
		)`
	]);
}
