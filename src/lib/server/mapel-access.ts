import db from '$lib/server/db';
import { tableAuthUserMataPelajaran, tableMataPelajaran } from '$lib/server/db/schema';
import { agamaMapelNames, agamaParentName, pksMapelNames, pksParentName } from '$lib/statics';
import { and, eq, inArray, or, type SQL } from 'drizzle-orm';

// Pusat cek akses mapel untuk akun tipe "user" (guru mapel).
// Aturan:
// 1. ID mapel yang di-assign (auth_user_mata_pelajaran + legacy kolom).
// 2. Nama mapel yang di-assign (lintas kelas/semester, nama normalized sama).
// 3. Keluarga nama agama/PKS: varian di-assign → membuka nama induknya.
// 4. Sub pembelajaran: child (dapodikIndukPembelajaranId) yang terikat ke
//    pembelajaran induk milik guru (kelas sama) otomatis ikut diakses —
//    ID dan namanya (nama ikut agar pindah kelas tetap jalan).

/** Cek apakah user perlu difilter hanya ke mapel yang di-assign.
 *  - tipe 'user' → selalu filter.
 *  - tipe 'wali_kelas' → filter di kelas BUKAN miliknya, bebas di kelasnya sendiri. */
export function needsMapelFilter(
	user: { type?: string; id?: number; kelasId?: number | null } | null | undefined,
	selectedKelasId: number | null | undefined
): boolean {
	if (!user?.id) return false;
	if (user.type === 'user') return true;
	if (user.type === 'wali_kelas' && selectedKelasId != null && user.kelasId !== selectedKelasId)
		return true;
	return false;
}

type MapelInti = { id: number; kelasId: number; nama: string | null };

function norm(value: string | null | undefined) {
	return (value ?? '').trim().toLowerCase();
}

const FAMILIES: Array<{ members: string[]; parent: string }> = [
	{ members: agamaMapelNames.map(norm), parent: norm(agamaParentName) },
	{ members: pksMapelNames.map(norm), parent: norm(pksParentName) }
];

function familyParentName(nama: string | null | undefined): string | null {
	const n = norm(nama);
	for (const family of FAMILIES) {
		if (family.members.includes(n) && n !== family.parent) {
			return family.parent;
		}
	}
	return null;
}

export type AksesMapel = {
	ids: Set<number>;
	/** Nama normalized (trim+lowercase) untuk perbandingan di sisi aplikasi. */
	names: Set<string>;
	/** Nama asli (hanya trim) untuk dipakai di query SQL (inArray dsb). */
	rawNames: Set<string>;
};

export async function getAksesMapelUser(user: {
	id: number;
	mataPelajaranId?: number | null;
}): Promise<AksesMapel> {
	const assigned = await db.query.tableAuthUserMataPelajaran.findMany({
		columns: { mataPelajaranId: true },
		where: eq(tableAuthUserMataPelajaran.authUserId, user.id)
	});
	const ids = new Set(assigned.map((row) => row.mataPelajaranId));
	if (user.mataPelajaranId) ids.add(user.mataPelajaranId);

	if (!ids.size) return { ids, names: new Set(), rawNames: new Set() };

	const intiRows = await db.query.tableMataPelajaran.findMany({
		columns: { id: true, kelasId: true, nama: true, dapodikPembelajaranId: true },
		where: inArray(tableMataPelajaran.id, Array.from(ids))
	});

	const names = new Set<string>();
	const rawNames = new Set<string>();
	for (const row of intiRows) {
		names.add(norm(row.nama));
		rawNames.add((row.nama ?? '').trim());
		const parent = familyParentName(row.nama);
		if (parent) names.add(parent);
	}

	// Sub pembelajaran: child terikat ke pembelajaran induk milik guru (kelas sama).
	const pasangan = intiRows
		.filter((row) => row.dapodikPembelajaranId)
		.map((row): SQL =>
			and(
				eq(tableMataPelajaran.kelasId, row.kelasId),
				eq(tableMataPelajaran.dapodikIndukPembelajaranId, row.dapodikPembelajaranId!)
			)!
		);
	if (pasangan.length) {
		const subs = await db.query.tableMataPelajaran.findMany({
			columns: { id: true, nama: true },
			where: or(...pasangan)
		});
		for (const sub of subs) {
			ids.add(sub.id);
			names.add(norm(sub.nama));
			rawNames.add((sub.nama ?? '').trim());
		}
	}

	return { ids, names, rawNames };
}

export async function bolehAksesMapel(
	user: { id: number; mataPelajaranId?: number | null },
	mapel: Pick<MapelInti, 'id' | 'nama'>
): Promise<boolean> {
	const akses = await getAksesMapelUser(user);
	return akses.ids.has(mapel.id) || akses.names.has(norm(mapel.nama));
}
