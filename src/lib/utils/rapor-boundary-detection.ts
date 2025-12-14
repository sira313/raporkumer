/**
 * Boundary Detection System for Rapor Pagination
 *
 * Menggunakan DOM measurement untuk mendeteksi boundary violations
 * dan melakukan split otomatis berdasarkan posisi aktual elemen.
 */

import type { TableRow } from '$lib/components/cetak/rapor/table-rows';

// Paper dimensions (A4 Portrait)
const PAPER_HEIGHT_MM = 297;
const PAGE_PADDING_MM = 20;
const CONTENT_HEIGHT_MM = PAPER_HEIGHT_MM - PAGE_PADDING_MM * 2; // 257mm

// Convert mm to pixels (at 96 DPI)
const MM_TO_PX = 3.7795275591;
export const CONTENT_HEIGHT_PX = CONTENT_HEIGHT_MM * MM_TO_PX; // ~971px
export const BOUNDARY_TRIGGER_PX = CONTENT_HEIGHT_PX - 10; // 10px safety margin

// Reserved heights for fixed elements
export const HEIGHTS = {
	header: 70,
	identityTable: 200,
	tableHeader: 45,
	pageFooter: 45,
	footer: 180,
	footerGap: 30
};

export interface PageBoundary {
	pageIndex: number;
	availableHeight: number;
	startY: number;
	endY: number;
	triggerY: number;
}

export interface MeasuredRow {
	row: TableRow;
	element: HTMLElement;
	top: number;
	bottom: number;
	height: number;
	order: number;
}

export interface PaginatedPage {
	pageIndex: number;
	rows: TableRow[];
	hasFooter: boolean;
	boundary: PageBoundary;
}

export interface BoundaryDetectionResult {
	pages: PaginatedPage[];
	totalPages: number;
	measurements: MeasuredRow[];
}

/**
 * Calculate page boundaries based on page index
 */
export function calculatePageBoundary(pageIndex: number, hasHeader: boolean): PageBoundary {
	const firstPageOffset = hasHeader
		? HEIGHTS.header + HEIGHTS.identityTable + HEIGHTS.tableHeader + HEIGHTS.pageFooter
		: HEIGHTS.tableHeader + HEIGHTS.pageFooter;

	const continuationPageOffset = HEIGHTS.tableHeader + HEIGHTS.pageFooter;

	const availableHeight =
		pageIndex === 0
			? CONTENT_HEIGHT_PX - firstPageOffset
			: CONTENT_HEIGHT_PX - continuationPageOffset;

	const startY = pageIndex * CONTENT_HEIGHT_PX;
	const endY = startY + CONTENT_HEIGHT_PX;
	const triggerY = startY + availableHeight;

	return {
		pageIndex,
		availableHeight,
		startY,
		endY,
		triggerY
	};
}

/**
 * Measure all row elements and their positions
 */
export function measureRows(containerElement: HTMLElement, rows: TableRow[]): MeasuredRow[] {
	const measurements: MeasuredRow[] = [];
	const rowElements = containerElement.querySelectorAll<HTMLElement>('[data-row-order]');
	const seenOrders = new Set<number>();

	rowElements.forEach((element) => {
		const orderAttr = element.getAttribute('data-row-order');
		if (!orderAttr) return;

		// Skip non-numeric order (e.g., "12-header")
		if (!/^\d+(\.\d+)?$/.test(orderAttr)) return;

		const order = parseFloat(orderAttr);
		const row = rows.find((r) => r.order === order);
		if (!row) return;

		// Skip duplicate orders (ekstrakurikuler header has 2 tr elements)
		if (seenOrders.has(order)) {
			// For ekstrakurikuler header, add the second tr height to existing measurement
			const existingMeasurement = measurements.find((m) => m.order === order);
			if (existingMeasurement && row.kind === 'ekstrakurikuler-header') {
				const rect = element.getBoundingClientRect();
				existingMeasurement.height += rect.height;
				existingMeasurement.bottom = rect.bottom - containerElement.getBoundingClientRect().top;
			}
			return;
		}

		const rect = element.getBoundingClientRect();
		const containerRect = containerElement.getBoundingClientRect();

		// Position relative to container start
		const top = rect.top - containerRect.top;
		const bottom = rect.bottom - containerRect.top;
		const height = rect.height;

		measurements.push({
			row,
			element,
			top,
			bottom,
			height,
			order
		});

		seenOrders.add(order);
	});

	return measurements.sort((a, b) => a.order - b.order);
}

