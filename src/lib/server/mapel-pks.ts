import db from '$lib/server/db';
import { tableMataPelajaran } from '$lib/server/db/schema';
import { pksParentName, pksMapelNames } from '$lib/statics';
import { and, eq, inArray } from 'drizzle-orm';

// Only add parent PKS mapel, variants will be auto-generated when editing TP
// Returns true if new PKS parent was added, false if it already existed
export async function addPksParentToClasses(kelasIds: number[]): Promise<boolean> {
	if (!kelasIds.length) return false;

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
		return true;
	}

	return false;
}

// Ensure all PKS variants exist for given classes (used in TP-RL page)
// Only creates variants if the parent PKS mapel already exists
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

	// Check which classes have the parent PKS mapel
	const kelasIdsWithParent = new Set<number>();
	for (const item of existing) {
		if (item.nama === pksParentName) {
			kelasIdsWithParent.add(item.kelasId);
		}
	}

	const payload: Array<typeof tableMataPelajaran.$inferInsert> = [];

	for (const kelasId of kelasIds) {
		// Only create variants if parent PKS already exists for this kelas
		if (!kelasIdsWithParent.has(kelasId)) continue;

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
