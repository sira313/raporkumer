const kategoriOptions = [
	{ value: 'sangat-baik', label: 'Sangat baik' },
	{ value: 'baik', label: 'Baik' },
	{ value: 'cukup', label: 'Cukup' },
	{ value: 'perlu-bimbingan', label: 'Perlu bimbingan' }
] as const;

export const ekstrakurikulerNilaiOptions = kategoriOptions;

export type EkstrakurikulerNilaiKategori = (typeof kategoriOptions)[number]['value'];

export const ekstrakurikulerNilaiLabelByValue = kategoriOptions.reduce<
	Record<EkstrakurikulerNilaiKategori, string>
>(
	(acc, option) => {
		acc[option.value] = option.label;
		return acc;
	},
	{} as Record<EkstrakurikulerNilaiKategori, string>
);

const kategoriSet = new Set(kategoriOptions.map((option) => option.value));

export function isEkstrakurikulerNilaiKategori(
	value: unknown
): value is EkstrakurikulerNilaiKategori {
	return typeof value === 'string' && kategoriSet.has(value as EkstrakurikulerNilaiKategori);
}

const LOCALE_ID = 'id-ID';

export function buildEkstrakurikulerDeskripsi(
	parts: Array<{
		kategori: EkstrakurikulerNilaiKategori;
		tujuan: string;
	}>,
	studentName?: string | null
): string | null {
	if (!parts || parts.length === 0) return null;

	const order: EkstrakurikulerNilaiKategori[] = ['sangat-baik', 'baik', 'cukup', 'perlu-bimbingan'];

	const groups = new Map<EkstrakurikulerNilaiKategori, string[]>();
	for (const part of parts) {
		if (!isEkstrakurikulerNilaiKategori(part.kategori)) continue;
		const t = (part.tujuan ?? '').replace(/[.!?]+$/gu, '').trim();
		if (!t) continue;
		const arr = groups.get(part.kategori) ?? [];
		arr.push(t);
		groups.set(part.kategori, arr);
	}

    

	// Separate fragments into 'tercapai' (sangat-baik/baik/cukup) and 'perlu-bimbingan'
	const tercapaiKeys: EkstrakurikulerNilaiKategori[] = ['sangat-baik', 'baik', 'cukup'];
	const tercapaiFragments: string[] = [];
	const needFragments: string[] = [];
	for (const key of order) {
		const list = groups.get(key) ?? [];
		if (!list.length) continue;
		const tujuanItems = list.map((s) => {
			if (!s) return s;
			return s.charAt(0).toLocaleLowerCase(LOCALE_ID) + s.slice(1);
		});
		const joined = joinWithCommaAnd(tujuanItems);
		const label = ekstrakurikulerNilaiLabelByValue[key];
		const fragment = `${label.toLocaleLowerCase(LOCALE_ID)} dalam ${joined}`.trim();
		if (tercapaiKeys.includes(key)) {
			tercapaiFragments.push(fragment);
		} else {
			needFragments.push(fragment);
		}
	}

	if (!tercapaiFragments.length && !needFragments.length) return null;

	// Normalize: follow kokurikuler pattern — prefix with `Ananda {name}` and
	// keep the first fragment as a sentence continuation (lowercased) after the name.
	const introName = (() => {
		const trimmed = studentName?.trim();
		return trimmed && trimmed.length > 0 ? `Ananda ${trimmed}` : 'Ananda';
	})();

	const paragraphs: string[] = [];

	// Build tercapai paragraph (if any)
	if (tercapaiFragments.length) {
		const normalized = tercapaiFragments
			.map((frag) => frag.trim())
			.filter(Boolean)
			.map((frag, idx) => {
				if (idx === 0) {
					// first fragment should follow the intro name and be lowercased
					return `${introName} ${frag.toLocaleLowerCase(LOCALE_ID)}`.trim();
				}
				// subsequent fragments are capitalized (sentence start)
				return capitalizeLocale(frag, LOCALE_ID);
			});
		const sentence = normalized.map((s) => s.replace(/[.!?]+$/u, '').trim()).join('. ');
		paragraphs.push(sentence.endsWith('.') ? sentence : `${sentence}.`);
	}

	// Build need/bimbingan paragraph (if any) — put in its own paragraph
	if (needFragments.length) {
		// extract tujuan strings from needFragments: each fragment is like "perlu bimbingan dalam x, dan y"
		// we want only the list of tujuan joined, so recreate from groups['perlu-bimbingan']
		const needList = groups.get('perlu-bimbingan') ?? [];
		const tujuanItems = needList.map((s) => s.charAt(0).toLocaleLowerCase(LOCALE_ID) + s.slice(1));
		const joined = joinWithCommaAnd(tujuanItems);
		const needSentence = `${introName} masih perlu bimbingan dalam ${joined}.`;
		paragraphs.push(needSentence);
	}

	if (!paragraphs.length) return null;
	return paragraphs.join('\n\n');
}

function capitalizeLocale(value: string, locale = LOCALE_ID) {
	const lower = value.toLocaleLowerCase(locale);
	return lower.charAt(0).toLocaleUpperCase(locale) + lower.slice(1);
}

function joinWithCommaAnd(values: string[]): string {
	if (values.length === 1) return values[0];
	if (values.length === 2) {
		return `${values[0]}, dan ${values[1]}`;
	}
	const head = values.slice(0, -1).join(', ');
	const tail = values[values.length - 1];
	return `${head}, dan ${tail}`;
}
