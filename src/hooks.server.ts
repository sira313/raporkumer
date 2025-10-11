import db from '$lib/server/db';
import { tableSekolah } from '$lib/server/db/schema';
import { applySessionCookie, ensureDefaultAdmin, resolveSession } from '$lib/server/auth';
import { isSecureRequest, resolveRequestProtocol } from '$lib/server/http';
import { cookieNames } from '$lib/utils';
import { error, redirect, type Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { desc, eq } from 'drizzle-orm';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const FORM_CONTENT_TYPES = [
	'application/x-www-form-urlencoded',
	'multipart/form-data',
	'text/plain'
];

const normalizeOrigin = (value: string | null) => {
	if (!value) return undefined;
	try {
		return new URL(value).origin.toLowerCase();
	} catch {
		return undefined;
	}
};

const parseTrustedOrigins = () => {
	const raw = process.env.RAPKUMER_CSRF_TRUSTED_ORIGINS || '';
	const candidates = raw
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean)
		.map((entry) => normalizeOrigin(entry));
	return new Set(candidates.filter((entry): entry is string => Boolean(entry)));
};

const shouldCheckRequest = (request: Request) => {
	if (!MUTATING_METHODS.has(request.method.toUpperCase())) return false;
	const contentType = request.headers.get('content-type');
	return (
		!!contentType && FORM_CONTENT_TYPES.some((type) => contentType.toLowerCase().startsWith(type))
	);
};

const csrfGuard: Handle = async ({ event, resolve }) => {
	if (!shouldCheckRequest(event.request)) {
		return resolve(event);
	}

	const headerOrigin = event.request.headers.get('origin');
	const headerReferer = event.request.headers.get('referer');
	const incomingOrigin = normalizeOrigin(headerOrigin) ?? normalizeOrigin(headerReferer);
	if (!incomingOrigin) {
		throw error(403, 'Permintaan ditolak karena origin tidak valid.');
	}

	const requestOrigin = incomingOrigin;
	const currentOrigin = normalizeOrigin(event.url.origin);
	if (currentOrigin && requestOrigin === currentOrigin) {
		return resolve(event);
	}

	const trustedOrigins = parseTrustedOrigins();
	if (trustedOrigins.has(requestOrigin)) {
		return resolve(event);
	}

	console.warn('CSRF guard blocked request from untrusted origin:', {
		origin: requestOrigin,
		method: event.request.method,
		path: event.url.pathname
	});
	throw error(403, 'Permintaan lintas origin tidak diizinkan.');
};

const PUBLIC_ROUTE_IDS = new Set(['/login', '/logout']);

let ensureDefaultAdminResolved = false;

function resolveRedirectTarget(value: string | null) {
	if (!value) return null;
	if (!value.startsWith('/')) return null;
	if (value.startsWith('//')) return null;
	return value;
}

const authGuard: Handle = async ({ event, resolve }) => {
	if (!ensureDefaultAdminResolved) {
		await ensureDefaultAdmin();
		ensureDefaultAdminResolved = true;
	}

	const sessionToken = event.cookies.get(cookieNames.AUTH_SESSION);
	const resolvedProtocol = resolveRequestProtocol(event.request, event.url);
	const secure = isSecureRequest(event.request, event.url);
	if (!sessionToken) {
		console.debug('[auth guard] No session cookie on incoming request', {
			path: event.url.pathname,
			protocol: event.url.protocol,
			resolvedProtocol,
			xForwardedProto: event.request.headers.get('x-forwarded-proto') ?? undefined,
			forwarded: event.request.headers.get('forwarded') ?? undefined,
			host: event.url.host
		});
	}

	if (sessionToken) {
		const resolved = await resolveSession(sessionToken);
		if (resolved) {
			event.locals.user = {
				id: resolved.user.id,
				username: resolved.user.username
			};
			event.locals.session = {
				id: resolved.session.id,
				expiresAt: resolved.session.expiresAt,
				tokenHash: resolved.session.tokenHash
			};
			if (resolved.refreshed) {
				applySessionCookie(event.cookies, sessionToken, resolved.session.expiresAt, secure);
			}
		} else {
			console.warn('[auth guard] Provided session token invalid or expired', {
				path: event.url.pathname
			});
			event.locals.user = undefined;
			event.locals.session = undefined;
			event.cookies.delete(cookieNames.AUTH_SESSION, { path: '/' });
		}
	} else {
		event.locals.user = undefined;
		event.locals.session = undefined;
	}

	const routeId = event.route.id;
	const isPublicRoute = !routeId || PUBLIC_ROUTE_IDS.has(routeId);
	const isLoginPath = event.url.pathname === '/login';

	if (event.locals.user && isLoginPath) {
		const redirectTarget = resolveRedirectTarget(event.url.searchParams.get('redirect')) ?? '/';
		throw redirect(303, redirectTarget);
	}

	if (!event.locals.user && !isPublicRoute) {
		if (event.request.method === 'GET') {
			const redirectTarget = resolveRedirectTarget(`${event.url.pathname}${event.url.search}`);
			const query =
				redirectTarget && redirectTarget !== '/'
					? `?redirect=${encodeURIComponent(redirectTarget)}`
					: '';
			throw redirect(303, `/login${query}`);
		}
		throw redirect(303, '/login');
	}

	return resolve(event);
};

const cookieParser: Handle = async ({ event, resolve }) => {
	if (!event.locals.user) {
		return resolve(event);
	}

	const sekolahId = Number(event.cookies.get(cookieNames.ACTIVE_SEKOLAH_ID) || '');
	if (sekolahId === event.locals.sekolah?.id && !event.locals.sekolahDirty) {
		return resolve(event);
	}

	let sekolah = await db.query.tableSekolah.findFirst({
		columns: { logo: false, logoDinas: false },
		with: { alamat: true, kepalaSekolah: true },
		orderBy: [desc(tableSekolah.id)],
		where: sekolahId ? eq(tableSekolah.id, sekolahId) : undefined
	});

	if (!sekolah) {
		sekolah = await db.query.tableSekolah.findFirst({
			columns: { logo: false, logoDinas: false },
			with: { alamat: true, kepalaSekolah: true },
			orderBy: [desc(tableSekolah.id)]
		});
		if (sekolah?.id) {
			event.cookies.set(cookieNames.ACTIVE_SEKOLAH_ID, String(sekolah.id), { path: '/' });
		} else if (sekolahId) {
			event.cookies.delete(cookieNames.ACTIVE_SEKOLAH_ID, { path: '/' });
		}
	} else if (!sekolahId) {
		event.cookies.set(cookieNames.ACTIVE_SEKOLAH_ID, String(sekolah.id), { path: '/' });
	}

	if (!sekolah?.id && event.route.id != '/(informasi-umum)/sekolah/form') {
		throw redirect(303, `/sekolah/form?init`);
	}

	event.locals.sekolah = sekolah as Omit<Sekolah, 'logo'> | undefined;
	return resolve(event);
};

export const handle = sequence(csrfGuard, authGuard, cookieParser);

const sqliteErrors = {
	SQLITE_CONSTRAINT_UNIQUE: 'Terdapat duplikasi data',
	SQLITE_CONSTRAINT_FOREIGNKEY: 'Data memiliki relasi ke data lainnya yang masih utuh'
};

export const handleError = ({ error, message, status }) => {
	console.error(error);
	if (status >= 500) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const code = (error as any)?.cause?.code as keyof typeof sqliteErrors;
		const customMessage = sqliteErrors[code] || message;
		return { message: customMessage };
	}
	return { message };
};
