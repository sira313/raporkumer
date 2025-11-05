import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';
import {
	readCombinedOriginsFromEnvAndFile,
	writeFileTrustedOrigins,
	normalizeOrigin
} from '$lib/server/csrf-origins';

function isAdmin(user: { type?: string } | undefined) {
	return user?.type === 'admin';
}

export const GET = async () => {
	const combined = await readCombinedOriginsFromEnvAndFile();
	return json({ data: Array.from(combined.values()) });
};

export const POST = async (event: RequestEvent) => {
	const { locals } = event;
	if (!isAdmin(locals.user)) {
		return json({ message: 'Akses ditolak.' }, { status: 403 });
	}

	let payload: unknown;
	try {
		payload = await event.request.json();
	} catch {
		// fallback to form data
		const fd = await event.request.formData();
		const p = fd.get('origins') ?? '';
		payload = { origins: String(p) };
	}

	// accept { origins: string | string[] }
	if (typeof payload !== 'object' || payload === null || !('origins' in payload)) {
		return json({ message: 'Field origins diperlukan.' }, { status: 400 });
	}
	const raw = (payload as { origins: unknown }).origins;
	if (!raw) return json({ message: 'Field origins diperlukan.' }, { status: 400 });

	const items: string[] = Array.isArray(raw)
		? raw.map(String)
		: String(raw)
				.split(/[,\n\r]+/)
				.map((s) => s.trim())
				.filter(Boolean);

	const normalized: string[] = [];
	for (const item of items) {
		const n = normalizeOrigin(item);
		if (!n) return json({ message: `Origin tidak valid: ${item}` }, { status: 400 });
		normalized.push(n);
	}

	try {
		await writeFileTrustedOrigins(normalized);
	} catch (err) {
		return json({ message: String(err instanceof Error ? err.message : err) }, { status: 500 });
	}

	return json({ message: 'Origin disimpan.', restartRequired: true });
};
