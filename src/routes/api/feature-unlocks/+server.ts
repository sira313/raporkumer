import db from '$lib/server/db';
import { tableFeatureUnlock } from '$lib/server/db/schema';
import { json } from '@sveltejs/kit';
import { createHash } from 'node:crypto';
import { and, eq } from 'drizzle-orm';

const CHEAT_FEATURE_KEY = 'cheat-asesmen-sumatif';
const CHEAT_TOKEN_HASH = 'a1e2c7ab05ba6aad11e360e04561ad76a0fd32d927d7254d871cde2e9871823c';

export const POST = async ({ request, locals }) => {
	const sekolahId = locals.sekolah?.id ?? null;
	if (!sekolahId) {
		return json({ message: 'Sekolah aktif tidak ditemukan.' }, { status: 401 });
	}

	let payload: unknown;
	try {
		payload = await request.json();
	} catch (error) {
		console.error('Gagal membaca payload unlock fitur', error);
		return json({ message: 'Payload tidak valid.' }, { status: 400 });
	}

	const body = (payload ?? {}) as Record<string, unknown>;
	const featureKey = typeof body.featureKey === 'string' ? body.featureKey.trim() : '';
	const token = typeof body.token === 'string' ? body.token.trim() : '';

	if (!featureKey) {
		return json({ message: 'Fitur wajib diisi.' }, { status: 400 });
	}

	if (featureKey !== CHEAT_FEATURE_KEY) {
		return json({ message: 'Fitur tidak dikenali.' }, { status: 404 });
	}

	if (!token) {
		return json({ message: 'Token tidak boleh kosong.' }, { status: 400 });
	}

	const existing = await db.query.tableFeatureUnlock.findFirst({
		columns: { id: true },
		where: and(
			eq(tableFeatureUnlock.sekolahId, sekolahId),
			eq(tableFeatureUnlock.featureKey, featureKey)
		)
	});

	if (existing) {
		return json({ data: { unlocked: true }, message: 'Fitur sudah dibuka sebelumnya.' });
	}

	const hash = createHash('sha256').update(token).digest('hex');
	if (hash !== CHEAT_TOKEN_HASH) {
		return json({ message: 'Token tidak valid.' }, { status: 403 });
	}

	const now = new Date().toISOString();

	await db
		.insert(tableFeatureUnlock)
		.values({
			sekolahId,
			featureKey,
			unlockedAt: now,
			createdAt: now,
			updatedAt: now
		})
		.onConflictDoUpdate({
			target: [tableFeatureUnlock.sekolahId, tableFeatureUnlock.featureKey],
			set: {
				unlockedAt: now,
				updatedAt: now
			}
		});

	return json({ data: { unlocked: true }, message: 'Fitur berhasil dibuka.' });
};
