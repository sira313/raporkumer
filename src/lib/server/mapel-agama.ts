import db from '$lib/server/db';
import { tableMataPelajaran } from '$lib/server/db/schema';
import { agamaMapelNames } from '$lib/statics';
import { and, inArray } from 'drizzle-orm';

export async function ensureAgamaMapelForClasses(kelasIds: number[]) {
	if (!kelasIds.length) return;

	const existing = await db.query.tableMataPelajaran.findMany({
		columns: { kelasId: true, nama: true },
		where: and(
			inArray(tableMataPelajaran.kelasId, kelasIds),
			inArray(tableMataPelajaran.nama, agamaMapelNames)
		)
	});

	const existingSet = new Set(existing.map((item) => `${item.kelasId}:${item.nama}`));
	const payload: Array<typeof tableMataPelajaran.$inferInsert> = [];

	for (const kelasId of kelasIds) {
		for (const nama of agamaMapelNames) {
			const key = `${kelasId}:${nama}`;
			if (!existingSet.has(key)) {
				payload.push({ kelasId, nama, jenis: 'wajib', kkm: 0 });
			}
		}
	}

	if (payload.length) {
		await db.insert(tableMataPelajaran).values(payload);
	}
}
