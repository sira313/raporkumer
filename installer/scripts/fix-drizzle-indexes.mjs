import { createClient } from '@libsql/client';

const DEFAULT_DB_URL = 'file:./data/database.sqlite3';
const dbUrl = process.env.DB_URL || DEFAULT_DB_URL;

function extractName(row) {
    // libsql may return rows as objects or arrays; try common positions
    return row && (row.name || row[0] || row[1] || null);
}

async function main() {
    console.info('[fix-drizzle-indexes] Target DB:', dbUrl);
    const client = createClient({ url: dbUrl });
    try {
        // Get indexes specifically for auth_user
        const res = await client.execute({ sql: `PRAGMA index_list('auth_user')` });
        const pragmaRows = res.rows || [];
        const pragmaNames = pragmaRows.map(extractName).filter(Boolean);

        // Also enumerate all index names from sqlite_master to catch variants
        const master = await client.execute({ sql: `SELECT name FROM sqlite_master WHERE type='index'` });
        const masterRows = master.rows || [];
        const masterNames = masterRows.map(extractName).filter(Boolean);

        const allIndexNames = Array.from(new Set([...pragmaNames, ...masterNames]));
        console.info('[fix-drizzle-indexes] Found indexes (combined):', allIndexNames);

        // Candidates we want to remove if present (case-insensitive match)
        const badCandidates = [
            'auth_user_usernameNormalized_unique',
            'auth_user_usernamenormalized_unique',
            'auth_user_usernameNormalized_unique_idx',
            'auth_user_username_normalized_unique_idx',
            'auth_user_username_normalized_unique'
        ];

        const lowerMap = new Map();
        for (const n of allIndexNames) {
            lowerMap.set(String(n).toLowerCase(), n);
        }

        for (const cand of badCandidates) {
            const key = String(cand).toLowerCase();
            const actual = lowerMap.get(key);
            if (actual) {
                try {
                    await client.execute({ sql: `DROP INDEX IF EXISTS "${actual}"` });
                    console.info(`[fix-drizzle-indexes] Dropped matching index: ${actual}`);
                    // remove from map so we don't try again
                    lowerMap.delete(key);
                } catch (err) {
                    const msg = err && (err.message || err.toString());
                    if (msg && /no such table/i.test(msg)) {
                        console.warn(`[fix-drizzle-indexes] auth_user table not present; cannot drop index ${actual}.`);
                    } else {
                        console.error(`[fix-drizzle-indexes] Failed to drop index ${actual}:`, err);
                    }
                }
            }
        }

        // Ensure the canonical index exists
        const canonical = 'auth_user_username_normalized_unique';
        if (!Array.from(lowerMap.keys()).includes(canonical.toLowerCase())) {
            try {
                await client.execute({ sql: `CREATE UNIQUE INDEX IF NOT EXISTS "${canonical}" ON "auth_user" ("username_normalized")` });
                console.info(`[fix-drizzle-indexes] Created canonical index: ${canonical}`);
            } catch (err) {
                const msg = err && (err.message || err.toString());
                if (msg && /no such table/i.test(msg)) {
                    console.warn('[fix-drizzle-indexes] auth_user table not present; skipping creation of canonical index.');
                } else {
                    console.error('[fix-drizzle-indexes] Failed to create canonical index:', err);
                }
            }
        } else {
            console.info(`[fix-drizzle-indexes] Canonical index already present or equivalent: ${canonical}`);
        }
    } catch (err) {
        const msg = err && (err.message || err.toString());
        if (msg && /no such table/i.test(msg)) {
            console.warn('[fix-drizzle-indexes] auth_user table not present yet; skipping index fixes.');
        } else {
            console.error('[fix-drizzle-indexes] Error while checking/fixing indexes:', err);
            process.exitCode = 1;
        }
    } finally {
        if (typeof client.close === 'function') await client.close();
    }
}

main().catch((err) => {
    console.error('[fix-drizzle-indexes] Unexpected error:', err);
    process.exitCode = 1;
});
