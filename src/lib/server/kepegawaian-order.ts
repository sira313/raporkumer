/**
 * Shared print/display ordering for guru by status kepegawaian and golongan.
 * Single source of truth used by `listGuruBySekolah` (UI tables) and the
 * presensi-guru PDF template so both always sort identically.
 */

const STATUS_RANK: Record<string, number> = {
	CPNS: 0,
	PNS: 0,
	PPPK: 1,
	'Honor Pemda': 2,
	'Honorer Sekolah': 3
};

/** Print ordering: CPNS/PNS, PPPK, Honor Pemda, Honor Sekolah, then the rest. */
export function statusKepegawaianRank(status: string | null | undefined): number {
	return STATUS_RANK[(status ?? '').trim()] ?? 4;
}

const GOLONGAN_ROMAN: Record<string, number> = {
	I: 1,
	II: 2,
	III: 3,
	IV: 4,
	V: 5,
	VI: 6,
	VII: 7,
	VIII: 8,
	IX: 9,
	X: 10
};

/** "IV/d" -> 403, "II" -> 199, "IX" -> 899; unparseable/honor ("-") -> -Infinity. */
export function golonganSortKey(value: string | null | undefined): number {
	const m = /^([IVX]+)(?:\/([a-e]))?$/i.exec((value ?? '').trim());
	if (!m) return -Infinity;
	const num = GOLONGAN_ROMAN[m[1].toUpperCase()];
	if (num === undefined) return -Infinity;
	const letter = m[2] ? m[2].toLowerCase().charCodeAt(0) - 97 : -1;
	return num * 100 + letter;
}

export type KepegawaianSortable = {
	statusKepegawaian?: string | null;
	golongan?: string | null;
};

/** Compare by status group first, then golongan from highest to lowest. */
export function compareKepegawaian(a: KepegawaianSortable, b: KepegawaianSortable): number {
	const byStatus =
		statusKepegawaianRank(a.statusKepegawaian) - statusKepegawaianRank(b.statusKepegawaian);
	if (byStatus !== 0) return byStatus;
	return golonganSortKey(b.golongan) - golonganSortKey(a.golongan);
}
