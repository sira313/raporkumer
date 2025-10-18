import fs from 'node:fs/promises';
import path from 'node:path';
import { error } from '@sveltejs/kit';

function uploadsDir() {
	return path.resolve('data', 'uploads');
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

	if (!sekolahId) {
		// Serve static default depending on template
		try {
			const filename = template === '2' ? 'bg-certificate2.png' : 'bg-certificate.png';
			const p = path.resolve('static', filename);
			const data = await fs.readFile(p);
			return new Response(Buffer.from(data), { headers: { 'Content-Type': 'image/png' } });
		} catch {
			throw error(404, 'Not found');
		}
	}

	const dir = await ensureUploadsDir();
	const filePath = path.join(dir, filenameFor(sekolahId, template));
	try {
		const data = await fs.readFile(filePath);
		return new Response(Buffer.from(data), { headers: { 'Content-Type': 'image/png' } });
	} catch {
		// fallback to static depending on template
		try {
			const filename = template === '2' ? 'bg-certificate2.png' : 'bg-certificate.png';
			const p = path.resolve('static', filename);
			const data = await fs.readFile(p);
			return new Response(Buffer.from(data), { headers: { 'Content-Type': 'image/png' } });
		} catch {
			throw error(404, 'Not found');
		}
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
	const filePath = path.join(dir, filenameFor(sekolahId, template));
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

	const dir = await ensureUploadsDir();
	const filePath = path.join(dir, filenameFor(sekolahId, template));
	try {
		// attempt to unlink; ignore if not exists
		await fs.unlink(filePath);
	} catch {
		// ignore
	}
	return new Response('OK');
}
