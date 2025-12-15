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

// Minimum sisa ruang yang harus tersedia setelah menambahkan tail/tanggapan blocks
// Untuk mencegah block "mepet" di boundary lalu row berikutnya overflow
const MIN_REMAINING_SPACE_TAIL = 50; // px (ketidakhadiran - lebih lenient)
const MIN_REMAINING_SPACE_TANGGAPAN = 100; // px (tanggapan - ketat)

// Tolerance overflow untuk intrakurikuler
// Mengakomodasi perbedaan antara calculated HEIGHTS vs actual rendered height
// Allow slight overflow untuk maximal space utilization
const INTRAK_OVERFLOW_TOLERANCE = 80; // px (generous untuk HEIGHTS offset error)

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
		// Semua blocks sekarang menggunakan MIN_REMAINING_SPACE untuk konsistensi
		// Tolerance hanya digunakan untuk mencegah split terlalu dini pada kasus edge
		const isTailBlock = row.kind === 'tail';
		const isTanggapanBlock = row.kind === 'tanggapan';
		const isIntrakRow = row.kind === 'intrak' || row.kind === 'intrak-group-header';

		let wouldExceedBoundary: boolean;
		let checkDetails = '';

		if (isIntrakRow) {
			// Intrakurikuler: allow slight overflow untuk maximal space utilization
			// Tolerance mengakomodasi perbedaan calculated HEIGHTS vs actual rendered
			const totalWithRow = currentPageHeight + height;
			const overflow = totalWithRow - boundary.availableHeight;
			// Split hanya jika overflow melebihi tolerance
			wouldExceedBoundary = overflow > INTRAK_OVERFLOW_TOLERANCE;
			checkDetails = `${Math.round(currentPageHeight)}+${Math.round(height)}=${Math.round(totalWithRow)} vs ${Math.round(boundary.availableHeight)} (overflow=${Math.round(overflow)}px, tol=${INTRAK_OVERFLOW_TOLERANCE}px)`;
		} else if (isTailBlock) {
			// Tail blocks (ketidakhadiran): tambahkan minimum remaining space
			const totalWithRow = currentPageHeight + height + MIN_REMAINING_SPACE_TAIL;
			wouldExceedBoundary = totalWithRow > boundary.availableHeight;
			checkDetails = `${Math.round(currentPageHeight)}+${Math.round(height)}+${MIN_REMAINING_SPACE_TAIL}=${Math.round(totalWithRow)} vs ${Math.round(boundary.availableHeight)}`;
		} else if (isTanggapanBlock) {
			// Tanggapan block: tambahkan minimum remaining space (paling strict)
			const totalWithRow = currentPageHeight + height + MIN_REMAINING_SPACE_TANGGAPAN;
			wouldExceedBoundary = totalWithRow > boundary.availableHeight;
			checkDetails = `${Math.round(currentPageHeight)}+${Math.round(height)}+${MIN_REMAINING_SPACE_TANGGAPAN}=${Math.round(totalWithRow)} vs ${Math.round(boundary.availableHeight)}`;
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
			// Special case 1: prevent orphaned group headers
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

			// Special case 2: jika current row adalah bagian dari group, cari headernya
			if (row.kind === 'intrak' && 'groupId' in row && row.groupId) {
				// Cek apakah ada header untuk group ini di halaman saat ini
				const groupHeader = currentPageRows.find(
					(r) => r.kind === 'intrak-group-header' && 'groupId' in r && r.groupId === row.groupId
				);

				if (groupHeader) {
					// Header ada di halaman ini, tapi row tidak muat
					// Collect semua rows dari group ini + header untuk dipindah ke halaman baru
					const groupRows = currentPageRows.filter(
						(r) =>
							(r.kind === 'intrak-group-header' && 'groupId' in r && r.groupId === row.groupId) ||
							(r.kind === 'intrak' && 'groupId' in r && r.groupId === row.groupId)
					);

					// Jika group sudah punya rows, pindahkan semua ke halaman baru
					if (groupRows.length > 1) {
						// Remove group rows dari halaman saat ini
						const remainingRows = currentPageRows.filter((r) => !groupRows.includes(r));

						// Hitung height untuk group rows
						let groupHeight = 0;
						for (const r of groupRows) {
							const m = measurements.find((meas) => meas.order === r.order);
							if (m) groupHeight += m.height;
						}

						// Save halaman saat ini (tanpa group)
						if (remainingRows.length > 0) {
							pages.push({
								pageIndex: currentPageIndex,
								rows: remainingRows,
								hasFooter: false,
								boundary
							});
						}

						// Mulai halaman baru dengan group rows + current row
						currentPageIndex++;
						boundary = calculatePageBoundary(currentPageIndex, false);
						currentPageRows = [...groupRows, row];
						currentPageHeight = groupHeight + height;

						debugLogs.push(
							`  ↳ SPLIT (keep group together): ${groupRows.length} group rows + row ${i} moved to page ${currentPageIndex + 1}`
						);
						continue;
					}
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
			logParts.push(`required=${Math.round(height + MIN_REMAINING_SPACE_TAIL)}px`);
		} else if (isTanggapanBlock) {
			logParts.push(`required=${Math.round(height + MIN_REMAINING_SPACE_TANGGAPAN)}px`);
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

	// Post-process: Tambahkan header di halaman yang dimulai dengan baris
	// tapi tidak memiliki header (karena terkena split)
	for (let pageIdx = 1; pageIdx < pages.length; pageIdx++) {
		const page = pages[pageIdx];
		if (page.rows.length > 0) {
			// 1. Cek ekstrakurikuler header
			const hasEkstrakRow = page.rows.some(
				(r) => r.kind === 'ekstrakurikuler' || r.kind === 'ekstrakurikuler-empty'
			);
			const hasEkstrakHeader = page.rows.some((r) => r.kind === 'ekstrakurikuler-header');

			if (hasEkstrakRow && !hasEkstrakHeader) {
				const firstEkstrakRow = page.rows.find(
					(r) => r.kind === 'ekstrakurikuler' || r.kind === 'ekstrakurikuler-empty'
				);

				if (firstEkstrakRow) {
					const headerRow: TableRow = {
						kind: 'ekstrakurikuler-header',
						order: firstEkstrakRow.order - 0.5
					};
					page.rows.unshift(headerRow);

					debugLogs.push(
						`[POST-PROCESS] Added ekstrakurikuler header to page ${pageIdx + 1} (before order ${firstEkstrakRow.order})`
					);
				}
			}

			// Note: IntrakGroupHeaderRow post-process tidak dilakukan karena TableRow types
			// tidak memiliki groupId property untuk tracking. Group detection perlu dilakukan
			// di level yang lebih tinggi (saat createTableRows) dengan informasi groupLetter/groupLabel.
			// Orphan header prevention di main loop sudah handle case utama.
		}
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

		// Check apakah remaining space masih cukup atau terlalu tight
		// Allow overflow hingga tolerance untuk maximal utilization
		const isWithinTolerance = remaining < 0 && Math.abs(remaining) <= 80; // Match INTRAK_OVERFLOW_TOLERANCE

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
