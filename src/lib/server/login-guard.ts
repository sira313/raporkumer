import db from '$lib/server/db';
import { tableLoginAttempt } from '$lib/server/db/schema';
import type { SQL } from 'drizzle-orm';
import { and, desc, eq, gte, lt, sql } from 'drizzle-orm';

// Brute-force protection for /login:
// - tracks failed attempts per (ip) in a rolling window and locks that ip
//   temporarily once it exceeds MAX_FAILED_ATTEMPTS
// - applies a progressive delay per (username, ip) pair on each failure to
//   slow repeated guessing without punishing other clients of the account

const MAX_FAILED_ATTEMPTS = 3;
const COUNTING_WINDOW_MS = 10 * 60 * 1000; // failures in the last 10 minutes count
const PRUNE_MS = COUNTING_WINDOW_MS * 2; // rows older than this are deleted
const MAX_DELAY_MS = 5000;

export interface LoginBlock {
	blocked: boolean;
	/** Seconds until the ip may try again (0 when not blocked). */
	retryAfterSeconds: number;
	source: 'ip' | null;
}

function windowStartIso() {
	return new Date(Date.now() - COUNTING_WINDOW_MS).toISOString();
}

async function countFailed(whereClause: SQL, since: string): Promise<number> {
	const rows = await db
		.select({ total: sql<number>`count(*)` })
		.from(tableLoginAttempt)
		.where(
			and(
				eq(tableLoginAttempt.succeeded, false),
				gte(tableLoginAttempt.createdAt, since),
				whereClause
			)
		);
	return Number(rows[0]?.total ?? 0);
}

/**
 * Seconds until the ip's failure count drops below the lockout threshold. The
 * lock releases when fewer than MAX_FAILED_ATTEMPTS failures remain inside the
 * counting window, i.e. COUNTING_WINDOW_MS after the oldest of the most recent
 * MAX_FAILED_ATTEMPTS failures (rows are fetched newest-first).
 */
async function lockoutRetrySeconds(ip: string): Promise<number> {
	const since = windowStartIso();
	const rows = await db.query.tableLoginAttempt.findMany({
		where: and(
			eq(tableLoginAttempt.succeeded, false),
			eq(tableLoginAttempt.ipAddress, ip),
			gte(tableLoginAttempt.createdAt, since)
		),
		orderBy: desc(tableLoginAttempt.createdAt),
		limit: MAX_FAILED_ATTEMPTS,
		columns: { createdAt: true }
	});
	const reference = rows[MAX_FAILED_ATTEMPTS - 1];
	if (!reference) return 30;
	const t = new Date(reference.createdAt).getTime();
	if (!Number.isFinite(t)) return 30;
	return Math.max(30, Math.ceil((t + COUNTING_WINDOW_MS - Date.now()) / 1000));
}

/**
 * Whether a login from `ip` is currently blocked. `usernameNormalized` is only
 * used for logging context. Lockout is deliberately per-IP (not per-username)
 * so brute-force attempts against a well-known account (e.g. "Admin") cannot
 * lock everyone else out of that account from arbitrary IPs.
 */
export async function checkLoginBlocked(
	usernameNormalized: string | null,
	ip: string,
	opts?: { silent?: boolean }
): Promise<LoginBlock> {
	const silent = opts?.silent ?? false;
	const since = windowStartIso();

	const ipCount = await countFailed(eq(tableLoginAttempt.ipAddress, ip), since);
	if (ipCount >= MAX_FAILED_ATTEMPTS) {
		const retry = await lockoutRetrySeconds(ip);
		if (!silent) {
			console.error(
				`[login-guard] IP LOCKED ip=${ip} username="${usernameNormalized ?? '?'}" retryIn=${retry}s ` +
					`(failed=${ipCount} in window)`
			);
		}
		return { blocked: true, retryAfterSeconds: retry, source: 'ip' };
	}

	return { blocked: false, retryAfterSeconds: 0, source: null };
}

/** Persist a login attempt (success or failure). Prunes old rows opportunistically. */
export async function recordLoginAttempt(
	usernameNormalized: string | null,
	ip: string,
	succeeded: boolean
): Promise<void> {
	const now = new Date();
	await db.insert(tableLoginAttempt).values({
		username: usernameNormalized || null,
		ipAddress: ip,
		succeeded,
		createdAt: now.toISOString(),
		updatedAt: now.toISOString()
	});

	try {
		const cutoff = new Date(Date.now() - PRUNE_MS).toISOString();
		await db.delete(tableLoginAttempt).where(lt(tableLoginAttempt.createdAt, cutoff));
	} catch (err) {
		console.warn('[login-guard] failed to prune old login attempts', err);
	}
}

/**
 * Remove the user's own failed attempts after a successful login. Deliberately
 * NOT scoped per-IP across usernames: on a shared (NAT) IP a success by one
 * user must not wipe failures another user (or an attacker) accumulated on the
 * same IP — those age out via the counting window instead.
 */
export async function clearLoginAttempts(usernameNormalized: string | null): Promise<void> {
	try {
		if (usernameNormalized) {
			await db
				.delete(tableLoginAttempt)
				.where(
					and(
						eq(tableLoginAttempt.username, usernameNormalized),
						eq(tableLoginAttempt.succeeded, false)
					)
				);
		}
	} catch (err) {
		console.warn('[login-guard] failed to clear login attempts', err);
	}
}

/** Number of recent failed attempts for a (username, ip) pair — used for the delay. */
export async function recentFailureCount(
	usernameNormalized: string | null,
	ip: string
): Promise<number> {
	const since = windowStartIso();
	const conditions: SQL[] = [
		eq(tableLoginAttempt.succeeded, false),
		eq(tableLoginAttempt.ipAddress, ip),
		gte(tableLoginAttempt.createdAt, since)
	];
	if (usernameNormalized) {
		conditions.push(eq(tableLoginAttempt.username, usernameNormalized));
	}
	const rows = await db
		.select({ total: sql<number>`count(*)` })
		.from(tableLoginAttempt)
		.where(and(...conditions));
	return Number(rows[0]?.total ?? 0);
}

/** Progressive delay: 250ms, 500ms, 1s, 2s, then capped at 4s per failure. */
export function computeDelayMs(failureCount: number): number {
	if (failureCount <= 0) return 0;
	return Math.min(MAX_DELAY_MS, 250 * Math.pow(2, Math.min(failureCount - 1, 4)));
}

/** Attempts left before the dimension locks (based on the rolling window). */
export function remainingAttempts(failureCount: number): number {
	return Math.max(0, MAX_FAILED_ATTEMPTS - failureCount);
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}
