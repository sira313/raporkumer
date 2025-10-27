import {
	applySessionCookie,
	createSession,
	deleteSessionsForUser,
	updateUserPassword,
	verifyUserPassword
} from '$lib/server/auth';
import db from '$lib/server/db';
import { tableAuthUser } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { getAppVersion } from '$lib/server/app-info';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { networkInterfaces } from 'node:os';
import { isIPv4 } from 'node:net';

interface AddressEntry {
	name: string;
	address: string;
	raw: string;
}

function collectIpv4Addresses(port: string | null): AddressEntry[] {
	const interfaces = networkInterfaces();
	const collected: AddressEntry[] = [];

	for (const [name, entries] of Object.entries(interfaces)) {
		for (const entry of entries ?? []) {
			if (entry.family === 'IPv4' && !entry.internal && entry.address) {
				const address = port ? `${entry.address}:${port}` : entry.address;
				collected.push({ name, address, raw: entry.address });
			}
		}
	}

	return collected;
}

function filterAddresses(entries: AddressEntry[], currentHost: string) {
	const hostIpv4 = isIPv4(currentHost) ? currentHost : null;

	if (hostIpv4) {
		const primaryInterfaces = new Set(
			entries.filter((entry) => entry.raw === hostIpv4).map((entry) => entry.name)
		);
		if (primaryInterfaces.size > 0) {
			const filtered = entries.filter((entry) => primaryInterfaces.has(entry.name));
			if (filtered.length) return filtered;
		}
	}

	const privateRanges = entries.filter((entry) => {
		if (entry.raw.startsWith('192.168.')) return true;
		const match172 = entry.raw.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);
		return Boolean(match172);
	});

	if (privateRanges.length) {
		return privateRanges;
	}

	return entries;
}

export const load: PageServerLoad = async ({ url, locals }) => {
	const meta: PageMeta = {
		title: 'Pengaturan',
		description: 'Pengaturan Aplikasi E-Rapor Kurikulum Merdeka'
	};

	const secure = locals.requestIsSecure ?? url.protocol === 'https:';
	const protocol = secure ? 'https:' : 'http:';
	const port = url.port || (secure ? '443' : '80');
	const collected = collectIpv4Addresses(port);
	const filtered = filterAddresses(collected, url.hostname);
	const seen = new Set<string>();
	const addresses = filtered
		.map((entry) => entry.address)
		.filter((address) => {
			if (seen.has(address)) return false;
			seen.add(address);
			return true;
		});

	const hostWithPort = url.port ? url.host : `${url.hostname}:${port}`;
	if (isIPv4(url.hostname) && hostWithPort && !addresses.includes(hostWithPort)) {
		addresses.push(hostWithPort);
	}

	return { meta, appAddresses: addresses, protocol, appVersion: getAppVersion() };
};

export const actions: Actions = {
	'change-password': async ({ request, locals, cookies, getClientAddress, url }) => {
		const logContext = {
			userId: locals.user?.id,
			client: getClientAddress(),
			origin: request.headers.get('origin') ?? undefined,
			referer: request.headers.get('referer') ?? undefined
		};
		if (!locals.user) {
			console.warn('[change-password] user missing', logContext);
			throw redirect(303, '/login');
		}

		const formData = await request.formData();
		const currentPassword = String(formData.get('currentPassword') ?? '');
		const newPassword = String(formData.get('newPassword') ?? '');
		const confirmPassword = String(formData.get('confirmPassword') ?? '');

		if (!currentPassword || !newPassword || !confirmPassword) {
			console.warn('[change-password] missing fields', logContext);
			return fail(400, { message: 'Semua kolom kata sandi wajib diisi.' });
		}

		if (newPassword.length < 8) {
			console.warn('[change-password] password too short', logContext);
			return fail(400, { message: 'Kata sandi baru minimal 8 karakter.' });
		}

		if (newPassword !== confirmPassword) {
			console.warn('[change-password] confirmation mismatch', logContext);
			return fail(400, { message: 'Konfirmasi kata sandi tidak cocok.' });
		}

		const valid = await verifyUserPassword(locals.user.id, currentPassword);
		if (!valid) {
			console.warn('[change-password] invalid current password', logContext);
			return fail(400, { message: 'Kata sandi lama tidak sesuai.' });
		}

		await updateUserPassword(locals.user.id, newPassword);
		await deleteSessionsForUser(locals.user.id);
		const session = await createSession(locals.user.id, {
			userAgent: request.headers.get('user-agent'),
			ipAddress: getClientAddress()
		});

		console.info('[change-password] success', {
			...logContext,
			sessionExpiresAt: session.expiresAt
		});

		const secure = locals.requestIsSecure ?? url.protocol === 'https:';
		applySessionCookie(cookies, session.token, session.expiresAt, secure);

		return { message: 'Kata sandi berhasil diperbarui.' };
	}
	,
	'change-admin-username': async ({ request, locals }) => {
		const logContext = { userId: locals.user?.id };
		if (!locals.user) {
			console.warn('[change-admin-username] user missing', logContext);
			return fail(403, { message: 'Autentikasi diperlukan.' });
		}

		// require permission or admin type
		const permissions = Array.isArray(locals.user.permissions) ? locals.user.permissions : [];
	const userType = (locals.user as unknown as { type?: string }).type;
		if (!permissions.includes('user_set_permissions') && userType !== 'admin') {
			console.warn('[change-admin-username] unauthorized', { ...logContext, permissions });
			return fail(403, { message: 'Anda tidak memiliki izin untuk mengubah username Admin.' });
		}

		const form = await request.formData();
		const newUsername = String(form.get('adminUsername') ?? '').trim();
		const currentPassword = String(form.get('adminPassword') ?? '');

		if (!newUsername) return fail(400, { message: 'Username baru wajib diisi.' });
		if (!currentPassword) return fail(400, { message: 'Masukkan kata sandi Anda untuk konfirmasi.' });

		const valid = await verifyUserPassword(locals.user.id, currentPassword);
		if (!valid) return fail(400, { message: 'Kata sandi konfirmasi tidak sesuai.' });

		const normalized = newUsername.trim().toLowerCase();

		// check uniqueness
		const existing = await db.query.tableAuthUser.findFirst({ where: eq(tableAuthUser.usernameNormalized, normalized) });
		if (existing) return fail(400, { message: 'Username sudah digunakan.' });

		const now = new Date().toISOString();

		// Find the default admin record by normalized 'admin' username OR by type='admin'
		// Prefer the record with username_normalized = 'admin'
		const target = await db.query.tableAuthUser.findFirst({ where: eq(tableAuthUser.usernameNormalized, 'admin') })
			?? await db.query.tableAuthUser.findFirst({ where: eq(tableAuthUser.type, 'admin') });

		if (!target) return fail(404, { message: 'Akun Admin tidak ditemukan.' });

		// Ensure the target record remains an admin (preserve role) when renaming.
		await db
			.update(tableAuthUser)
			.set({ username: newUsername, usernameNormalized: normalized, type: 'admin', updatedAt: now })
			.where(eq(tableAuthUser.id, target.id));

		return { message: 'Username Admin berhasil diperbarui. Catatan: saat server di-restart, proses default admin mungkin membuat akun default baru jika tidak ditemukan; pertimbangkan memperbarui pengaturan default di kode jika perlu.' };
	}
};
