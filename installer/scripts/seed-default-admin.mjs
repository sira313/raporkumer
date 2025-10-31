import { createClient } from '@libsql/client';
import { randomBytes, scryptSync } from 'node:crypto';

const DEFAULT_DB_URL = process.env.DB_URL || 'file:./data/database.sqlite3';
const client = createClient({ url: DEFAULT_DB_URL });

const REQUIRED_PERMISSIONS = [
    'user_list',
    'user_detail',
    'user_add',
    'user_delete',
    'user_suspend',
    'user_set_permissions',
    'dashboard_manage',
    'sekolah_manage',
    'app_check_update',
    'rapor_manage',
    'kelas_manage',
    'kelas_pindah'
];

const DEFAULT_ADMIN = {
    username: 'Admin',
    password: 'Admin123',
    permissions: REQUIRED_PERMISSIONS
};

const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SALT_BYTES = 16;

function nowIso() {
    return new Date().toISOString();
}

function hashPassword(password) {
    const salt = randomBytes(PASSWORD_SALT_BYTES).toString('hex');
    const derived = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
    return { hash: derived.toString('hex'), salt };
}

async function main() {
    console.info('[seed-default-admin] Target DB:', DEFAULT_DB_URL);

    const rows = await client.execute({
        sql: "SELECT id, username, username_normalized, permissions FROM auth_user WHERE type = 'admin' OR username_normalized = 'admin'"
    });

    const results = rows.rows || [];
    if (results.length) {
        console.info('[seed-default-admin] Admin already present, ensuring permissions...');
        for (const r of results) {
            const id = r.id;
            const existingJson = r.permissions || '[]';
            let existing = [];
            try {
                existing = JSON.parse(existingJson);
            } catch (_) {
                // ignore parse errors and treat as empty list
                void _;
            }
            const merged = Array.from(new Set([...(existing || []), ...REQUIRED_PERMISSIONS]));
            await client.execute({
                sql: 'UPDATE auth_user SET permissions = ? WHERE id = ?',
                args: [JSON.stringify(merged), id]
            });
            console.info(`[seed-default-admin] Updated admin id=${id} -> ${merged.length} permissions`);
        }
        await client.close();
        console.info('[seed-default-admin] Done.');
        return;
    }

    console.info('[seed-default-admin] No admin account found. Creating default Admin user.');
    const { hash, salt } = hashPassword(DEFAULT_ADMIN.password);
    const ts = nowIso();
    const insertSql = `INSERT INTO auth_user (username, username_normalized, password_hash, password_salt, password_updated_at, permissions, type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    await client.execute({
        sql: insertSql,
        args: [
            DEFAULT_ADMIN.username,
            DEFAULT_ADMIN.username.toLowerCase(),
            hash,
            salt,
            ts,
            JSON.stringify(DEFAULT_ADMIN.permissions),
            'admin',
            ts,
            ts
        ]
    });

    console.info('[seed-default-admin] Created default Admin (username=Admin).');
    await client.close();
}

main().catch((err) => {
    console.error('[seed-default-admin] Failed', err);
    process.exitCode = 1;
});
