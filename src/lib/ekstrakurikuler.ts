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

	const fragments: string[] = [];
	for (const key of order) {
		const list = groups.get(key) ?? [];
		if (!list.length) continue;
		// Prepare tujuan text: make first char lower-case for inline appearance
		const tujuanItems = list.map((s) => {
			if (!s) return s;
			return s.charAt(0).toLocaleLowerCase(LOCALE_ID) + s.slice(1);
		});
		const joined = joinWithCommaAnd(tujuanItems);
		const label = ekstrakurikulerNilaiLabelByValue[key];
		const fragment = `${label.toLocaleLowerCase(LOCALE_ID)} dalam ${joined}`.trim();
		fragments.push(fragment);
	}

	if (!fragments.length) return null;

	// Normalize: follow kokurikuler pattern — prefix with `Ananda {name}` and
	// keep the first fragment as a sentence continuation (lowercased) after the name.
	const introName = (() => {
		const trimmed = studentName?.trim();
		return trimmed && trimmed.length > 0 ? `Ananda ${trimmed}` : 'Ananda';
	})();

	const normalized = fragments
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

	if (!normalized.length) return null;

	const sentence = normalized.map((s) => s.replace(/[.!?]+$/u, '').trim()).join('. ');
	return sentence.endsWith('.') ? sentence : `${sentence}.`;
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