/**
 * Detect boundary violations and paginate accordingly
 *
 * Contoh skenario:
 * - 30 baris total
 * - Baris 1-15: 600px accumulated → muat di halaman 1 (capacity 611px)
 * - Baris 15: +50px = 650px → MELEBIHI boundary → SPLIT!
 * - Baris 15-30 pindah ke halaman 2 (reset accumulated = 0)
 * - Baris 15-19: 800px accumulated → muat di halaman 2 (capacity 881px)
 * - Baris 20: +100px = 900px → MELEBIHI boundary → SPLIT!
 * - Baris 20-30 pindah ke halaman 3 (reset accumulated = 0)
 */

// Minimum sisa ruang yang harus tersedia setelah menambahkan tail block
// Untuk mencegah tail block "mepet" di boundary lalu row berikutnya overflow
const MIN_REMAINING_SPACE = 100; // px

// Toleransi overflow untuk intrakurikuler
// Mengakomodasi perbedaan antara calculated height vs actual rendered height
// Dibuat lebih generous agar universal untuk semua murid dengan konten dinamis
const INTRAK_OVERFLOW_TOLERANCE_PAGE1 = 150; // px (halaman 1 - paling toleran)
const INTRAK_OVERFLOW_TOLERANCE_OTHER = 100; // px (halaman lain - tetap toleran)

