import { ensureDefaultAdmin } from '$lib/server/auth';
import { ensureAcademicModulesSchema } from './ensure-academic-modules';
import { ensureAbsensiSchema } from './ensure-absensi';
import { ensureAsesmenEkstrakurikulerSchema } from './ensure-asesmen-ekstrakurikuler';
import { ensureAsesmenFormatifSchema } from './ensure-asesmen-formatif';
import { ensureAsesmenKokurikulerSchema } from './ensure-asesmen-kokurikuler';
import { ensureAsesmenSumatifSchema } from './ensure-asesmen-sumatif';
import { ensureBukuTamuSchema } from './ensure-buku-tamu';
import { ensureCatatanWaliSchema } from './ensure-catatan-wali';
import { ensureDinasLuarSchema } from './ensure-dinas-luar';
import { ensureJurnalMengajarSchema } from './ensure-jurnal-mengajar';
import { ensureKetidakhadiranHarianSchema } from './ensure-ketidakhadiran-harian';
import { ensureKetidakhadiranRaporSchema } from './ensure-ketidakhadiran-rapor';
import { ensurePresensiGuruSchema } from './ensure-presensi-guru';
import { ensureSppdSchema } from './ensure-sppd';
import { ensureKepalaSekolahAccounts } from '$lib/server/kepala-sekolah';
import { ensureAiSettingsSchema } from './ensure-ai-settings';
import { ensureUserAiSettingsSchema } from './ensure-user-ai-settings';
import { ensureBukuTamuSettingsSchema } from './ensure-buku-tamu-settings';
import { ensureCoreSchema } from './ensure-core-schema';
import { ensureDapodikSchema } from './ensure-dapodik';
import { ensureJadwalBellSchema } from './ensure-jadwal-bell';
import { ensureLoginAttemptsSchema } from './ensure-login-attempts';
import { ensurePermissionMigration } from './ensure-permission-migration';
import { ensurePresensiSettingsSchema } from './ensure-presensi-settings';
import { resetEnsuredSchemas } from './ensure-helper';

let startupEnsuresDone = false;

/**
 * Apply the startup schema/bootstrap migrations. Idempotent: runs only once per
 * process unless `resetStartupEnsures()` is called first (e.g. after importing
 * an older database file so the imported DB is migrated too).
 */
export async function runStartupEnsures() {
	if (startupEnsuresDone) return;
	await ensureCoreSchema();
	await ensureAcademicModulesSchema();
	await ensureJadwalBellSchema();
	await ensurePresensiSettingsSchema();
	await ensureLoginAttemptsSchema();
	await ensureBukuTamuSettingsSchema();
	await ensureAiSettingsSchema();
	await ensureUserAiSettingsSchema();
	await ensureDapodikSchema();
	// Tabel fitur akademik yang sebelumnya hanya di-ensure per-route — daftarkan di
	// sini agar DB segar/reset selalu punya skema lengkap tanpa perlu `pnpm db:push`.
	await ensureAbsensiSchema();
	await ensureAsesmenFormatifSchema();
	await ensureAsesmenKokurikulerSchema();
	await ensureAsesmenSumatifSchema();
	await ensureAsesmenEkstrakurikulerSchema();
	await ensureBukuTamuSchema();
	await ensureCatatanWaliSchema();
	await ensureDinasLuarSchema();
	await ensureJurnalMengajarSchema();
	await ensureKetidakhadiranHarianSchema();
	await ensureKetidakhadiranRaporSchema();
	await ensurePresensiGuruSchema();
	await ensureSppdSchema();
	await ensureDefaultAdmin();
	await ensurePermissionMigration();
	await ensureKepalaSekolahAccounts();
	startupEnsuresDone = true;
}

/** Reset the bootstrap cache so `runStartupEnsures()` re-runs against the current DB. */
export function resetStartupEnsures() {
	startupEnsuresDone = false;
	resetEnsuredSchemas();
}
