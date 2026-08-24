// Helper pemilih mapel untuk halaman formulir asesmen:
// - Varian mapel agama/PKS digabung jadi satu entri (label dasar), sehingga
//   select hanya menampilkan "Pendidikan Agama dan Budi Pekerti" dst.
// - ID representatif dipakai saat berpindah murid/mapel; load server sudah
//   otomatis mengarahkan ke varian sesuai agama murid.
// - Label memakai namaLokal, fallback ke nama.
// - Deteksi keluarga mapel + pemetaan agama murid → varian (untuk filter
//   daftar murid dan backstop redirect varian).

import { agamaMapelOptions, agamaParentName, pksMapelOptions, pksParentName } from '$lib/statics';

export type MapelPickerRow = { id: number; nama: string | null; namaLokal: string | null };
export type MapelPickerOption = { id: number; nama: string };

const FAMILIES = [
	{
		// Sama dengan RE_MAPEL_AGAMA di form intrakurikuler: mencakup varian
		// "Pendidikan Agama ..." dan "Pendidikan Kepercayaan terhadap Tuhan YME ...".
		re: /^pendidikan (agama|kepercayaan)/i,
		base: 'pendidikan agama dan budi pekerti',
		label: 'Pendidikan Agama dan Budi Pekerti'
	},
	{
		re: /^pendalaman kitab suci/i,
		base: 'pendalaman kitab suci',
		label: 'Pendalaman Kitab Suci'
	}
];

function norm(value: string | null | undefined) {
	return (value ?? '').trim().toLowerCase();
}

/** Keluarga mapel agama (termasuk varian "Pendidikan Kepercayaan ...")? */
export function isKeluargaAgama(nama: string | null | undefined) {
	return /^pendidikan (agama|kepercayaan)/i.test((nama ?? '').trim());
}

/** Keluarga mapel Pendalaman Kitab Suci? */
export function isKeluargaPks(nama: string | null | undefined) {
	return /^pendalaman kitab suci/i.test((nama ?? '').trim());
}

/** Nama varian untuk key agama tertentu pada keluarga mapel. */
function namaVarianDariKey(family: 'agama' | 'pks', key: string): string | null {
	const options = family === 'agama' ? agamaMapelOptions : pksMapelOptions;
	return options.find((option) => option.key === key)?.name ?? null;
}

/** Key agama murid dari teks bebas kolom agama (mis. "Kristen", "Katolik"). */
export function muridAgamaKey(agama: string | null | undefined): string | null {
	switch (norm(agama)) {
		case 'islam':
			return 'islam';
		case 'kristen':
		case 'protestan':
			return 'kristen';
		case 'katolik':
		case 'katholik':
			return 'katolik';
		case 'hindu':
			return 'hindu';
		case 'buddha':
		case 'budha':
		case 'buddhist':
			return 'buddha';
		case 'khonghucu':
		case 'konghucu':
		case 'khong hu cu':
			return 'konghuchu';
		case 'kepercayaan':
		case 'penghayat':
		case 'penghayat kepercayaan':
			return 'kepercayaan';
		default:
			return null;
	}
}

/**
 * Nama varian yang seharusnya dipakai untuk murid ini pada keluarga mapel
 * aktif. Null = tidak ada varian spesifik (induk/umum dipakai).
 * Contoh: murid "Kristen" pada mapel "PA Katolik..." → nama varian Kristen.
 */
export function namaVarianUntukMurid(
	mapelNama: string | null | undefined,
	muridAgama: string | null | undefined
): string | null {
	const n = norm(mapelNama);
	let family: 'agama' | 'pks' | null = null;
	if (/^pendidikan (agama|kepercayaan)/i.test(n)) family = 'agama';
	else if (/^pendalaman kitab suci/i.test(n)) family = 'pks';
	if (!family) return null;

	const key = muridAgamaKey(muridAgama);
	if (!key || key === 'umum') {
		// Murid tanpa agama dikenal / induk umum.
		return family === 'agama' ? agamaParentName : pksParentName;
	}
	return namaVarianDariKey(family, key);
}

/** Label varian ('Islam', 'Kristen', ...) yang berlaku untuk murid pada keluarga mapel aktif. */
export function labelVarianUntukMurid(
	mapelNama: string | null | undefined,
	muridAgama: string | null | undefined
): string | null {
	const name = namaVarianUntukMurid(mapelNama, muridAgama);
	if (!name) return null;
	const n = norm(name);
	for (const option of [...agamaMapelOptions, ...pksMapelOptions]) {
		if (norm(option.name) === n) return option.label;
	}
	return null;
}

export function buildMapelPicker(
	rows: MapelPickerRow[],
	currentMapelId: number
): { mapelList: MapelPickerOption[]; pickerMapelId: number } {
	const label = (row: MapelPickerRow) => row.namaLokal?.trim() || row.nama || '';

	const familyOfRow = new Map<number, string>();
	const representative = new Map<string, MapelPickerRow>();

	for (const row of rows) {
		const family = FAMILIES.find((f) => f.re.test(norm(row.nama)));
		if (!family) continue;
		familyOfRow.set(row.id, family.label);
		const current = representative.get(family.label);
		// Utamakan record bernama persis dasar; jika belum ada, pakai urutan pertama.
		if (!current || (norm(current.nama) !== family.base && norm(row.nama) === family.base)) {
			representative.set(family.label, row);
		}
	}

	const mapelList: MapelPickerOption[] = rows
		.filter((row) => !familyOfRow.has(row.id))
		.map((row) => ({ id: row.id, nama: label(row) }));

	for (const rep of representative.values()) {
		mapelList.push({ id: rep.id, nama: label(rep) });
	}
	mapelList.sort((a, b) => a.nama.localeCompare(b.nama));

	const currentFamily = familyOfRow.get(currentMapelId);
	const pickerMapelId = currentFamily
		? (representative.get(currentFamily)?.id ?? currentMapelId)
		: currentMapelId;

	return { mapelList, pickerMapelId };
}

/**
 * Picker datar untuk guru mapel ('user'): hanya mapel yang di-assign (ID atau
 * nama), tanpa penggabungan keluarga agama/PKS agar beberapa varian milik guru
 * tetap tampil terpisah.
 */
export function buildGuruMapelPicker(
	rows: MapelPickerRow[],
	aksesIds: Set<number>,
	aksesNames: Set<string>,
	currentMapelId: number
): { mapelList: MapelPickerOption[]; pickerMapelId: number } {
	const mapelList = rows
		.filter((row) => aksesIds.has(row.id) || aksesNames.has((row.nama ?? '').trim().toLowerCase()))
		.map((row) => ({ id: row.id, nama: row.namaLokal?.trim() || row.nama || '' }));
	mapelList.sort((a, b) => a.nama.localeCompare(b.nama));
	const adaCurrent = mapelList.some((opsi) => opsi.id === currentMapelId);
	return {
		mapelList,
		pickerMapelId: adaCurrent ? currentMapelId : (mapelList[0]?.id ?? currentMapelId)
	};
}
