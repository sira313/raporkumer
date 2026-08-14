import db from '$lib/server/db';

const ensured = new Map<string, boolean>();

export async function ensureSchema(name: string, statements: string[]) {
	if (ensured.get(name)) return;
	for (const statement of statements) {
		await db.$client.execute(statement);
	}
	ensured.set(name, true);
}

// Force every ensure-* schema helper to re-run against the current database.
// Called after a database import/restore so tables/columns added by newer
// versions are re-created (the helpers are idempotent).
export function resetEnsuredSchemas() {
	ensured.clear();
}
