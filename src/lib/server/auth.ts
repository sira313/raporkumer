import db from '$lib/server/db';
import { tableAuthSession, tableAuthUser } from '$lib/server/db/schema';
import { cookieNames } from '$lib/utils';
import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours
const SESSION_REFRESH_THRESHOLD_SECONDS = 60 * 60 * 2; // refresh token when less than 2 hours remain
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SALT_BYTES = 16;

const defaultAdminAccount = {
	username: 'Admin',
	password: 'Admin123',
	permissions: <UserPermission[]>['user_list', 'user_detail', 'user_set_permissions']
};

interface SessionMetadata {
	userAgent?: string | null;
	ipAddress?: string | null;
}

interface SessionResolution {
	session: AuthSession;
	user: AuthUser;
	refreshed: boolean;
}

function normalizeUsername(username: string) {
	return username.trim().toLowerCase();
}

function hashToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

function nowIso() {
	return new Date().toISOString();
}

export function hashPassword(password: string, salt?: string) {
	const resolvedSalt = salt ?? randomBytes(PASSWORD_SALT_BYTES).toString('hex');
	const derived = scryptSync(password, resolvedSalt, PASSWORD_KEY_LENGTH);
	return { hash: derived.toString('hex'), salt: resolvedSalt };
}

export function verifyPassword(password: string, hash: string, salt: string) {
	try {
		const derived = scryptSync(password, salt, PASSWORD_KEY_LENGTH);
		return timingSafeEqual(Buffer.from(hash, 'hex'), derived);
	} catch (error) {
		console.warn('[auth] password verification failed', error);
		return false;
	}
}

export async function ensureDefaultAdmin() {
	const normalized = normalizeUsername(defaultAdminAccount.username);
	const existing = await db.query.tableAuthUser.findFirst({
		where: eq(tableAuthUser.usernameNormalized, normalized)
	});
	if (existing) {
		// Ensure default admin permissions are present on the existing admin account.
		const existingPermissions = Array.isArray(existing.permissions)
			? existing.permissions
			: [];
		const missing = defaultAdminAccount.permissions.filter(
			(p) => !existingPermissions.includes(p)
		);
		if (missing.length > 0) {
			const merged = existingPermissions.concat(missing);
			await db
				.update(tableAuthUser)
				.set({ permissions: merged, updatedAt: nowIso() })
				.where(eq(tableAuthUser.id, existing.id));
			// Return the refreshed user record
			const updated = await db.query.tableAuthUser.findFirst({
				where: eq(tableAuthUser.id, existing.id)
			});
			return updated;
		}
		return existing;
	}

	const { hash, salt } = hashPassword(defaultAdminAccount.password);
	const timestamp = nowIso();
	const [created] = await db
		.insert(tableAuthUser)
		.values({
			username: defaultAdminAccount.username,
			usernameNormalized: normalized,
			passwordHash: hash,
			passwordSalt: salt,
			passwordUpdatedAt: timestamp,
			permissions: defaultAdminAccount.permissions,
			createdAt: timestamp,
			updatedAt: timestamp
		})
		.returning();
	return created;
}

export async function authenticateUser(username: string, password: string) {
	const normalized = normalizeUsername(username);
	if (!normalized) return null;
	const user = await db.query.tableAuthUser.findFirst({
		where: eq(tableAuthUser.usernameNormalized, normalized)
	});
	if (!user) return null;
	const valid = verifyPassword(password, user.passwordHash, user.passwordSalt);
	return valid ? user : null;
}

function calculateExpiry(secondsFromNow: number) {
	return new Date(Date.now() + secondsFromNow * 1000).toISOString();
}

export async function createSession(userId: number, meta: SessionMetadata = {}) {
	const token = randomBytes(32).toString('base64url');
	const tokenHash = hashToken(token);
	const createdAt = nowIso();
	const expiresAt = calculateExpiry(SESSION_TTL_SECONDS);

	await db.insert(tableAuthSession).values({
		userId,
		tokenHash,
		userAgent: meta.userAgent ?? null,
		ipAddress: meta.ipAddress ?? null,
		expiresAt,
		createdAt,
		updatedAt: createdAt
	});

	return { token, expiresAt };
}

async function refreshSession(sessionId: number) {
	const expiresAt = calculateExpiry(SESSION_TTL_SECONDS);
	await db
		.update(tableAuthSession)
		.set({ expiresAt, updatedAt: nowIso() })
		.where(eq(tableAuthSession.id, sessionId));
	return expiresAt;
}

export async function resolveSession(token: string): Promise<SessionResolution | null> {
	const tokenHash = hashToken(token);
	const record = await db.query.tableAuthSession.findFirst({
		where: eq(tableAuthSession.tokenHash, tokenHash),
		with: { user: true }
	});

	if (!record || !record.user) {
		return null;
	}

	const expiresAtValue = new Date(record.expiresAt).getTime();
	if (!Number.isFinite(expiresAtValue) || expiresAtValue <= Date.now()) {
		await db.delete(tableAuthSession).where(eq(tableAuthSession.id, record.id));
		return null;
	}

	const secondsRemaining = Math.floor((expiresAtValue - Date.now()) / 1000);
	let refreshed = false;
	let expiresAt = record.expiresAt;
	if (secondsRemaining < SESSION_REFRESH_THRESHOLD_SECONDS) {
		expiresAt = await refreshSession(record.id);
		refreshed = true;
	}

	const { user, ...sessionData } = record;
	const session: AuthSession = { ...sessionData, expiresAt };
	return {
		session,
		user,
		refreshed
	};
}

export async function deleteSessionByToken(token: string) {
	const tokenHash = hashToken(token);
	await db.delete(tableAuthSession).where(eq(tableAuthSession.tokenHash, tokenHash));
}

export async function deleteSessionsForUser(userId: number) {
	await db.delete(tableAuthSession).where(eq(tableAuthSession.userId, userId));
}

export async function updateUserPassword(userId: number, newPassword: string) {
	const { hash, salt } = hashPassword(newPassword);
	const timestamp = nowIso();
	await db
		.update(tableAuthUser)
		.set({
			passwordHash: hash,
			passwordSalt: salt,
			passwordUpdatedAt: timestamp,
			updatedAt: timestamp
		})
		.where(eq(tableAuthUser.id, userId));
}

export async function verifyUserPassword(userId: number, password: string) {
	const user = await db.query.tableAuthUser.findFirst({
		where: eq(tableAuthUser.id, userId)
	});
	if (!user) return false;
	return verifyPassword(password, user.passwordHash, user.passwordSalt);
}

export function applySessionCookie(
	cookies: Cookies,
	token: string,
	_expiresAt: string,
	secure: boolean
) {
	// Use a session cookie so credentials are cleared once the app/browser closes.
	cookies.set(cookieNames.AUTH_SESSION, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure
	});
}
