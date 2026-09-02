import fs from 'node:fs/promises';
import path from 'node:path';
import { error } from '@sveltejs/kit';
import { uploadsDir } from '$lib/server/data-dirs';
import { isAuthorizedUser } from '../../routes/pengguna/permissions';

const ALLOWED_TEMPLATES = new Set(['1', '2']);

// Servable template, or null if not one of the known certificate variants. Keeps
// the source filename under `sekolah-<id>-piagam-bg-<1|2>.png` and blocks any
// path traversal via the `template` route param.
function resolveTemplate(template: string): string | null {
	return ALLOWED_TEMPLATES.has(template) ? template : null;
}

// Mutating the piagam background is a school-level setting. Only admin, kepala
// sekolah, or users holding the school-info permission may upload/delete it.
function canMutate(user: App.Locals['user'] | undefined): boolean {
	return isAuthorizedUser(['informasi_umum_sekolah'], user);
}

async function ensureUploadsDir() {
	const dir = uploadsDir();
	try {
		await fs.mkdir(dir, { recursive: true });
	} catch {
		// ignore
	}
	return dir;
}

function filenameFor(sekolahId: number, template: string) {
	return `sekolah-${sekolahId}-piagam-bg-${template}.png`;
}

export async function handleGet({
	params,
	locals
}: {
	params: Record<string, string>;
	locals: App.Locals;
}) {
	const template = params.template;
	const sekolahId = locals.sekolah?.id;
	const staticFile = async (tpl: string | null) => {
		try {
			const filename = tpl === '2' ? 'bg-certificate2.png' : 'bg-certificate.png';
			const p = path.resolve('static', filename);
			return await fs.readFile(p);
		} catch {
			throw error(404, 'Not found');
		}
	};

	const resolved = resolveTemplate(template);
	if (!sekolahId || !resolved) {
		// No active school or unknown template: serve the static default only.
		return new Response(Buffer.from(await staticFile(resolved)), {
			headers: { 'Content-Type': 'image/png' }
		});
	}

	const dir = await ensureUploadsDir();
	const filePath = path.join(dir, filenameFor(sekolahId, resolved));
	try {
		const data = await fs.readFile(filePath);
		return new Response(Buffer.from(data), { headers: { 'Content-Type': 'image/png' } });
	} catch {
		return new Response(Buffer.from(await staticFile(resolved)), {
			headers: { 'Content-Type': 'image/png' }
		});
	}
}

export async function handlePost({
	params,
	locals,
	request
}: {
	params: Record<string, string>;
	locals: App.Locals;
	request: Request;
}) {
	const template = params.template;
	const sekolahId = locals.sekolah?.id;
	if (!sekolahId) return new Response('Sekolah aktif tidak ditemukan.', { status: 401 });
	if (!canMutate(locals.user)) return new Response('Akses ditolak.', { status: 403 });
	const resolved = resolveTemplate(template);
	if (!resolved) return new Response('Template tidak valid.', { status: 400 });

	const contentType = request.headers.get('content-type') || '';
	if (!contentType.includes('multipart/form-data')) {
		return new Response('Bad request', { status: 400 });
	}

	const formData = await request.formData();
	const file = formData.get('bg') as File | null;
	if (!file || !file.size) {
		return new Response('No file', { status: 400 });
	}

	// Only accept png
	if (file.type !== 'image/png') {
		return new Response('Only PNG allowed', { status: 400 });
	}

	const buffer = Buffer.from(await file.arrayBuffer());
	const dir = await ensureUploadsDir();
	const filePath = path.join(dir, filenameFor(sekolahId, resolved));
	await fs.writeFile(filePath, buffer, { mode: 0o644 });

	return new Response('OK');
}

export async function handleDelete({
	params,
	locals
}: {
	params: Record<string, string>;
	locals: App.Locals;
}) {
	const template = params.template;
	const sekolahId = locals.sekolah?.id;
	if (!sekolahId) return new Response('Sekolah aktif tidak ditemukan.', { status: 401 });
	if (!canMutate(locals.user)) return new Response('Akses ditolak.', { status: 403 });
	const resolved = resolveTemplate(template);
	if (!resolved) return new Response('Template tidak valid.', { status: 400 });

	const dir = await ensureUploadsDir();
	const filePath = path.join(dir, filenameFor(sekolahId, resolved));
	try {
		// attempt to unlink; ignore if not exists
		await fs.unlink(filePath);
	} catch {
		// ignore
	}
	return new Response('OK');
}
