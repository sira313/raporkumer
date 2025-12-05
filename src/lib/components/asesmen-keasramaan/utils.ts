/**
 * Utility functions untuk kalkulasi nilai indikator keasramaan
 * Rubrik: 1 (Perlu bimbingan) - 4 (Sangat baik)
 * Konversi huruf: A (3.25-4.00), B (2.50-3.24), C (1.75-2.49), D (1.00-1.74)
 */

export type RubrikValue = 1 | 2 | 3 | 4;
export type NilaiHuruf = 'A' | 'B' | 'C' | 'D';

export interface IndikatorCategory {
	key: 'sangat-baik' | 'baik' | 'cukup' | 'perlu-bimbingan';
	label: string;
	huruf: NilaiHuruf;
	className: string;
	icon: 'error' | 'alert' | 'check' | 'info';
	description: string;
}

/**
 * Map nilai kategori keasramaan ke nilai angka (rubrik)
 */
export function kategoriToRubrikValue(
	kategori: 'sangat-baik' | 'baik' | 'cukup' | 'perlu-bimbingan'
): RubrikValue {
	const mapping: Record<string, RubrikValue> = {
		'sangat-baik': 4,
		baik: 3,
		cukup: 2,
		'perlu-bimbingan': 1
	};
	return mapping[kategori] as RubrikValue;
}

/**
 * Konversi nilai angka (rubrik) ke huruf
 * Range:
 * - 3.25 – 4.00: A (Sangat baik)
 * - 2.50 – 3.24: B (Baik)
 * - 1.75 – 2.49: C (Cukup)
 * - 1.00 – 1.74: D (Perlu bimbingan)
 */
export function nilaiAngkaToHuruf(nilai: number | null): NilaiHuruf | null {
	if (nilai == null) return null;
	if (nilai >= 3.25 && nilai <= 4.0) return 'A';
	if (nilai >= 2.5 && nilai < 3.25) return 'B';
	if (nilai >= 1.75 && nilai < 2.5) return 'C';
	if (nilai >= 1.0 && nilai < 1.75) return 'D';
	return null;
}

/**
 * Hitung nilai indikator dari array nilai TP
 * Nilai Indikator = (Nilai TP1 + Nilai TP2 + ...) / Jumlah total TP
 */
export function hitungNilaiIndikator(nilaiTpArray: (number | null)[]): number | null {
	const validValues = nilaiTpArray.filter((v): v is number => v != null);
	if (validValues.length === 0) return null;
	const sum = validValues.reduce((acc, val) => acc + val, 0);
	const rata2 = sum / validValues.length;
	return Math.round(rata2 * 100) / 100; // Round to 2 decimal places
}

/**
 * Dapatkan kategori indikator dengan metadata lengkap
 */
export function getIndikatorCategory(nilaiAngka: number | null): IndikatorCategory | null {
	if (nilaiAngka == null) return null;

	const huruf = nilaiAngkaToHuruf(nilaiAngka);
	if (huruf == null) return null;

	const categoryMap: Record<NilaiHuruf, IndikatorCategory> = {
		A: {
			key: 'sangat-baik',
			label: 'Sangat Baik',
			huruf: 'A',
			className: 'alert-soft alert-info',
			icon: 'info',
			description: 'Nilai indikator menunjukkan pencapaian Sangat Baik (3.25 – 4.00)'
		},
		B: {
			key: 'baik',
			label: 'Baik',
			huruf: 'B',
			className: 'alert-soft alert-success',
			icon: 'check',
			description: 'Nilai indikator menunjukkan pencapaian Baik (2.50 – 3.24)'
		},
		C: {
			key: 'cukup',
			label: 'Cukup',
			huruf: 'C',
			className: 'alert-soft alert-warning',
			icon: 'alert',
			description: 'Nilai indikator menunjukkan pencapaian Cukup (1.75 – 2.49)'
		},
		D: {
			key: 'perlu-bimbingan',
			label: 'Perlu Bimbingan',
			huruf: 'D',
			className: 'alert-soft alert-error',
			icon: 'error',
			description: 'Nilai indikator menunjukkan pencapaian Perlu Bimbingan (1.00 – 1.74)'
		}
	};

	return categoryMap[huruf];
}

/**
 * Format nilai angka dengan 2 desimal
 */
export function formatScore(value: number | null): string {
	if (value == null) return '–';
	return value.toFixed(2);
}
