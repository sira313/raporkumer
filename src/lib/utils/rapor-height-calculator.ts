/**
 * Calculate row heights for rapor table pagination without DOM measurement.
 * This enables reliable pagination in both single and bulk preview modes.
 */

import type { TableRow } from '$lib/components/cetak/rapor/table-rows.js';

// Base heights measured from actual rendered tables (in pixels)
const BASE_HEIGHTS = {
	// Group header row (e.g., "A. Mata Pelajaran Wajib")
	groupHeader: 32,

	// Empty row placeholder
	empty: 40,

	// Intrak row base (includes nama mapel, nilai akhir, nilai, capaian kompetensi label)
	intrakBase: 56,

	// Tail blocks (fixed height sections)
	// Adjusted to match actual rendered sizes for better pagination
	tail: {
		kokurikuler: 140,
		ekstrakurikuler: 140,
		ketidakhadiran: 100,
		catatan: 120,
		tanggapan: 120
	}
} as const;

// Text metrics for calculating variable height content
const TEXT_METRICS = {
	// Average characters per line for deskripsi text
	charsPerLine: 85,
	// Height per line of text in deskripsi
	lineHeight: 18,
	// Minimum lines for deskripsi cell
	minLines: 2,
	// Padding inside deskripsi cell
	cellPadding: 8
} as const;

/**
 * Calculate height for deskripsi text content
 */
function calculateDeskripsiHeight(deskripsi: string | null | undefined): number {
	if (!deskripsi || deskripsi.trim().length === 0) {
		return TEXT_METRICS.minLines * TEXT_METRICS.lineHeight + TEXT_METRICS.cellPadding;
	}

	const text = deskripsi.trim();
	const estimatedLines = Math.ceil(text.length / TEXT_METRICS.charsPerLine);
	const actualLines = Math.max(TEXT_METRICS.minLines, estimatedLines);

	return actualLines * TEXT_METRICS.lineHeight + TEXT_METRICS.cellPadding;
}

/**
 * Calculate height for a single intrak (intrakurikuler) row
 */
function calculateIntrakRowHeight(row: Extract<TableRow, { kind: 'intrak' }>): number {
	const deskripsiHeight = calculateDeskripsiHeight(row.entry.deskripsi);
	return BASE_HEIGHTS.intrakBase + deskripsiHeight;
}

/**
 * Calculate heights for all table rows
 */
export function calculateRowHeights(rows: readonly TableRow[]): number[] {
	return rows.map((row) => {
		switch (row.kind) {
			case 'intrak':
				return calculateIntrakRowHeight(row);

			case 'intrak-group-header':
				return BASE_HEIGHTS.groupHeader;

			case 'empty':
				return BASE_HEIGHTS.empty;

			case 'tail': {
				// Footer is rendered separately, not in table
				if (row.tailKey === 'footer') return 0;

				// Type-safe access to tail heights
				const tailHeights: Record<string, number> = BASE_HEIGHTS.tail;
				const height = tailHeights[row.tailKey];
				return height ?? 150;
			}

			default:
				// Fallback for unknown row types
				return 60;
		}
	});
}

/**
 * Calculate footer height (static, doesn't depend on data)
 */
export function calculateFooterHeight(): number {
	// Footer contains:
	// - mt-8 gap (32px)
	// - Grid with 3 columns (Orang tua, Kepala Sekolah, Wali Kelas)
	// - Each column: label + mt-16/20 space + name + NIP
	// Approximate total: 160px
	return 160;
}
