import db from '$lib/server/db';
import { tableMataPelajaran } from '$lib/server/db/schema';
import { pksParentName, pksMapelNames } from '$lib/statics';
import { and, eq, inArray } from 'drizzle-orm';

// Only add parent PKS mapel, variants will be auto-generated when editing TP
export async function addPksParentToClasses(kelasIds: number[]) {
	if (!kelasIds.length) return;

	const existing = await db.query.tableMataPelajaran.findMany({
		columns: { kelasId: true, nama: true },
		where: and(
			inArray(tableMataPelajaran.kelasId, kelasIds),
			eq(tableMataPelajaran.nama, pksParentName)
		)
	});

	const existingSet = new Set(existing.map((item) => item.kelasId));
	const payload: Array<typeof tableMataPelajaran.$inferInsert> = [];

	for (const kelasId of kelasIds) {
		if (!existingSet.has(kelasId)) {
			payload.push({ kelasId, nama: pksParentName, jenis: 'wajib', kkm: 0, kode: 'PKS' });
		}
	}

	if (payload.length) {
		await db.insert(tableMataPelajaran).values(payload);
	}
}

// Ensure all PKS variants exist for given classes (used in TP-RL page)
export async function ensurePksMapelForClasses(kelasIds: number[]) {
	if (!kelasIds.length) return;

	const existing = await db.query.tableMataPelajaran.findMany({
		columns: { kelasId: true, nama: true },
		where: and(
			inArray(tableMataPelajaran.kelasId, kelasIds),
			inArray(tableMataPelajaran.nama, pksMapelNames)
		)
	});

	const existingSet = new Set(existing.map((item) => `${item.kelasId}:${item.nama}`));
	const payload: Array<typeof tableMataPelajaran.$inferInsert> = [];

	for (const kelasId of kelasIds) {
		for (const nama of pksMapelNames) {
			const key = `${kelasId}:${nama}`;
			if (!existingSet.has(key)) {
				payload.push({ kelasId, nama, jenis: 'wajib', kkm: 0, kode: 'PKS' });
			}
		}
	}

	if (payload.length) {
		await db.insert(tableMataPelajaran).values(payload);
	}
}
