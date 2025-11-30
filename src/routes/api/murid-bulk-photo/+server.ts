import fs from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'stream';
import db from '$lib/server/db/index.js';
import { tableMurid } from '$lib/server/db/schema.js';
import { eq, inArray } from 'drizzle-orm';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let unzipper: any;

async function getUnzipper() {
	if (!unzipper) {
		try {
			// @ts-expect-error unzipper has no type definitions
			unzipper = await import('unzipper');
		} catch {
			throw new Error('unzipper package not found. Install with: pnpm add unzipper');
		}
	}
	return unzipper;
}

function uploadsDir() {
	const envPhoto = process.env.photo || 'file:./data/uploads';
	const raw = envPhoto.startsWith('file:') ? envPhoto.slice(5) : envPhoto;
	return path.resolve(raw);
}

function slugifyName(name: string) {
	if (!name) return 'murid';
	const cleaned = name
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^\p{L}\p{N}\s-]/gu, '')
		.trim()
		.replace(/\s+/g, '-')
		.toLowerCase();
	return cleaned.substring(0, 80) || 'murid';
}

async function generateUniqueFilename(
	dbInstance: typeof db,
	base: string,
	ext: string,
	dir: string
) {
	let filename = `${base}${ext}`;
	let counter = 1;
	let exists = false;

	do {
		try {
			await fs.access(path.join(dir, filename));
			exists = true;
			filename = `${base}-${counter}${ext}`;
			counter++;
		} catch {
			exists = false;
		}
	} while (exists && counter < 1000);

	return filename;
}

interface PhotoFile {
	filename: string;
	buffer: Buffer;
	ext: string;
}

async function extractPhotosFromZip(zipBuffer: Buffer): Promise<Map<string, PhotoFile[]>> {
	const unzip = await getUnzipper();
	const result = new Map<string, PhotoFile[]>();

	try {
		// Create a readable stream from the buffer
		const zipStream = Readable.from(zipBuffer);

		return new Promise((resolve, reject) => {
			zipStream
				.pipe(unzip.Parse())
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				.on('entry', async (entry: any) => {
					const fileName = entry.path;
					const isDir = entry.type === 'Directory';

					if (isDir) {
						entry.autodrain();
						return;
					}

					// Support two formats:
					// 1. NISN/filename.jpg or NISN/subfolder/filename.jpg (folder structure)
					// 2. nisn.jpg or nisn.jpeg or nisn.png (file with NISN name)
					const parts = fileName.split('/').filter((p: string) => p);
					if (parts.length === 0) {
						entry.autodrain();
						return;
					}

					let nisn: string | null = null;
					const filename = parts[parts.length - 1];

					// Only process image files
					const ext = path.extname(filename).toLowerCase();
					if (!['.jpg', '.jpeg', '.png'].includes(ext)) {
						entry.autodrain();
						return;
					}

					// Format 1: Detect if first part is NISN folder (has at least 2 parts, first part is numeric)
					if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
						nisn = parts[0];
					}
					// Format 2: Extract NISN from filename without extension (e.g., "123456789.jpg")
					else if (parts.length === 1) {
						const nameWithoutExt = path.basename(filename, ext);
						if (/^\d+$/.test(nameWithoutExt)) {
							nisn = nameWithoutExt;
						}
					}

					if (!nisn) {
						entry.autodrain();
						return;
					}

					// Read file buffer
					const chunks: Buffer[] = [];
					entry.on('data', (chunk: Buffer) => chunks.push(chunk));
					entry.on('end', () => {
						const buffer = Buffer.concat(chunks);

						// Validate file size (max 500KB per file)
						if (buffer.length > 500 * 1024) {
							return;
						}

						const photos = result.get(nisn) || [];
						photos.push({
							filename: filename,
							buffer: buffer,
							ext: ext
						});
						result.set(nisn, photos);
					});
					entry.on('error', () => {
						entry.autodrain();
					});
				})
				.on('error', reject)
				.on('finish', () => resolve(result));
		});
	} catch (err) {
		console.error('Unzip error:', err);
		throw err;
	}
}

