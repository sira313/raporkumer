import { ensureDefaultAdmin } from '$lib/server/auth';
import { ensureKepalaSekolahAccounts } from '$lib/server/kepala-sekolah';
import { ensureBukuTamuSettingsSchema } from './ensure-buku-tamu-settings';
import { ensureCoreSchema } from './ensure-core-schema';
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
	await ensureJadwalBellSchema();
	await ensurePresensiSettingsSchema();
	await ensureLoginAttemptsSchema();
	await ensureBukuTamuSettingsSchema();
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