export function detectBoundaryViolations(
	measurements: MeasuredRow[],
	hasHeader: boolean = true
): BoundaryDetectionResult {
	if (measurements.length === 0) {
		return {
			pages: [],
			totalPages: 0,
			measurements: []
		};
	}

	const pages: PaginatedPage[] = [];
	let currentPageIndex = 0;
	let currentPageRows: TableRow[] = [];
	let currentPageHeight = 0; // Accumulated height untuk halaman saat ini
	let boundary = calculatePageBoundary(currentPageIndex, hasHeader);

	const debugLogs: string[] = [];

	for (let i = 0; i < measurements.length; i++) {
		const measurement = measurements[i];
		const { row, height } = measurement;

		// Cek apakah menambah row ini akan melebihi boundary
		// Untuk tail blocks, gunakan stricter check dengan minimum remaining space
		// Untuk intrakurikuler, hanya cek height asli tanpa toleransi
		const isTailBlock = row.kind === 'tail';
		const isIntrakRow = row.kind === 'intrak' || row.kind === 'intrak-group-header';

		let wouldExceedBoundary: boolean;
		let checkDetails = '';
		if (isIntrakRow) {
			// Intrakurikuler: ijinkan slight overflow (tolerance untuk measurement inaccuracy)
			// Halaman 1 lebih toleran karena HEIGHTS offset calculation mungkin kurang akurat
			const tolerance =
				currentPageIndex === 0 ? INTRAK_OVERFLOW_TOLERANCE_PAGE1 : INTRAK_OVERFLOW_TOLERANCE_OTHER;
			const totalWithRow = currentPageHeight + height;
			const overflow = totalWithRow - boundary.availableHeight;
			wouldExceedBoundary = overflow > tolerance;
			checkDetails = `${Math.round(currentPageHeight)}+${Math.round(height)}=${Math.round(totalWithRow)} vs ${Math.round(boundary.availableHeight)} (overflow=${Math.round(overflow)}px, tol=${tolerance}px)`;
		} else if (isTailBlock) {
			// Tail blocks: tambahkan minimum remaining space
			wouldExceedBoundary =
				currentPageHeight + height + MIN_REMAINING_SPACE > boundary.availableHeight;
			checkDetails = `${Math.round(currentPageHeight)}+${Math.round(height)}+${MIN_REMAINING_SPACE}=${Math.round(currentPageHeight + height + MIN_REMAINING_SPACE)} vs ${Math.round(boundary.availableHeight)}`;
		} else {
			// Others (ekstrakurikuler): gunakan exact height
			wouldExceedBoundary = currentPageHeight + height > boundary.availableHeight;
			checkDetails = `${Math.round(currentPageHeight)}+${Math.round(height)}=${Math.round(currentPageHeight + height)} vs ${Math.round(boundary.availableHeight)}`;
		}

		// Baris pertama di halaman selalu ditambahkan (even if oversized)
		if (currentPageRows.length === 0) {
			currentPageRows.push(row);
			currentPageHeight += height;

			debugLogs.push(
				`Row ${i} (order:${row.order}, kind:${row.kind}): height=${Math.round(height)}px | ` +
					`acc=${Math.round(currentPageHeight)}px | ` +
					`[FIRST ROW on page ${currentPageIndex + 1}]`
			);
			continue;
		}

		if (wouldExceedBoundary) {
			// Special case: prevent orphaned group headers
			const lastRow = currentPageRows[currentPageRows.length - 1];
			if (lastRow.kind === 'intrak-group-header' || lastRow.kind === 'ekstrakurikuler-header') {
				// Cari tinggi header
				const headerMeasurement = measurements.find((m) => m.order === lastRow.order);

				if (headerMeasurement && currentPageRows.length > 1) {
					// Remove header dari halaman saat ini
					currentPageRows.pop();
					currentPageHeight -= headerMeasurement.height;

					// Save halaman saat ini
					pages.push({
						pageIndex: currentPageIndex,
						rows: currentPageRows,
						hasFooter: false,
						boundary
					});

					// Mulai halaman baru
					currentPageIndex++;
					boundary = calculatePageBoundary(currentPageIndex, false);

					// Halaman baru dimulai dengan: header + current row
					currentPageRows = [lastRow, row];
					currentPageHeight = headerMeasurement.height + height;

					debugLogs.push(
						`  ↳ SPLIT (orphan header): Row ${i} moved to page ${currentPageIndex + 1} with header`
					);
					continue;
				}
			}

			// Normal split: save halaman saat ini, mulai halaman baru
			pages.push({
				pageIndex: currentPageIndex,
				rows: currentPageRows,
				hasFooter: false,
				boundary
			});

			// Mulai halaman baru
			currentPageIndex++;
			boundary = calculatePageBoundary(currentPageIndex, false);
			currentPageRows = [row];
			currentPageHeight = height; // RESET accumulated height

			debugLogs.push(
				`  ↳ SPLIT: Row ${i} (order:${row.order}) moved to page ${currentPageIndex + 1} | ` +
					`check: ${checkDetails} | new acc=${Math.round(height)}px`
			);
		} else {
			// Row muat di halaman saat ini
			currentPageRows.push(row);
			currentPageHeight += height;
		}

		// Log setelah decision
		const remaining = boundary.availableHeight - currentPageHeight;
		const logParts = [
			`Row ${i} (order:${row.order}, kind:${row.kind}): height=${Math.round(height)}px`,
			`acc=${Math.round(currentPageHeight)}px`,
			`remaining=${Math.round(remaining)}px`
		];

		if (isTailBlock) {
			logParts.push(`required=${Math.round(height + MIN_REMAINING_SPACE)}px`);
		}

		// Tampilkan check calculation jika exceed
		if (wouldExceedBoundary) {
			logParts.push(`check:(${checkDetails})`);
		}

		logParts.push(`exceed=${wouldExceedBoundary}`, `page=${currentPageIndex + 1}`);
		debugLogs.push(logParts.join(' | '));
	}

	// Tambahkan halaman terakhir jika ada isi
	if (currentPageRows.length > 0) {
		pages.push({
			pageIndex: currentPageIndex,
			rows: currentPageRows,
			hasFooter: false,
			boundary
		});
	}

	// Tentukan penempatan footer
	if (pages.length > 0) {
		const lastPage = pages[pages.length - 1];

		// Hitung total tinggi halaman terakhir
		let lastPageHeight = 0;
		for (const row of lastPage.rows) {
			const measurement = measurements.find((m) => m.order === row.order);
			if (measurement) {
				lastPageHeight += measurement.height;
			}
		}

		const footerSpace = HEIGHTS.footer + HEIGHTS.footerGap;
		const remainingSpace = lastPage.boundary.availableHeight - lastPageHeight;

		if (remainingSpace >= footerSpace) {
			// Footer muat di halaman terakhir
			lastPage.hasFooter = true;
		} else {
			// Footer butuh halaman terpisah
			pages.push({
				pageIndex: pages.length,
				rows: [],
				hasFooter: true,
				boundary: calculatePageBoundary(pages.length, false)
			});
		}
	}

	// Log detection process
	console.groupCollapsed('📐 Boundary Detection Process');
	debugLogs.forEach((log) => console.log(log));
	console.groupEnd();

	return {
		pages,
		totalPages: pages.length,
		measurements
	};
}

