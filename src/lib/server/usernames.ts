import db from '$lib/server/db';
import { tableAuthUser } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Build a compact login username from a person's name, e.g.
 * "Agus Wira, S.Pd." -> "aguswira". Tokens containing a period are treated as
 * titles/abbreviations (S.Pd., M.Pd., Dr., dkk) and dropped; everything else is
 * lowercased and non-alphanumeric characters are removed.
 */
export function slugifyUsername(nama: string): string {
	const tokens = (nama ?? '').toLowerCase().split(/[\s,]+/);
	const words = tokens.filter((t) => t && !t.includes('.'));
	const slug = words.join('').replace(/[^a-z0-9]/g, '');
	if (slug) return slug;
	// Fallback: strip punctuation from the raw name so we never return empty.
	return (nama ?? '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
}

async function usernameExists(usernameNormalized: string): Promise<boolean> {
	const row = await db.query.tableAuthUser.findFirst({
		columns: { id: true },
		where: eq(tableAuthUser.usernameNormalized, usernameNormalized)
	});
	return Boolean(row);
}

/**
 * Unique variant of `slugifyUsername`: appends a numeric suffix (2, 3, ...) when
 * the base slug is already taken, mirroring common username conventions.
 */
export async function resolveUniqueUsername(nama: string): Promise<string> {
	const base = slugifyUsername(nama);
	let candidate = base;
	let n = 2;
	while (await usernameExists(candidate)) {
		candidate = `${base}${n}`;
		n += 1;
	}
	return candidate;
}
