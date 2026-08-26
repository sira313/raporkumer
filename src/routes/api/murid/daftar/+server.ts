import db from '$lib/server/db';
import { getAksesMapelUser } from '$lib/server/mapel-access';
import { isKeluargaAgama, isKeluargaPks, muridAgamaKey } from '$lib/server/mapel-picker';
import { agamaMapelOptions, pksMapelOptions } from '$lib/statics';
import { tableKelas, tableMataPelajaran, tableMurid } from '$lib/server/db/schema';
import { error, json } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';

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

	const muridRows = await db.query.tableMurid.findMany({
		columns: { id: true, nama: true, agama: true },
		where: eq(tableMurid.kelasId, kelasId),
		orderBy: asc(tableMurid.nama)
	});

	// Guru mapel ('user'): pada mapel keluarga agama/PKS (varian maupun induk),
	// hanya murid dengan agama varian yang diajarnya.
	const user = locals.user as
		{ id?: number; type?: string; mataPelajaranId?: number | null } | undefined;
	const mapelIdParam = url.searchParams.get('mapel_id');
	if (
		user?.type === 'user' &&
		typeof user.id === 'number' &&
		mapelIdParam &&
		Number.isInteger(Number(mapelIdParam))
	) {
		const mapel = await db.query.tableMataPelajaran.findFirst({
			columns: { id: true, nama: true, kelasId: true },
			where: eq(tableMataPelajaran.id, Number(mapelIdParam))
		});
		if (!mapel || mapel.kelasId !== kelasId) {
			throw error(400, 'Invalid mapel_id');
		}
		if (isKeluargaAgama(mapel.nama) || isKeluargaPks(mapel.nama)) {
			const akses = await getAksesMapelUser(
				{
					id: user.id,
					mataPelajaranId: user.mataPelajaranId
				},
				kelasId
			);
			const options = isKeluargaPks(mapel.nama) ? pksMapelOptions : agamaMapelOptions;
			const keys = new Set<string>(
				options
					.filter((o) => o.key !== 'umum' && akses.names.has(o.name.trim().toLowerCase()))
					.map((o) => o.key)
			);
			const punyaVarianKeluarga = [...agamaMapelOptions, ...pksMapelOptions].some(
				(o) => o.key !== 'umum' && akses.names.has(o.name.trim().toLowerCase())
			);
			// Varian cocok → hanya murid seagama. Guru terikat varian keluarga lain
			// (lintas agama/PKS) → tanpa daftar murid. Guru umum/tanpa varian →
			// perilaku lama: seluruh murid kelas.
			if (keys.size) {
				return json(
					muridRows.filter((m) => {
						const k = muridAgamaKey(m.agama);
						return k !== null && keys.has(k);
					})
				);
			}
			if (punyaVarianKeluarga) {
				return json([]);
			}
		}
	}

	return json(muridRows);
}