/**
 * Debug helper to visualize boundary detection
 */
export function debugBoundaryDetection(result: BoundaryDetectionResult, muridName: string): void {
	const pageDetails = result.pages.map((page, idx) => {
		// Hitung total tinggi halaman ini dengan accumulated height
		let totalHeight = 0;
		const rowDetails: Array<{ kind: string; height: number; order: number }> = [];

		for (const row of page.rows) {
			const measurement = result.measurements.find((m) => m.order === row.order);
			if (measurement) {
				totalHeight += measurement.height;
				rowDetails.push({
					kind: row.kind,
					height: Math.round(measurement.height),
					order: row.order
				});
			}
		}

		const used = Math.round(totalHeight);
		const capacity = Math.round(page.boundary.availableHeight);
		const remaining = capacity - used;
		const utilization = capacity > 0 ? Math.round((used / capacity) * 100) : 0;

		// Toleransi overflow: page 1 = 150px, page lain = 100px
		const tolerance = page.pageIndex === 0 ? -150 : -100;
		const isWithinTolerance = remaining >= tolerance;

		return {
			page: page.pageIndex + 1,
			rows: page.rows.length,
			footer: page.hasFooter,
			used,
			capacity,
			remaining,
			utilization: `${utilization}%`,
			status: remaining >= 0 ? '✅' : isWithinTolerance ? '⚠️ TIGHT' : '❌ OVERFLOW',
			rowDetails: idx === 0 || idx === 1 ? rowDetails : undefined // Show details for first 2 pages
		};
	});

	console.log(`[Boundary Detection] ${muridName}:`, {
		pages: result.totalPages,
		measurements: result.measurements.length,
		details: pageDetails
	});

	// Show all measurements for debugging
	console.log(
		`[Measurements] First 10 rows:`,
		result.measurements.slice(0, 10).map((m) => ({
			order: m.order,
			kind: m.row.kind,
			height: Math.round(m.height)
		}))
	);

	// Warn only if page overflows beyond tolerance
	const overflowPages = pageDetails.filter((p) => p.status === '❌ OVERFLOW');
	if (overflowPages.length > 0) {
		console.warn(`❌ ${muridName}: ${overflowPages.length} pages OVERFLOW!`, overflowPages);
	}

	// Info for tight pages (within tolerance)
	const tightPages = pageDetails.filter((p) => p.status === '⚠️ TIGHT');
	if (tightPages.length > 0) {
		console.info(
			`⚠️ ${muridName}: ${tightPages.length} pages TIGHT (within tolerance)`,
			tightPages
		);
	}
}

/**
 * Wait for elements to be rendered in DOM
 */
export async function waitForRender(delayMs: number = 50): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, delayMs));
}
