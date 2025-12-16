/**
 * Boundary Detection System for Keasramaan Pagination - NEW SPLIT LOGIC
 *
 * Sistem split baru menggunakan:
 * - paperA4: container kertas (seperti halaman di MS Word)
 * - splitTrigger: elemen yang dihitung (baris tabel dengan id "splitTrigger-{order}")
 * - sensorTrigger: garis merah - batas yang tidak boleh dilewati
 * - paperEnd: garis kuning - akhir kertas
 *
 * Logika:
 * 1. Hitung semua splitTrigger dalam satu murid
 * 2. Urutkan splitTrigger dari atas ke bawah di paperA4 pertama
 * 3. Jika ada splitTrigger yang melewati sensorTrigger, split ke paperA4 baru
 * 4. Ulangi proses untuk paperA4 selanjutnya
 */

// Reserved heights for fixed elements (dipertahankan untuk kompatibilitas)
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
	sensorTriggerY: number; // Posisi garis merah (sensorTrigger)
	paperEndY: number; // Posisi garis kuning (paperEnd)
}

export interface MeasuredRow {
	row: KeasramaanRowWithOrder;
	element: HTMLElement;
	top: number; // Posisi atas relative ke container
	bottom: number; // Posisi bawah relative ke container
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
 * Calculate page boundaries - NEW LOGIC
 * Tidak perlu kompleks, cukup track posisi sensorTrigger dan paperEnd
 */
export function calculatePageBoundary(pageIndex: number): PageBoundary {
	return {
		pageIndex,
		sensorTriggerY: 0, // Akan diukur dari DOM
		paperEndY: 0 // Akan diukur dari DOM
	};
}

/**
 * Measure all row elements (splitTriggers) and their positions - NEW LOGIC
 */
export function measureRows(
	containerElement: HTMLElement,
	rows: KeasramaanRowWithOrder[]
): MeasuredRow[] {
	const measurements: MeasuredRow[] = [];

	// Cari semua elemen dengan id yang mengandung "splitTrigger"
	const splitTriggerElements =
		containerElement.querySelectorAll<HTMLElement>('[id^="splitTrigger-"]');
	const seenOrders = new Set<number>();

	splitTriggerElements.forEach((element) => {
		// Extract order from id="splitTrigger-{order}"
		const idAttr = element.getAttribute('id');
		if (!idAttr) return;

		const match = idAttr.match(/^splitTrigger-(\d+)$/);
		if (!match) return;

		const order = parseInt(match[1], 10);
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

	// Sort by order (top to bottom)
	return measurements.sort((a, b) => a.order - b.order);
}

/**
 * Measure position of sensorTrigger element - NEW HELPER
 */
export function measureSensorTrigger(containerElement: HTMLElement): number {
	const sensorElement = containerElement.querySelector<HTMLElement>('#sensorTrigger');
	if (!sensorElement) {
		console.warn('⚠️ sensorTrigger element not found, using default position');
		return 900; // Default fallback
	}

	const rect = sensorElement.getBoundingClientRect();
	const containerRect = containerElement.getBoundingClientRect();
	const sensorY = rect.top - containerRect.top;

	console.log(`🔴 sensorTrigger measured at: ${Math.round(sensorY)}px from container top`);
	return sensorY;
}

/**
 * NEW SPLIT LOGIC - Detect boundary violations and paginate accordingly
 *
 * Logika:
 * 1. Ukur semua splitTrigger (baris tabel) dan posisi sensorTrigger
 * 2. Urutkan splitTrigger dari atas ke bawah
 * 3. Isi paperA4 pertama dari atas sampai ada splitTrigger yang melewati sensorTrigger
 * 4. Jika ada yang melewati, split ke paperA4 baru
 * 5. Ulangi untuk paperA4 berikutnya
 */
export function detectBoundaryViolations(
	measurements: MeasuredRow[],
	hasHeader: boolean = true,
	sensorTriggerY?: number
): BoundaryDetectionResult {
	if (measurements.length === 0) {
		return {
			pages: [],
			totalPages: 0,
			measurements: []
		};
	}

	console.log('🔵 [NEW SPLIT LOGIC] Starting boundary detection');
	console.log(`📊 Total splitTriggers to process: ${measurements.length}`);

	// Gunakan sensorTriggerY yang diukur atau fallback ke estimasi
	const SENSOR_TRIGGER_POSITION = sensorTriggerY ?? (hasHeader ? 900 : 950); // px dari atas container
	console.log(`🔴 Using sensorTrigger position: ${Math.round(SENSOR_TRIGGER_POSITION)}px`);

	const pages: PaginatedPage[] = [];
	let currentPageIndex = 0;
	let currentPageRows: KeasramaanRowWithOrder[] = [];
	const debugLogs: string[] = [];

	// Sort measurements by order (top to bottom)
	const sortedMeasurements = [...measurements].sort((a, b) => a.order - b.order);

	// Process each splitTrigger
	for (let i = 0; i < sortedMeasurements.length; i++) {
		const measurement = sortedMeasurements[i];
		const { row, bottom } = measurement;

		debugLogs.push(
			`Processing splitTrigger ${i + 1}/${measurements.length}: order=${row.order}, ` +
				`kategori=${row.kategoriHeader ?? 'indicator'}, bottom=${Math.round(bottom)}px`
		);

		// Cek apakah bottom dari splitTrigger ini melewati sensorTrigger
		const crossesSensor = bottom > SENSOR_TRIGGER_POSITION;

		if (crossesSensor && currentPageRows.length > 0) {
			// Split! Simpan halaman saat ini dan mulai halaman baru
			const boundary = calculatePageBoundary(currentPageIndex);
			boundary.sensorTriggerY = SENSOR_TRIGGER_POSITION;
			boundary.paperEndY = SENSOR_TRIGGER_POSITION + 50; // Estimasi

			pages.push({
				pageIndex: currentPageIndex,
				rows: currentPageRows,
				hasKehadiran: false,
				hasSignature: false,
				boundary
			});

			debugLogs.push(
				`  🔴 SPLIT! splitTrigger #${i + 1} crosses sensorTrigger (${Math.round(bottom)}px > ${Math.round(SENSOR_TRIGGER_POSITION)}px)`
			);
			debugLogs.push(`  📄 Page ${currentPageIndex + 1} saved with ${currentPageRows.length} rows`);
			debugLogs.push(`  📄 Starting new page ${currentPageIndex + 2}`);

			// Mulai halaman baru
			currentPageIndex++;
			currentPageRows = [row];
		} else {
			// Masih muat di halaman saat ini
			currentPageRows.push(row);

			if (crossesSensor && currentPageRows.length === 1) {
				debugLogs.push(`  ⚠️ First row on page ${currentPageIndex + 1} crosses sensor (allowed)`);
			} else {
				debugLogs.push(`  ✅ Fits on page ${currentPageIndex + 1}`);
			}
		}
	}

	// Tambahkan halaman terakhir jika ada isi
	if (currentPageRows.length > 0) {
		const boundary = calculatePageBoundary(currentPageIndex);
		boundary.sensorTriggerY = SENSOR_TRIGGER_POSITION;
		boundary.paperEndY = SENSOR_TRIGGER_POSITION + 50;

		pages.push({
			pageIndex: currentPageIndex,
			rows: currentPageRows,
			hasKehadiran: false,
			hasSignature: false,
			boundary
		});
		debugLogs.push(
			`  📄 Final page ${currentPageIndex + 1} saved with ${currentPageRows.length} rows`
		);
	}

	// Tentukan penempatan ketidakhadiran dan tandatangan
	const MIN_SPACE_FOR_KEHADIRAN = 150; // px
	const MIN_SPACE_FOR_SIGNATURE = 200; // px

	if (pages.length > 0) {
		const lastPage = pages[pages.length - 1];
		const lastRow = lastPage.rows[lastPage.rows.length - 1];
		const lastMeasurement = measurements.find((m) => m.order === lastRow?.order);
		const lastBottom = lastMeasurement?.bottom ?? 0;
		const remainingSpace = SENSOR_TRIGGER_POSITION - lastBottom;

		debugLogs.push(`\n🎯 Footer placement: remaining space = ${Math.round(remainingSpace)}px`);

		if (remainingSpace >= MIN_SPACE_FOR_KEHADIRAN + MIN_SPACE_FOR_SIGNATURE) {
			// Kehadiran dan signature muat di halaman terakhir
			lastPage.hasKehadiran = true;
			lastPage.hasSignature = true;
			debugLogs.push(`  ✅ Kehadiran + Signature on page ${lastPage.pageIndex + 1}`);
		} else if (remainingSpace >= MIN_SPACE_FOR_KEHADIRAN) {
			// Hanya kehadiran yang muat
			lastPage.hasKehadiran = true;

			// Signature perlu halaman baru
			const boundary = calculatePageBoundary(pages.length);
			pages.push({
				pageIndex: pages.length,
				rows: [],
				hasKehadiran: false,
				hasSignature: true,
				boundary
			});
			debugLogs.push(`  ✅ Kehadiran on page ${lastPage.pageIndex + 1}`);
			debugLogs.push(`  📄 Signature on new page ${pages.length}`);
		} else {
			// Kehadiran dan signature perlu halaman baru
			const boundary = calculatePageBoundary(pages.length);
			pages.push({
				pageIndex: pages.length,
				rows: [],
				hasKehadiran: true,
				hasSignature: true,
				boundary
			});
			debugLogs.push(`  📄 Kehadiran + Signature on new page ${pages.length}`);
		}
	}

	// Log detection process
	console.groupCollapsed('📐 NEW Keasramaan Boundary Detection Process');
	debugLogs.forEach((log) => console.log(log));
	console.log(`\n✅ Total pages: ${pages.length}`);
	console.groupEnd();

	return {
		pages,
		totalPages: pages.length,
		measurements
	};
}

/**
 * Debug helper to visualize boundary detection - NEW LOGIC
 */
export function debugBoundaryDetection(result: BoundaryDetectionResult, muridName: string): void {
	const pageDetails = result.pages.map((page) => {
		const rowDetails = page.rows.map((row) => {
			const measurement = result.measurements.find((m) => m.order === row.order);
			return {
				order: row.order,
				kategori: row.kategoriHeader ?? 'indicator',
				height: measurement ? Math.round(measurement.height) : 0,
				bottom: measurement ? Math.round(measurement.bottom) : 0
			};
		});

		return {
			page: page.pageIndex + 1,
			rows: page.rows.length,
			kehadiran: page.hasKehadiran ? '✅' : '❌',
			signature: page.hasSignature ? '✅' : '❌',
			sensorY: Math.round(page.boundary.sensorTriggerY),
			rowDetails: rowDetails.slice(0, 3) // Show first 3 rows per page
		};
	});

	console.log(`🎯 [NEW SPLIT] ${muridName}:`, {
		totalPages: result.totalPages,
		totalSplitTriggers: result.measurements.length,
		pages: pageDetails
	});

	// Show sample measurements
	if (result.measurements.length > 0) {
		console.log(
			`📊 Sample splitTriggers (first 5):`,
			result.measurements.slice(0, 5).map((m) => ({
				order: m.order,
				kategori: m.row.kategoriHeader ?? 'indicator',
				bottom: Math.round(m.bottom)
			}))
		);
	}
}

/**
 * Wait for elements to be rendered in DOM
 */
export async function waitForRender(delayMs: number = 50): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, delayMs));
}
