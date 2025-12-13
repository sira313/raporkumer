/**
 * Fixed-height based pagination for Rapor tables
 *
 * This approach uses pre-defined heights instead of dynamic DOM measurement
 * to avoid layout thrashing and reactive instability in bulk mode.
 */

import type { TableRow } from '$lib/components/cetak/rapor/table-rows';

/**
 * Subset of rapor data needed for accurate height calculation
 */
export type RaporDataForPagination = {
	kokurikuler?: string | null;
	ekstrakurikuler?: Array<{ nama?: string; predikat?: string; keterangan?: string }> | null;
} | null;

// Paper dimensions (A4 Portrait)
const PAPER_HEIGHT_MM = 297;

// Margins and padding
const PAGE_PADDING_MM = 20; // p-[20mm]
const CONTENT_HEIGHT_MM = PAPER_HEIGHT_MM - PAGE_PADDING_MM * 2; // 257mm

// Convert mm to pixels (at 96 DPI: 1mm ≈ 3.7795px)
const MM_TO_PX = 3.7795275591;
const CONTENT_HEIGHT_PX = CONTENT_HEIGHT_MM * MM_TO_PX; // ~971px

// Fixed component heights - measured from actual rendering
const HEIGHTS = {
	// First page specific
	header: 70, // "Laporan Hasil Belajar" title
	identityTable: 200, // Student identity table
	tableHeader: 45, // Table thead with borders

	// Row heights - based on actual rendering
	intrakRowBase: 45, // Base row structure (nomor, mapel, nilai columns)
	intrakRowPerChar: 0.25, // Height increase per character in deskripsi (~4 chars = 1px)
	intrakRowMinDeskripsi: 40, // Minimum deskripsi area height
	groupHeader: 40, // Intrak group header (e.g., "Kelompok A")

	// Tail block specific
	kokurikulerBlock: 150,
	ekstrakurikulerBlock: 150,
	ketidakhadiranBlock: 120,
	tanggapanBlock: 150,

	// Footer
	footer: 180, // Signature section
	footerGap: 30, // mt-8

	// Page footer (murid name, page number)
	pageFooter: 45,

	// Safety margins - smaller for more efficient space usage
	safetyMargin: 10
};

// Calculate available space for each page type
const FIRST_PAGE_AVAILABLE =
	CONTENT_HEIGHT_PX -
	HEIGHTS.header -
	HEIGHTS.identityTable -
	HEIGHTS.tableHeader -
	HEIGHTS.pageFooter -
	HEIGHTS.safetyMargin;

const CONTINUATION_PAGE_AVAILABLE =
	CONTENT_HEIGHT_PX - HEIGHTS.tableHeader - HEIGHTS.pageFooter - HEIGHTS.safetyMargin;

export interface PaginationResult {
	pages: Array<{
		rows: TableRow[];
		hasFooter: boolean;
	}>;
	totalPages: number;
}

/**
 * Estimate row height based on row type and content
 * Simple and accurate estimation for row-by-row pagination
 */
function estimateRowHeight(row: TableRow, raporData?: RaporDataForPagination): number {
	if (row.kind === 'intrak-group-header') {
		return HEIGHTS.groupHeader;
	}

	if (row.kind === 'intrak') {
		// Calculate based on deskripsi length
		const deskripsi = row.entry?.deskripsi ?? '';
		const deskripsiLength = deskripsi.length;

		// Base height + character-based increment
		const deskripsiHeight = Math.max(
			HEIGHTS.intrakRowMinDeskripsi,
			deskripsiLength * HEIGHTS.intrakRowPerChar
		);

		return HEIGHTS.intrakRowBase + deskripsiHeight;
	}

	if (row.kind === 'tail') {
		type TailRow = Extract<TableRow, { kind: 'tail' }>;
		const tailRow = row as TailRow;
		const key = tailRow.tailKey;

		switch (key) {
			case 'kokurikuler': {
				// Height = header + content rows
				// Kokurikuler is text-based, estimate based on text length
				const kokurikulerText = raporData?.kokurikuler ?? '';
				const textLength = kokurikulerText.length;
				// Assume ~80 chars per line in the cell
				const estimatedLines = Math.max(2, Math.ceil(textLength / 80));
				const contentHeight = estimatedLines * 18 + 20; // 18px per line + padding
				return 45 + contentHeight; // 45px header + content
			}
			case 'ekstrakurikuler': {
				// Height = header + (number of items × row height)
				const items = raporData?.ekstrakurikuler ?? [];
				const itemCount = items.length;
				if (itemCount === 0) {
					// Empty state: header + 1 "no data" row
					return 45 + 40;
				}
				// header (45px) + each item row (~35px)
				return 45 + itemCount * 35;
			}
			case 'ketidakhadiran':
				return HEIGHTS.ketidakhadiranBlock;
			case 'tanggapan':
				return HEIGHTS.tanggapanBlock;
			case 'footer':
				// Footer is rendered separately outside table
				return 0;
			default:
				return 60;
		}
	}

	// Fallback for unknown row types
	return 60;
}

/**
 * Pre-calculate pagination with fixed heights
 * Simple greedy algorithm: fill page row-by-row until no more space
 */
