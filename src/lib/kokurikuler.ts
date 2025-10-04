import type { DimensiProfilLulusanKey } from '$lib/statics';
import {
	profilPelajarPancasilaDimensionLabelByKey,
	profilPelajarPancasilaDimensions
} from '$lib/statics';

export const nilaiKategoriOptions = [
	{ value: 'sangat-baik', label: 'Sangat baik' },
	{ value: 'baik', label: 'Baik' },
	{ value: 'cukup', label: 'Cukup' },
	{ value: 'kurang', label: 'Kurang' }
] as const;

export type NilaiKategori = (typeof nilaiKategoriOptions)[number]['value'];

export const nilaiKategoriLabelByValue = nilaiKategoriOptions.reduce<
	Record<NilaiKategori, string>
>((acc, option) => {
	acc[option.value] = option.label;
	return acc;
}, {} as Record<NilaiKategori, string>);

const kategoriSet = new Set(nilaiKategoriOptions.map((option) => option.value));

export function isNilaiKategori(value: unknown): value is NilaiKategori {
	return typeof value === 'string' && kategoriSet.has(value as NilaiKategori);
}

const dimensionKeySet = new Set(profilPelajarPancasilaDimensions.map((dimension) => dimension.key));

export function isProfilDimensionKey(value: unknown): value is DimensiProfilLulusanKey {
	return typeof value === 'string' && dimensionKeySet.has(value as DimensiProfilLulusanKey);
}

export function sanitizeDimensionList(value: unknown): DimensiProfilLulusanKey[] {
	if (!value) return [];
	const list: unknown[] = Array.isArray(value)
		? value
		: typeof value === 'string'
		? (() => {
			try {
				const parsed = JSON.parse(value);
				return Array.isArray(parsed) ? parsed : [];
			} catch (error) {
				console.error('Gagal mengurai dimensi kokurikuler', error);
				return [];
			}
		})()
		: [];

	const unique = new Set<DimensiProfilLulusanKey>();
	for (const item of list) {
		if (isProfilDimensionKey(item)) {
			unique.add(item);
		}
	}
	return Array.from(unique);
}

export function buildKokurikulerDeskripsi(parts: Array<{
	kategori: NilaiKategori;
	dimensi: DimensiProfilLulusanKey;
}>): string | null {
	if (!parts.length) return null;

	const locale = 'id-ID';

	const phrases = parts
		.map((part, index) => {
			const kategoriLabel = nilaiKategoriLabelByValue[part.kategori];
			const dimensiLabel =
				profilPelajarPancasilaDimensionLabelByKey[part.dimensi] ?? part.dimensi;
			const kategoriText = index === 0
				? capitalizeLocale(kategoriLabel, locale)
				: kategoriLabel.toLocaleLowerCase(locale);
			const dimensiText = dimensiLabel.toLocaleLowerCase(locale);
			return `${kategoriText} dalam ${dimensiText}`.trim();
		})
		.filter(Boolean);

	if (!phrases.length) return null;

	let sentence: string;
	if (phrases.length === 1) {
		sentence = phrases[0];
	} else if (phrases.length === 2) {
		sentence = `${phrases[0]}, dan ${phrases[1]}`;
	} else {
		const head = phrases.slice(0, -1).join(', ');
		sentence = `${head}, dan ${phrases[phrases.length - 1]}`;
	}

	sentence = sentence.trim();
	if (!sentence) return null;

	sentence = sentence.charAt(0).toLocaleUpperCase(locale) + sentence.slice(1);
	return sentence.endsWith('.') ? sentence : `${sentence}.`;
}

function capitalizeLocale(value: string, locale = 'id-ID') {
	const lower = value.toLocaleLowerCase(locale);
	return lower.charAt(0).toLocaleUpperCase(locale) + lower.slice(1);
}
