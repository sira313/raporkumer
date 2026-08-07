export const HARI_SEKOLAH_KEYS = [
	'senin',
	'selasa',
	'rabu',
	'kamis',
	'jumat',
	'sabtu',
	'minggu'
] as const;
export type HariSekolahKey = (typeof HARI_SEKOLAH_KEYS)[number];

const DAY_KEY_BY_INDEX: HariSekolahKey[] = [
	'minggu',
	'senin',
	'selasa',
	'rabu',
	'kamis',
	'jumat',
	'sabtu'
];

export function parseHariSekolahCustom(value: string | null | undefined): HariSekolahKey[] | null {
	if (!value) return null;
	try {
		const parsed: unknown = JSON.parse(value);
		if (Array.isArray(parsed) && parsed.length > 0) {
			const days = parsed.filter(
				(d): d is HariSekolahKey =>
					typeof d === 'string' && (HARI_SEKOLAH_KEYS as readonly string[]).includes(d)
			);
			if (days.length > 0) return [...new Set(days)];
		}
	} catch {
		// ignore
	}
	return null;
}

/** Ordered list of school-day keys in week order (senin..minggu). */
export function getHariSekolahList(
	hariSekolah: number | null | undefined,
	hariSekolahCustom: string | null | undefined
): HariSekolahKey[] {
	const custom = parseHariSekolahCustom(hariSekolahCustom);
	if (custom && custom.length > 0) {
		return [...DAY_KEY_BY_INDEX].filter((k) => custom.includes(k));
	}
	const hs = hariSekolah ?? 6;
	if (hs === 5) return ['senin', 'selasa', 'rabu', 'kamis', 'jumat'];
	return ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
}

export function isSchoolDay(
	hariSekolah: number | null | undefined,
	hariSekolahCustom: string | null | undefined,
	year: number,
	month: number,
	day: number
): boolean {
	const custom = parseHariSekolahCustom(hariSekolahCustom);
	if (custom && custom.length > 0) {
		const key = DAY_KEY_BY_INDEX[new Date(year, month - 1, day).getDay()];
		return custom.includes(key);
	}
	const hs = hariSekolah ?? 6;
	const dow = new Date(year, month - 1, day).getDay();
	if (hs === 5) return dow !== 0 && dow !== 6;
	return dow !== 0;
}
