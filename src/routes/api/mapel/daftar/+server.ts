import db from '$lib/server/db';
import { getAksesMapelUser } from '$lib/server/mapel-access';
import { tableKelas, tableMataPelajaran } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';

export async function GET({ url, locals }) {
	const sekolahId = locals.sekolah?.id;
	if (!sekolahId) {
		throw error(401, 'Unauthorized');
	}

	const kelasIdRaw = url.searchParams.get('kelas_id');
	if (!kelasIdRaw) {
		throw error(400, 'kelas_id required');
	}
	const kelasId = Number(kelasIdRaw);
	if (!Number.isInteger(kelasId) || kelasId <= 0) {
		throw error(400, 'Invalid kelas_id');
	}

	const kelas = await db.query.tableKelas.findFirst({
		columns: { id: true, sekolahId: true },
		where: eq(tableKelas.id, kelasId)
	});

	if (!kelas || kelas.sekolahId !== sekolahId) {
		throw error(404, 'Kelas tidak ditemukan');
	}

	let where = eq(tableMataPelajaran.kelasId, kelasId);

	// Guru mapel ('user') hanya melihat mapel yang berhak dia akses
	// (termasuk sub pembelajaran induknya).
	const user = locals.user as
		{ id?: number; type?: string; mataPelajaranId?: number | null } | undefined;
	if (user?.type === 'user' && typeof user.id === 'number') {
		const akses = await getAksesMapelUser({ id: user.id, mataPelajaranId: user.mataPelajaranId });
		const ids = Array.from(akses.ids);
		if (!ids.length) {
			return json([]);
		}
		where = and(where, inArray(tableMataPelajaran.id, ids))!;
	}

	const mapelList = await db.query.tableMataPelajaran.findMany({
		columns: { id: true, nama: true },
		where,
		orderBy: asc(tableMataPelajaran.nama)
	});

	return json(mapelList);
}
