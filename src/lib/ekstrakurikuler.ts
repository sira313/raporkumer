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
>((acc, option) => {
	acc[option.value] = option.label;
	return acc;
}, {} as Record<EkstrakurikulerNilaiKategori, string>);

const kategoriSet = new Set(kategoriOptions.map((option) => option.value));

export function isEkstrakurikulerNilaiKategori(value: unknown): value is EkstrakurikulerNilaiKategori {
	return typeof value === 'string' && kategoriSet.has(value as EkstrakurikulerNilaiKategori);
}

const LOCALE_ID = 'id-ID';

export function buildEkstrakurikulerDeskripsi(parts: Array<{
	kategori: EkstrakurikulerNilaiKategori;
	tujuan: string;
}>): string | null {
	const fragments = parts
		.map((part) => {
			const label = ekstrakurikulerNilaiLabelByValue[part.kategori];
			const tujuan = (part.tujuan ?? '').trim();
			if (!label || !tujuan) return null;
			const labelLower = label.toLocaleLowerCase(LOCALE_ID);
			const tujuanText = tujuan.charAt(0).toLocaleLowerCase(LOCALE_ID) + tujuan.slice(1);
			const fragment = `${labelLower} dalam ${tujuanText}`.trim();
			return fragment ? fragment : null;
		})
		.filter((value): value is string => Boolean(value));

	if (!fragments.length) return null;

	const normalized = fragments.map((fragment, index) => {
		const trimmed = fragment.trim();
		if (!trimmed) return null;
		if (index === 0) {
			return capitalizeLocale(trimmed, LOCALE_ID);
		}
		return lowercaseFirst(trimmed, LOCALE_ID);
	}).filter((value): value is string => Boolean(value));

	if (!normalized.length) return null;

	const sentence = joinWithCommaAnd(normalized);
	return sentence.endsWith('.') ? sentence : `${sentence}.`;
}

function capitalizeLocale(value: string, locale = LOCALE_ID) {
	const lower = value.toLocaleLowerCase(locale);
	return lower.charAt(0).toLocaleUpperCase(locale) + lower.slice(1);
}

function lowercaseFirst(value: string, locale = LOCALE_ID) {
	if (!value) return value;
	return value.charAt(0).toLocaleLowerCase(locale) + value.slice(1);
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
