import db from '$lib/server/db';

let ensured = false;

export async function ensureCatatanWaliSchema() {
	if (ensured) return;

	const statements = [
		`CREATE TABLE IF NOT EXISTS "catatan_wali_kelas" (
			"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
			"murid_id" integer NOT NULL,
			"catatan" text,
			"created_at" text NOT NULL,
			"updated_at" text,
			CONSTRAINT "catatan_wali_kelas_murid_id_murid_id_fk" FOREIGN KEY ("murid_id") REFERENCES "murid" ("id") ON UPDATE NO ACTION ON DELETE CASCADE
		)`,
		`CREATE UNIQUE INDEX IF NOT EXISTS "catatan_wali_kelas_murid_unique" ON "catatan_wali_kelas" ("murid_id")`,
		`CREATE INDEX IF NOT EXISTS "catatan_wali_kelas_murid_idx" ON "catatan_wali_kelas" ("murid_id")`
	];

	for (const statement of statements) {
		await db.$client.execute(statement);
	}

	ensured = true;
}