export async function POST({
	request,
	locals
}: {
	request: Request;
	locals: App.Locals;
}): Promise<Response> {
	const sekolahId = locals.sekolah?.id;
	if (!sekolahId) {
		return new Response(JSON.stringify({ message: 'Unauthorized - no sekolah' }), { status: 401 });
	}

	try {
		const formData = await request.formData();
		const uploadedFile = formData.get('zipFile') as File | null;

		if (!uploadedFile || uploadedFile.size === 0) {
			return new Response(JSON.stringify({ message: 'No file provided' }), { status: 400 });
		}

		if (!uploadedFile.type.includes('zip') && !uploadedFile.name.endsWith('.zip')) {
			return new Response(JSON.stringify({ message: 'Format file tidak didukung; hanya ZIP' }), {
				status: 400
			});
		}

		if (uploadedFile.size > 100 * 1024 * 1024) {
			return new Response(
				JSON.stringify({ message: 'Ukuran file ZIP tidak boleh lebih dari 100MB' }),
				{ status: 400 }
			);
		}

		// Read zip file
		const zipBuffer = Buffer.from(await uploadedFile.arrayBuffer());

		// Extract photos from zip organized by NISN
		const photosByNisn = await extractPhotosFromZip(zipBuffer);

		if (photosByNisn.size === 0) {
			return new Response(
				JSON.stringify({
					message: 'Tidak ada foto ditemukan dalam ZIP',
					uploaded: 0,
					failed: 0
				}),
				{ status: 400 }
			);
		}

		// Find all murid with matching NISN
		const nisnList = Array.from(photosByNisn.keys());
		const murids = await db.query.tableMurid.findMany({
			where: (tbl) => inArray(tbl.nisn, nisnList),
			columns: {
				id: true,
				nisn: true,
				nama: true,
				foto: true,
				sekolahId: true
			}
		});

		// Filter by sekolah
		const allowedMurids = murids.filter((m) => m.sekolahId === sekolahId);

		if (allowedMurids.length === 0) {
			return new Response(
				JSON.stringify({
					message: 'Tidak ada murid ditemukan dengan NISN yang sesuai',
					uploaded: 0,
					failed: 0
				}),
				{ status: 400 }
			);
		}

		const uploadsPath = uploadsDir();
		await fs.mkdir(uploadsPath, { recursive: true });

		let uploadedCount = 0;
		let failedCount = 0;

		// Process each murid with photos
		for (const murid of allowedMurids) {
			const photos = photosByNisn.get(murid.nisn);
			if (!photos || photos.length === 0) continue;

			try {
				// Use first photo (or could allow multiple - for now use first)
				const photo = photos[0];

				// Generate unique filename
				const base = slugifyName(murid.nama || `murid-${murid.id}`);
				const filename = await generateUniqueFilename(db, base, photo.ext, uploadsPath);
				const filePath = path.join(uploadsPath, filename);

				// Remove old file if exists
				if (murid.foto && murid.foto !== filename) {
					try {
						await fs.unlink(path.join(uploadsPath, murid.foto));
					} catch {
						// ignore
					}
				}

				// Write file
				await fs.writeFile(filePath, photo.buffer, { mode: 0o644 });

				// Update database
				await db.update(tableMurid).set({ foto: filename }).where(eq(tableMurid.id, murid.id));

				uploadedCount++;
			} catch (err) {
				console.error(`Failed to upload photo for murid ${murid.id}:`, err);
				failedCount++;
			}
		}

		return new Response(
			JSON.stringify({
				message: `Upload selesai: ${uploadedCount} foto berhasil, ${failedCount} gagal`,
				uploaded: uploadedCount,
				failed: failedCount
			}),
			{
				headers: { 'Content-Type': 'application/json' }
			}
		);
	} catch (err) {
		console.error('Bulk photo upload error:', err);
		return new Response(
			JSON.stringify({ message: 'Gagal memproses ZIP file', uploaded: 0, failed: 0 }),
			{ status: 500 }
		);
	}
}