export function paginateRaporWithFixedHeights(
	rows: TableRow[],
	raporData?: RaporDataForPagination
): PaginationResult {
	if (rows.length === 0) {
		return {
			pages: [],
			totalPages: 0
		};
	}

	const pages: Array<{ rows: TableRow[]; hasFooter: boolean }> = [];
	let currentPageRows: TableRow[] = [];
	let currentPageHeight = 0;
	let pageIndex = 0;

	const getPageCapacity = () =>
		pageIndex === 0 ? FIRST_PAGE_AVAILABLE : CONTINUATION_PAGE_AVAILABLE;

	for (let i = 0; i < rows.length; i++) {
		const row = rows[i];
		const rowHeight = estimateRowHeight(row, raporData);
		const capacity = getPageCapacity();
		const wouldExceed = currentPageHeight + rowHeight > capacity;

		// Decision: can we fit this row on current page?
		if (currentPageRows.length === 0) {
			// First row on page - always add (even if oversized)
			currentPageRows.push(row);
			currentPageHeight += rowHeight;
		} else if (!wouldExceed) {
			// Row fits - add to current page
			currentPageRows.push(row);
			currentPageHeight += rowHeight;
		} else {
			// Row doesn't fit - start new page

			// Special case: don't leave group header alone at bottom of page
			if (currentPageRows.length > 0) {
				const lastRowOnPage = currentPageRows[currentPageRows.length - 1];
				if (lastRowOnPage.kind === 'intrak-group-header') {
					// Remove group header from current page
					currentPageRows.pop();
					currentPageHeight -= estimateRowHeight(lastRowOnPage, raporData);

					// Save current page
					if (currentPageRows.length > 0) {
						pages.push({ rows: currentPageRows, hasFooter: false });
						pageIndex++;
					}

					// Start new page with the group header
					currentPageRows = [lastRowOnPage, row];
					currentPageHeight = estimateRowHeight(lastRowOnPage, raporData) + rowHeight;
					continue;
				}
			}

			// Save current page
			pages.push({ rows: currentPageRows, hasFooter: false });
			pageIndex++;

			// Start new page with current row
			currentPageRows = [row];
			currentPageHeight = rowHeight;
		}
	}

	// Push last page if it has content
	if (currentPageRows.length > 0) {
		pages.push({ rows: currentPageRows, hasFooter: false });
	}

	// Determine footer placement
	if (pages.length > 0) {
		const lastPage = pages[pages.length - 1];
		const lastPageHeight = lastPage.rows.reduce((sum, row) => {
			return sum + estimateRowHeight(row, raporData);
		}, 0);

		const capacity = pages.length === 1 ? FIRST_PAGE_AVAILABLE : CONTINUATION_PAGE_AVAILABLE;
		const footerSpace = HEIGHTS.footer + HEIGHTS.footerGap;
		const remainingSpace = capacity - lastPageHeight;

		if (remainingSpace >= footerSpace) {
			// Footer fits on last page
			lastPage.hasFooter = true;
		} else {
			// Footer needs separate page
			pages.push({ rows: [], hasFooter: true });
		}
	}

	return {
		pages,
		totalPages: pages.length
	};
}

/**
 * Calculate if footer can fit on last page
 */
export function canFooterFitOnLastPage(
	lastPageRows: TableRow[],
	isOnlyPage: boolean,
	raporData?: RaporDataForPagination
): boolean {
	const lastPageHeight = lastPageRows.reduce((sum, row) => {
		return sum + estimateRowHeight(row, raporData);
	}, 0);

	const capacity = isOnlyPage ? FIRST_PAGE_AVAILABLE : CONTINUATION_PAGE_AVAILABLE;

	const footerSpace = HEIGHTS.footer + HEIGHTS.footerGap;
	const remainingSpace = capacity - lastPageHeight;

	return remainingSpace >= footerSpace;
}

/**
 * Debug helper to log pagination info
 */
export function debugPagination(
	result: PaginationResult,
	muridName: string,
	raporData?: RaporDataForPagination
) {
	const pageDetails = result.pages.map((p, i) => {
		const estimatedHeight = p.rows.reduce((sum, row) => sum + estimateRowHeight(row, raporData), 0);
		const capacity = i === 0 ? FIRST_PAGE_AVAILABLE : CONTINUATION_PAGE_AVAILABLE;
		const used = estimatedHeight;
		const remaining = capacity - used;
		const utilization = Math.round((used / capacity) * 100);

		return {
			page: i + 1,
			rows: p.rows.length,
			footer: p.hasFooter,
			used: Math.round(used),
			capacity: Math.round(capacity),
			remaining: Math.round(remaining),
			utilization: `${utilization}%`,
			status: remaining >= 0 ? '✅' : '❌ OVERFLOW'
		};
	});

	console.log(`[Pagination] ${muridName}:`, {
		pages: result.totalPages,
		firstPageCap: Math.round(FIRST_PAGE_AVAILABLE),
		contPageCap: Math.round(CONTINUATION_PAGE_AVAILABLE),
		details: pageDetails
	});

	// Warn if any page overflows
	const overflowPages = pageDetails.filter((p) => p.remaining < 0);
	if (overflowPages.length > 0) {
		console.warn(`❌ ${muridName}: ${overflowPages.length} pages OVERFLOW!`, overflowPages);
	}
}
