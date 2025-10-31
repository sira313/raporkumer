#!/usr/bin/env node
import { createClient } from '@libsql/client';
const DEFAULT_DB_URL = 'file:./data/database.sqlite3';
const dbUrl = process.env.DB_URL || DEFAULT_DB_URL;

async function tableHasColumn(client, table, column) {
  try {
    const res = await client.execute({ sql: `PRAGMA table_info('${table}')` });
    const rows = res.rows || [];
    const names = rows.map((r) => r.name || r[1]);
    return names.includes(column);
  } catch (err) {
    const msg = err && (err.message || err.toString());
    if (msg && /no such table/i.test(msg)) {
      console.warn(`[ensure-columns] Table not present: ${table}`);
      return false;
    }
    throw err;
  }
}

async function addColumnIfMissing(client, table, column, type) {
  const has = await tableHasColumn(client, table, column);
  if (has) {
    console.info(`[ensure-columns] Column ${column} already present on ${table}`);
    return;
  }

  console.info(`[ensure-columns] Adding column ${column} to ${table}`);
  try {
    await client.execute({ sql: `ALTER TABLE "${table}" ADD COLUMN "${column}" ${type}` });
    console.info(`[ensure-columns] Added ${column} on ${table}`);
  } catch (err) {
    const msg = err && (err.message || err.toString());
    console.error(`[ensure-columns] Failed to add column ${column} to ${table}:`, msg || err);
    // don't throw - allow migrate process to continue and let drizzle report final error
  }
}

async function main() {
  console.info('[ensure-columns] Target DB:', dbUrl);
  const client = createClient({ url: dbUrl });
  try {
    // Columns referenced by migrations that may be missing in older installed DBs.
    // If missing, add them so subsequent migration UPDATE statements do not fail.
    const checks = [
      { table: 'tasks', column: 'sekolah_id', type: 'INTEGER' },
      { table: 'kelas', column: 'sekolah_id', type: 'INTEGER' },
      { table: 'mata_pelajaran', column: 'kelas_id', type: 'INTEGER' }
    ];

    for (const c of checks) {
      await addColumnIfMissing(client, c.table, c.column, c.type);
    }
  } catch (err) {
    console.error('[ensure-columns] Unexpected error:', err && (err.message || err.toString()));
    process.exitCode = 1;
  } finally {
    if (typeof client.close === 'function') await client.close();
  }
}

main().catch((err) => {
  console.error('[ensure-columns] Unhandled error:', err && (err.message || err.toString()));
  process.exitCode = 1;
});
