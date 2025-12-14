/**
 * Boundary Detection System for Keasramaan Pagination
 *
 * Menggunakan DOM measurement untuk mendeteksi boundary violations
 * dan melakukan split otomatis berdasarkan posisi aktual elemen.
 * Sistem ini mengadaptasi rapor-boundary-detection.ts untuk keasramaan.
 */

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
	kehadiran: 130, // Tabel ketidakhadiran
	kehadiranGap: 20, // mt-6
	signature: 180, // Blok tandatangan (4 pihak dalam grid 2x2)
	signatureGap: 30 // mt-8
};

export type KeasramaanRow = {
	no: number;
	indikator: string;
	predikat: 'perlu-bimbingan' | 'cukup' | 'baik' | 'sangat-baik';
	deskripsi: string;
	kategoriHeader?: string;
	order?: number;
};

export type KeasramaanRowWithOrder = KeasramaanRow & { order: number };

export interface PageBoundary {
	pageIndex: number;
	availableHeight: number;
	startY: number;
	endY: number;
	triggerY: number;
}

export interface MeasuredRow {
	row: KeasramaanRowWithOrder;
	element: HTMLElement;
	top: number;
	bottom: number;
	height: number;
	order: number;
}

export interface PaginatedPage {
	pageIndex: number;
	rows: KeasramaanRowWithOrder[];
	hasKehadiran: boolean;
	hasSignature: boolean;
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
export function measureRows(
	containerElement: HTMLElement,
	rows: KeasramaanRowWithOrder[]
): MeasuredRow[] {
	const measurements: MeasuredRow[] = [];
	const rowElements = containerElement.querySelectorAll<HTMLElement>('[data-row-order]');
	const seenOrders = new Set<number>();

	rowElements.forEach((element) => {
		const orderAttr = element.getAttribute('data-row-order');
		if (!orderAttr) return;

		// Skip non-numeric order
		if (!/^\d+$/.test(orderAttr)) return;

		const order = parseInt(orderAttr, 10);
		const row = rows.find((r) => r.order === order);
		if (!row) return;

		// Skip duplicate orders
		if (seenOrders.has(order)) {
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

// Toleransi overflow untuk keasramaan (fleksibel untuk konten dinamis)
const OVERFLOW_TOLERANCE_PAGE1 = 130; // px (halaman 1 - fleksibel untuk text wrapping dinamis)
const OVERFLOW_TOLERANCE_OTHER = 80; // px (halaman lain - moderat)

// Minimum sisa ruang untuk footer (buffer kecil saja)
const MIN_REMAINING_SPACE_FOOTER = 30; // px

/**
 * Detect boundary violations and paginate accordingly
 */
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
	let currentPageRows: KeasramaanRowWithOrder[] = [];
	let currentPageHeight = 0;
	let boundary = calculatePageBoundary(currentPageIndex, hasHeader);

	const kehadiranHeight = HEIGHTS.kehadiran + HEIGHTS.kehadiranGap + MIN_REMAINING_SPACE_FOOTER;
	const signatureHeight = HEIGHTS.signature + HEIGHTS.signatureGap + MIN_REMAINING_SPACE_FOOTER;
	const debugLogs: string[] = [];

	for (let i = 0; i < measurements.length; i++) {
		const measurement = measurements[i];
		const { row, height } = measurement;

		// Cek apakah menambah row ini akan melebihi boundary
		const tolerance = currentPageIndex === 0 ? OVERFLOW_TOLERANCE_PAGE1 : OVERFLOW_TOLERANCE_OTHER;
		const totalWithRow = currentPageHeight + height;
		const overflow = totalWithRow - boundary.availableHeight;
		const wouldExceedBoundary = overflow > tolerance;

		const checkDetails = `${Math.round(currentPageHeight)}+${Math.round(height)}=${Math.round(totalWithRow)} vs ${Math.round(boundary.availableHeight)} (overflow=${Math.round(overflow)}px, tol=${tolerance}px)`;

		// Baris pertama di halaman selalu ditambahkan (even if oversized)
		if (currentPageRows.length === 0) {
			currentPageRows.push(row);
			currentPageHeight += height;

			debugLogs.push(
				`Row ${i} (order:${row.order}, kategori:${row.kategoriHeader ?? 'indicator'}): height=${Math.round(height)}px | ` +
					`acc=${Math.round(currentPageHeight)}px | ` +
					`[FIRST ROW on page ${currentPageIndex + 1}]`
			);
			continue;
		}

		if (wouldExceedBoundary) {
			// Special case: prevent orphaned category headers
			const lastRow = currentPageRows[currentPageRows.length - 1];
			if (lastRow.kategoriHeader && currentPageRows.length > 1) {
				// Cari tinggi header
				const headerMeasurement = measurements.find((m) => m.order === lastRow.order);

				if (headerMeasurement) {
					// Remove header dari halaman saat ini
					currentPageRows.pop();
					currentPageHeight -= headerMeasurement.height;

					// Save halaman saat ini
					pages.push({
						pageIndex: currentPageIndex,
						rows: currentPageRows,
						hasKehadiran: false,
						hasSignature: false,
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
				hasKehadiran: false,
				hasSignature: false,
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
			`Row ${i} (order:${row.order}, kategori:${row.kategoriHeader ?? 'indicator'}): height=${Math.round(height)}px`,
			`acc=${Math.round(currentPageHeight)}px`,
			`remaining=${Math.round(remaining)}px`,
			`exceed=${wouldExceedBoundary}`,
			`page=${currentPageIndex + 1}`
		];

		debugLogs.push(logParts.join(' | '));
	}

	// Tambahkan halaman terakhir jika ada isi
	if (currentPageRows.length > 0) {
		pages.push({
			pageIndex: currentPageIndex,
			rows: currentPageRows,
			hasKehadiran: false,
			hasSignature: false,
			boundary
		});
	}

	// Tentukan penempatan ketidakhadiran dan tandatangan secara terpisah
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

		let remainingSpace = lastPage.boundary.availableHeight - lastPageHeight;

		// Cek apakah ketidakhadiran muat di halaman terakhir
		if (remainingSpace >= kehadiranHeight) {
			lastPage.hasKehadiran = true;
			remainingSpace -= HEIGHTS.kehadiran + HEIGHTS.kehadiranGap;

			// Cek apakah tandatangan juga muat di halaman yang sama
			if (remainingSpace >= signatureHeight) {
				lastPage.hasSignature = true;
			} else {
				// Tandatangan perlu halaman baru
				pages.push({
					pageIndex: pages.length,
					rows: [],
					hasKehadiran: false,
					hasSignature: true,
					boundary: calculatePageBoundary(pages.length, false)
				});
			}
		} else {
			// Ketidakhadiran dan tandatangan perlu halaman baru
			pages.push({
				pageIndex: pages.length,
				rows: [],
				hasKehadiran: true,
				hasSignature: false,
				boundary: calculatePageBoundary(pages.length, false)
			});

			// Cek apakah tandatangan muat di halaman yang sama dengan ketidakhadiran
			const kehadiranPageRemainingSpace =
				calculatePageBoundary(pages.length - 1, false).availableHeight -
				HEIGHTS.kehadiran -
				HEIGHTS.kehadiranGap;

			if (kehadiranPageRemainingSpace >= signatureHeight) {
				pages[pages.length - 1].hasSignature = true;
			} else {
				// Tandatangan perlu halaman terpisah
				pages.push({
					pageIndex: pages.length,
					rows: [],
					hasKehadiran: false,
					hasSignature: true,
					boundary: calculatePageBoundary(pages.length, false)
				});
			}
		}
	}

	// Log detection process
	console.groupCollapsed('📐 Keasramaan Boundary Detection Process');
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
		const rowDetails: Array<{ kategori: string; height: number; order: number }> = [];

		for (const row of page.rows) {
			const measurement = result.measurements.find((m) => m.order === row.order);
			if (measurement) {
				totalHeight += measurement.height;
				rowDetails.push({
					kategori: row.kategoriHeader ?? 'indicator',
					height: Math.round(measurement.height),
					order: row.order
				});
			}
		}

		const used = Math.round(totalHeight);
		const capacity = Math.round(page.boundary.availableHeight);
		const remaining = capacity - used;
		const utilization = capacity > 0 ? Math.round((used / capacity) * 100) : 0;

		// Toleransi overflow: page 1 = 130px, page lain = 80px (fleksibel)
		const tolerance = page.pageIndex === 0 ? -130 : -80;
		const isWithinTolerance = remaining >= tolerance;

		return {
			page: page.pageIndex + 1,
			rows: page.rows.length,
			kehadiran: page.hasKehadiran,
			signature: page.hasSignature,
			used,
			capacity,
			remaining,
			utilization: `${utilization}%`,
			status: remaining >= 0 ? '✅' : isWithinTolerance ? '⚠️ TIGHT' : '❌ OVERFLOW',
			rowDetails: idx === 0 || idx === 1 ? rowDetails : undefined // Show details for first 2 pages
		};
	});

	console.log(`[Keasramaan Boundary Detection] ${muridName}:`, {
		pages: result.totalPages,
		measurements: result.measurements.length,
		details: pageDetails
	});

	// Show all measurements for debugging
	console.log(
		`[Measurements] First 10 rows:`,
		result.measurements.slice(0, 10).map((m) => ({
			order: m.order,
			kategori: m.row.kategoriHeader ?? 'indicator',
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
