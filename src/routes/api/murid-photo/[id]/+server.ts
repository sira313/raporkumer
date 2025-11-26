import fs from 'node:fs/promises';
import path from 'node:path';
import { error } from '@sveltejs/kit';
import db from '$lib/server/db/index.js';
import { tableMurid } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

function uploadsDir() {
	const envPhoto = process.env.photo || 'file:./data/uploads';
	const raw = envPhoto.startsWith('file:') ? envPhoto.slice(5) : envPhoto;
	return path.resolve(raw);
}

function contentTypeFor(filename: string) {
	if (filename.endsWith('.png')) return 'image/png';
	return 'image/jpeg';
}

export async function GET({ params }: { params: Record<string, string> }) {
	const id = +params.id;
	if (!id) throw error(400, 'Invalid id');

	const murid = await db.query.tableMurid.findFirst({
		where: eq(tableMurid.id, id),
		columns: { foto: true }
	});
	if (!murid || !murid.foto) throw error(404, 'Not found');

	const dir = uploadsDir();
	const filePath = path.join(dir, murid.foto);
	try {
		const data = await fs.readFile(filePath);
		return new Response(Buffer.from(data), { headers: { 'Content-Type': contentTypeFor(murid.foto) } });
	} catch {
		throw error(404, 'Not found');
	}
}

export async function DELETE({ params, locals }: { params: Record<string, string>; locals: App.Locals }) {
	const id = +params.id;
	if (!id) return new Response('Invalid id', { status: 400 });

	const murid = await db.query.tableMurid.findFirst({ where: eq(tableMurid.id, id), columns: { foto: true, sekolahId: true } });
	if (!murid) return new Response('Not found', { status: 404 });

	// ensure sekolah ownership
	const sekolahId = locals.sekolah?.id;
	if (!sekolahId || murid.sekolahId !== sekolahId) return new Response('Unauthorized', { status: 401 });

	const dir = uploadsDir();
	if (murid.foto) {
		try {
			await fs.unlink(path.join(dir, murid.foto));
		} catch {
			// ignore
		}
		await db.update(tableMurid).set({ foto: null }).where(eq(tableMurid.id, id));
	}
	return new Response('OK');
}

