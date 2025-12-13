<script lang="ts">
	import { onMount, tick } from 'svelte';
	import PrintCardPage from '$lib/components/cetak/rapor/PrintCardPage.svelte';
	import RaporIdentityTable from '$lib/components/cetak/rapor/RaporIdentityTable.svelte';
	import RaporIntrakTable from '$lib/components/cetak/rapor/RaporIntrakTable.svelte';
	import { tailBlockOrder } from '$lib/components/cetak/rapor/tail-blocks';
	import {
		createIntrakRows,
		createTableRows,
		type TableRow
	} from '$lib/components/cetak/rapor/table-rows';
	import { paginateRowsByHeight } from '$lib/utils/table-pagination';

	// Global queue manager to prevent too many concurrent measurements in bulk mode
	// This helps avoid overwhelming the browser's layout engine
	class MeasurementQueue {
		private queue: Array<() => Promise<void>> = [];
		private activeCount = 0;
		private maxConcurrent = 3; // Maximum concurrent measurements

		async enqueue(fn: () => Promise<void>): Promise<void> {
			return new Promise((resolve) => {
				this.queue.push(async () => {
					await fn();
					resolve();
				});
				this.process();
			});
		}

		private async process() {
			if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
				return;
			}

			const fn = this.queue.shift();
			if (!fn) return;

			this.activeCount++;
			try {
				await fn();
			} finally {
				this.activeCount--;
				this.process();
			}
		}
	}

	const measurementQueue = new MeasurementQueue();

	type RaporData = NonNullable<App.PageData['raporData']>;
	type ComponentData = {
		raporData?: RaporData | null;
		meta?: { title?: string | null } | null;
	};

	let {
		data = {},
		onPrintableReady = () => {},
		showBgLogo = false,
		muridProp = null
	} = $props<{
		data?: ComponentData;
		onPrintableReady?: (node: HTMLDivElement | null) => void;
		showBgLogo?: boolean;
		muridProp?: { id?: number | null } | null;
	}>();

	// Generate unique instance ID for debugging and isolation
	const instanceId = Math.random().toString(36).substring(2, 9);
	let printable: HTMLDivElement | null = null;

	const rapor = $derived.by(() => data?.raporData ?? null);
	const sekolah = $derived.by(() => rapor?.sekolah ?? null);
	const derivedMurid = $derived.by(() => rapor?.murid ?? null);
	const murid = $derived.by(() => {
		// prefer externally provided murid id (from bulk list) when available
		if (muridProp) return { ...derivedMurid, id: muridProp.id };
		return derivedMurid;
	});
	const rombel = $derived.by(() => rapor?.rombel ?? null);
	const periode = $derived.by(() => rapor?.periode ?? null);
	const waliKelas = $derived.by(() => rapor?.waliKelas ?? null);
	const kepalaSekolah = $derived.by(() => rapor?.kepalaSekolah ?? null);
	const ttd = $derived.by(() => rapor?.ttd ?? null);
	const hasKokurikuler = $derived.by(() => Boolean(rapor?.hasKokurikuler));
	const jenjangVariant = $derived.by(() => sekolah?.jenjangVariant ?? null);

	const kepalaSekolahTitle = $derived.by(() => {
		const status = kepalaSekolah?.statusKepalaSekolah;
		return status === 'plt' ? 'Plt. Kepala Sekolah' : 'Kepala Sekolah';
	});

	const logoUrl = $derived.by(() => sekolah?.logoUrl ?? '/tutwuri.png');
	const backgroundStyle = $derived.by(() => {
		if (!showBgLogo) return '';
		// Escape single quotes in URL for CSS
		const escapedUrl = logoUrl.replace(/'/g, "\\'");
		return `background-image: url('${escapedUrl}'); background-position: center center; background-repeat: no-repeat; background-size: 45%; background-attachment: local; position: relative;`;
	});

	let firstCardContent = $state<HTMLDivElement | null>(null);
	let firstTableSection = $state<HTMLElement | null>(null);
	let continuationPrototypeContent = $state<HTMLDivElement | null>(null);
	let continuationPrototypeTableSection = $state<HTMLElement | null>(null);
	let lastPagePrototypeContent = $state<HTMLDivElement | null>(null);
	let lastPagePrototypeTableSection = $state<HTMLElement | null>(null);

	const intrakurikulerRows = $derived.by(() => {
		const items = rapor?.nilaiIntrakurikuler ?? [];
		return createIntrakRows(items);
	});

	const activeTailBlocks = $derived.by(() => {
		if (hasKokurikuler) return tailBlockOrder;
		return tailBlockOrder.filter((key) => key !== 'kokurikuler');
	});

	const tableRows = $derived.by<TableRow[]>(() => {
		return createTableRows(intrakurikulerRows, activeTailBlocks, jenjangVariant);
	});

	// Support multiple <tr> elements for a single logical row (rowspan-style groups).
	// CRITICAL FIX: Make this instance-scoped (not module-scoped) to avoid collision in bulk mode
	let tableRowElements = $state<Map<number, Set<HTMLTableRowElement>>>(new Map());

	function tableRow(node: HTMLTableRowElement, order: number) {
		let set = tableRowElements.get(order);
		if (!set) {
			set = new Set();
			tableRowElements.set(order, set);
		}
		set.add(node);

		let currentOrder = order;
		return {
			update(newOrder: number) {
				if (newOrder === currentOrder) return;
				tableRowElements.get(currentOrder)?.delete(node);
				currentOrder = newOrder;
				let newSet = tableRowElements.get(currentOrder);
				if (!newSet) {
					newSet = new Set();
					tableRowElements.set(currentOrder, newSet);
				}
				newSet.add(node);
			},
			destroy() {
				tableRowElements.get(currentOrder)?.delete(node);
			}
		};
	}

	type TablePage = {
		rows: TableRow[];
	};

	let tablePages = $state<TablePage[]>([]);
	let footerHeight = $state<number>(0);
	let footerFitsOnLastPage = $state<boolean>(false);
	let lastMuridId = $state<number | null>(null);

	const firstPageRows = $derived.by(() => {
		if (tablePages.length > 0) return tablePages[0]?.rows ?? [];
		return tableRows;
	});
	const intermediatePageRows = $derived.by(() => {
		if (tablePages.length <= 1) return [] as TablePage['rows'][];
		const start = 1;
		const end = Math.max(1, tablePages.length - 1);
		return tablePages.slice(start, end).map((page) => page.rows);
	});
	const finalPageRows = $derived.by(() => {
		if (tablePages.length > 1) {
			return tablePages.at(-1)?.rows ?? [];
		}
		return [] as TablePage['rows'];
	});

	// Determine if footer should be on separate page
	// If footer fits in remaining space on last page, put it there
	// Otherwise, put it on a new page
	const shouldRenderFooterOnSeparatePage = $derived.by(() => {
		return !footerFitsOnLastPage;
	});

	let splitQueued = false;
	let splitAnimationFrameId: number | null = null;
	let splitRetryCount = 0;
	const MAX_SPLIT_RETRIES = 8;
	let lastSplitTimestamp = 0;
	const SPLIT_DEBOUNCE_MS = 50; // Debounce split calls to reduce calculation spam

	function computeTableCapacity(content: HTMLElement, tableSection: HTMLElement) {
		const contentRect = content.getBoundingClientRect();
		const tableRect = tableSection.getBoundingClientRect();
		const headerHeight = tableSection.querySelector('thead')?.getBoundingClientRect().height ?? 0;
		// Apply a small safety margin to avoid off-by-a-few-pixels causing overflow
		const safetyMargin = 8; // pixels
		return Math.max(0, contentRect.bottom - tableRect.top - headerHeight - safetyMargin);
	}

	async function splitTableRows() {
		splitQueued = false;
		if (splitAnimationFrameId !== null) {
			cancelAnimationFrame(splitAnimationFrameId);
			splitAnimationFrameId = null;
		}

		// Use measurement queue to throttle concurrent DOM measurements in bulk mode
		await measurementQueue.enqueue(async () => {
			await performSplit();
		});
	}

	async function performSplit() {
		await tick();

		// If some refs are not yet bound via Svelte, attempt to locate them in DOM
		// IMPROVEMENT: Scope DOM queries to this specific instance using instanceId or printable container
		if (printable) {
			try {
				if (!firstCardContent) {
					// Query within this instance's printable container to avoid cross-instance pollution
					const firstCard = printable.querySelector('.card');
					const found = firstCard?.querySelector('[data-content-ref]') as HTMLDivElement | null;
					if (found) {
						firstCardContent = found;
					}
				}
				if (!firstTableSection && firstCardContent) {
					const foundSection = firstCardContent.querySelector('section') as HTMLElement | null;
					if (foundSection) firstTableSection = foundSection;
				}
			} catch (e) {
				// ignore DOM query errors
			}
		}

		if (
			!firstCardContent ||
			!firstTableSection ||
			!continuationPrototypeContent ||
			!continuationPrototypeTableSection ||
			!lastPagePrototypeContent ||
			!lastPagePrototypeTableSection
		) {
			// Log which refs are missing to help debugging in bulk mode
			console.debug(`RaporPreview[${instanceId}] missing refs`, {
				muridId: murid?.id ?? null,
				muridName: murid?.nama ?? null,
				retryCount: splitRetryCount,
				firstCardContent: Boolean(firstCardContent),
				firstTableSection: Boolean(firstTableSection),
				continuationPrototypeContent: Boolean(continuationPrototypeContent),
				continuationPrototypeTableSection: Boolean(continuationPrototypeTableSection),
				lastPagePrototypeContent: Boolean(lastPagePrototypeContent),
				lastPagePrototypeTableSection: Boolean(lastPagePrototypeTableSection)
			});
			// Retry later when some refs are not yet bound (common in bulk rendering)
			if (splitRetryCount < MAX_SPLIT_RETRIES) {
				splitRetryCount += 1;
				// Use exponential backoff: 100ms, 150ms, 225ms, 337ms, 506ms, 759ms, 1138ms, 1707ms
				const delay = Math.min(100 * Math.pow(1.5, splitRetryCount - 1), 2000);
				setTimeout(queueSplit, delay);
				return;
			}
			// Exhausted retries — fall back to best-effort and continue
			console.warn(
				`RaporPreview[${instanceId}] refs still missing after retries, continuing with best-effort measurement`,
				{
					muridId: murid?.id ?? null,
					muridName: murid?.nama ?? null
				}
			);
		}

		const rows: TableRow[] = tableRows;
		const firstCapacity =
			firstCardContent && firstTableSection
				? computeTableCapacity(firstCardContent, firstTableSection)
				: 0;
		const continuationCapacity =
			continuationPrototypeContent && continuationPrototypeTableSection
				? computeTableCapacity(continuationPrototypeContent, continuationPrototypeTableSection)
				: 0;
		// For lastPageCapacity, just measure table section
		const lastPageCapacity =
			lastPagePrototypeContent && lastPagePrototypeTableSection
				? computeTableCapacity(lastPagePrototypeContent, lastPagePrototypeTableSection)
				: 0;

		// Measure footer height from a temporary rendered element
		// Use the actual font size from the page (text-[12px]) for accuracy
		const tempFooter = document.createElement('section');
		tempFooter.className = 'mt-8 flex flex-col gap-6 text-[12px]';
		tempFooter.style.position = 'fixed';
		tempFooter.style.left = '-10000px';
		tempFooter.style.visibility = 'hidden';
		// Don't add padding - measure the actual footer content height only
		tempFooter.innerHTML = `
			<div class="grid gap-4 md:grid-cols-3 print:grid-cols-3">
				<div class="flex flex-col items-center text-center">
					<p>Orang Tua/Wali Murid</p>
					<div class="mt-20 h-px w-full max-w-[220px] border-b border-dashed"></div>
				</div>
				<div class="text-center">
					<p>Kepala Sekolah</p>
					<div class="mt-16 font-semibold tracking-wide underline">Nama</div>
					<div class="mt-1">NIP</div>
				</div>
				<div class="relative flex flex-col items-center text-center">
					<p class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">Tempat, Tanggal</p>
					<p>Wali Kelas</p>
					<div class="mt-16 font-semibold tracking-wide underline">Nama</div>
					<div class="mt-1">NIP</div>
				</div>
			</div>
		`;
		document.body.appendChild(tempFooter);
		const measured = tempFooter.getBoundingClientRect().height;
		footerHeight = measured > 0 ? measured : 160; // Fallback to ~160px if measurement fails
		document.body.removeChild(tempFooter);

		const rowHeights = rows.map((row) => {
			const set = tableRowElements.get(row.order);
			if (!set || set.size === 0) return 0;
			let total = 0;
			for (const el of set) {
				total += el.getBoundingClientRect().height;
			}
			// Add 1px buffer per-row to account for border/padding variance
			return total + 1;
		});

		// Check for unmeasured rows and retry if needed
		const unmeasuredCount = rowHeights.filter((h) => h === 0).length;
		if (unmeasuredCount > 0) {
			if (splitRetryCount < MAX_SPLIT_RETRIES) {
				splitRetryCount += 1;
				const delay = Math.min(100 * Math.pow(1.5, splitRetryCount - 1), 2000);
				console.debug(
					`RaporPreview[${instanceId}] unmeasured rows (${unmeasuredCount}/${rowHeights.length}), retry #${splitRetryCount} after ${delay}ms`,
					{
						muridId: murid?.id ?? null,
						muridName: murid?.nama ?? null
					}
				);
				setTimeout(queueSplit, delay);
				return;
			}
			// Exhausted retries — estimate missing heights conservatively
			console.warn(
				`RaporPreview[${instanceId}] unmeasured rows after retries, using estimated heights`,
				{
					muridId: murid?.id ?? null,
					muridName: murid?.nama ?? null,
					unmeasuredCount,
					totalRows: rowHeights.length
				}
			);
			const measured = rowHeights.filter((h) => h > 0);
			const avg = measured.length ? measured.reduce((s, v) => s + v, 0) / measured.length : 80;
			for (let i = 0; i < rowHeights.length; i++) {
				if (rowHeights[i] === 0) rowHeights[i] = Math.max(avg, 60);
			}
		}

		// reset retry counter on success path
		splitRetryCount = 0;

		// Increased tolerance to allow small rendering differences between instances
		const tolerance = 2;

		// Reserve footer area when computing how many rows fit on the last page.
		// This prevents table content from extending into the footer/signature area.
		const reservedFooterSafety = 8; // px
		const reservedFooterGap = 10; // px

		let paginatedRows = paginateRowsByHeight({
			rows,
			rowHeights,
			firstPageCapacity: firstCapacity,
			continuationPageCapacity: continuationCapacity,
			tolerance
		});

		console.debug(`RaporPreview[${instanceId}] pagination initial`, {
			muridId: murid?.id ?? null,
			muridName: murid?.nama ?? null,
			firstCapacity,
			continuationCapacity,
			lastPageCapacity,
			rowHeightsSummary: {
				count: rowHeights.length,
				sum: rowHeights.reduce((s, h) => s + h, 0)
			}
		});

		// If we have multiple pages, re-fit the last page with the constrained lastPageCapacity
		if (paginatedRows.length > 1) {
			// Subtract reserved footer area from last page capacity before re-fitting
			const effectiveLastPageCapacity = Math.max(
				0,
				lastPageCapacity - (footerHeight + reservedFooterSafety + reservedFooterGap)
			);
			paginatedRows = refitLastPageWithCapacity(
				paginatedRows,
				rows,
				rowHeights,
				continuationCapacity,
				effectiveLastPageCapacity,
				tolerance
			);
		}

		// Apply group header pagination logic AFTER re-fitting:
		// Ensure group headers are not left alone at the bottom of a page
		paginatedRows = fixGroupHeaderPlacement(paginatedRows);

		// If footer won't fit on last page, make sure trailing tail blocks
		// (kokurikuler, ekstrakurikuler, ketidakhadiran, tanggapan) are
		// moved off the last page first so they don't overlap the footer.
		if (paginatedRows.length > 0) {
			const lastIdx = paginatedRows.length - 1;
			let lastRows = paginatedRows[lastIdx];
			const lastPageRowsHeights = lastRows.map((row) => {
				const originalIndex = rows.findIndex((r) => r.order === row.order);
				return rowHeights[originalIndex] ?? 0;
			});
			let lastPageUsed = lastPageRowsHeights.reduce((s, h) => s + h, 0);
			let remaining = lastPageCapacity - lastPageUsed;
			const footerNeeded = footerHeight + 8 + 10; // safety + gap

			if (remaining < footerNeeded) {
				// Collect trailing tail rows that can be moved
				const movable: TableRow[] = [];
				for (let i = lastRows.length - 1; i >= 0; i--) {
					const r = lastRows[i];
					if (r.kind === 'tail') {
						const originalIndex = rows.findIndex((row) => row.order === r.order);
						const h = rowHeights[originalIndex] ?? 0;
						// remove from lastRows and add to front of movable
						lastRows.splice(i, 1);
						movable.unshift(r);
						remaining += h;
						if (remaining >= footerNeeded) break;
					} else {
						// stop if we hit an intrak row (don't move intrak rows)
						break;
					}
				}

				if (movable.length > 0) {
					// Replace last page rows
					paginatedRows[lastIdx] = lastRows;
					// Paginate the moved tail rows into continuation pages
					const movedRowHeights = movable.map((r) => {
						const originalIndex = rows.findIndex((row) => row.order === r.order);
						return rowHeights[originalIndex] ?? 0;
					});
					const newPages = paginateRowsByHeight({
						rows: movable,
						rowHeights: movedRowHeights,
						firstPageCapacity: continuationCapacity,
						continuationPageCapacity: continuationCapacity,
						tolerance
					});
					// Append new pages after lastIdx
					paginatedRows.splice(lastIdx + 1, 0, ...newPages);
				}
			}
		}

		// Ensure any tail rows that don't fit on their page are moved to the next page.
		function shiftOverflowingTailRows(pages: TableRow[][]) {
			let changed = false;
			const maxIter = 10;
			let iter = 0;
			while (iter++ < maxIter) {
				changed = false;
				for (let pi = 0; pi < pages.length; pi++) {
					const page = pages[pi];
					const capacityBase = pi === 0 ? firstCapacity : continuationCapacity;
					// If this is the last page, subtract footer reservation
					let capacity = capacityBase;
					if (pi === pages.length - 1) {
						capacity = Math.max(0, lastPageCapacity - (footerHeight + 8 + 10));
					}

					let used = 0;
					for (let ri = 0; ri < page.length; ri++) {
						const row = page[ri];
						const originalIndex = rows.findIndex((r) => r.order === row.order);
						const rh = rowHeights[originalIndex] ?? 0;
						if (used + rh > capacity + tolerance) {
							// If the overflowing row is an intrak row, we should not move it.
							if (row.kind !== 'tail') {
								// cannot move intrak row; leave as-is and let pagination keep it (may overflow)
								break;
							}
							// Move this and following rows to the next page
							const moving = page.splice(ri);
							if (pages[pi + 1]) {
								pages[pi + 1] = [...moving, ...pages[pi + 1]];
							} else {
								pages.push(moving);
							}
							changed = true;
							break; // restart scanning pages
						}
						used += rh;
					}
					if (changed) break;
				}
				if (!changed) break;
			}
			return pages;
		}

		paginatedRows = shiftOverflowingTailRows(paginatedRows);

		// Additional pass: if a tail block (e.g. 'tanggapan') finishes too close
		// to the bottom of the page (touching the paper boundary) move it to
		// the next page. This prevents visual touching/overlap with footer.
		(function avoidTailTouchingBottom() {
			// Make this more permissive for the parent/guardian response block.
			// The tanggapan section is visually sensitive to the page bottom so
			// use a larger threshold and specifically target that tailKey.
			const threshold = 28; // px distance from page bottom considered "touching"
			const maxIter = 5;
			for (let iter = 0; iter < maxIter; iter++) {
				let moved = false;
				for (let pi = 0; pi < paginatedRows.length; pi++) {
					const page = paginatedRows[pi];
					const capacityBase = pi === 0 ? firstCapacity : continuationCapacity;
					let capacity = capacityBase;
					if (pi === paginatedRows.length - 1) {
						capacity = Math.max(0, lastPageCapacity - (footerHeight + 8 + 10));
					}

					let used = 0;
					for (let ri = 0; ri < page.length; ri++) {
						const row = page[ri];
						const originalIndex = rows.findIndex((r) => r.order === row.order);
						const rh = rowHeights[originalIndex] ?? 0;
						used += rh;
						if (row.kind === 'tail') {
							const tailKey = (row as any)?.tailKey as string | undefined;
							const remaining = capacity - used;
							// Aggressively move tanggapan when it gets close to bottom, or
							// fall back to standard overflow behavior.
							if (
								(tailKey === 'tanggapan' && remaining < threshold) ||
								used > capacity + tolerance
							) {
								const moving = page.splice(ri);
								if (paginatedRows[pi + 1]) {
									paginatedRows[pi + 1] = [...moving, ...paginatedRows[pi + 1]];
								} else {
									paginatedRows.push(moving);
								}
								moved = true;
								break;
							}
						}
					}
					if (moved) break; // re-evaluate from first page after change
				}
				if (!moved) break;
			}
		})();

		tablePages = paginatedRows.map((pageRows) => ({ rows: pageRows }));

		// Determine if footer fits on the last page
		// Calculate remaining space on last page
		const safetyMargin = 8; // Extra margin for rendering variance
		const footerGapMargin = 10; // Space for mt-8 before footer

		if (paginatedRows.length > 0) {
			const lastPageRowsHeights = paginatedRows[paginatedRows.length - 1].map((row) => {
				const originalIndex = rows.findIndex((r) => r.order === row.order);
				return rowHeights[originalIndex] ?? 0;
			});
			const lastPageUsedHeight = lastPageRowsHeights.reduce((sum, h) => sum + h, 0);
			const remainingSpace = lastPageCapacity - lastPageUsedHeight;
			const footerHeightWithGap = footerHeight + safetyMargin + footerGapMargin;
			// Allow a small extra slack when there are no intrakurikuler entries
			if ((rapor?.nilaiIntrakurikuler?.length ?? 0) === 0) {
				// Provide permissive allowance to keep signatures on same page when reasonable
				footerFitsOnLastPage = remainingSpace + 40 >= footerHeightWithGap;
			} else {
				footerFitsOnLastPage = remainingSpace >= footerHeightWithGap;
			}
		} else {
			// Single page case: check if footer fits after all content on first page
			const firstPageRowsHeights =
				paginatedRows[0]?.map((row) => {
					const originalIndex = rows.findIndex((r) => r.order === row.order);
					return rowHeights[originalIndex] ?? 0;
				}) ?? [];
			const firstPageUsedHeight = firstPageRowsHeights.reduce((sum, h) => sum + h, 0);
			const remainingSpace = firstCapacity - firstPageUsedHeight;
			const footerHeightWithGap = footerHeight + safetyMargin + footerGapMargin;
			if ((rapor?.nilaiIntrakurikuler?.length ?? 0) === 0) {
				footerFitsOnLastPage = remainingSpace + 40 >= footerHeightWithGap;
			} else {
				footerFitsOnLastPage = remainingSpace >= footerHeightWithGap;
			}
		}

		console.debug(`RaporPreview[${instanceId}] footer fit`, {
			muridId: murid?.id ?? null,
			footerHeight,
			footerFitsOnLastPage,
			lastPageCapacity,
			pagesCount: tablePages.length
		});
	}

	function refitLastPageWithCapacity(
		pages: TableRow[][],
		allRows: TableRow[],
		rowHeights: number[],
		continuationCapacity: number,
		lastPageCapacity: number,
		tolerance: number
	): TableRow[][] {
		if (pages.length === 0) return pages;

		// Flatten the last 2 pages to re-paginate with proper capacity
		const lastPageIndex = pages.length - 1;
		const secondLastPageIndex = lastPageIndex - 1;

		// Get all rows from last 2 pages (or just last page if only 1 exists)
		const rowsToRepaginate: TableRow[] = [];
		if (secondLastPageIndex >= 0) {
			rowsToRepaginate.push(...pages[secondLastPageIndex]);
			rowsToRepaginate.push(...pages[lastPageIndex]);
		} else {
			rowsToRepaginate.push(...pages[lastPageIndex]);
		}

		// Re-paginate using continuation capacity for second-to-last, and lastPageCapacity for last
		const result = pages.slice(0, Math.max(0, secondLastPageIndex));

		let cursor = 0;
		const totalToRepaginate = rowsToRepaginate.length;

		// Fill the second-to-last page with continuation capacity
		if (secondLastPageIndex >= 0) {
			// use measured continuationCapacity passed from caller
			const secondLastPageRows: TableRow[] = [];
			let used = 0;
			while (cursor < totalToRepaginate) {
				const row = rowsToRepaginate[cursor];
				const originalIndex = allRows.findIndex((r) => r.order === row.order);
				const rowHeight = rowHeights[originalIndex] ?? 0;

				if (secondLastPageRows.length > 0 && used + rowHeight > continuationCapacity + tolerance) {
					break;
				}
				if (secondLastPageRows.length === 0 && rowHeight > continuationCapacity + tolerance) {
					secondLastPageRows.push(row);
					cursor += 1;
					break;
				}
				secondLastPageRows.push(row);
				used += rowHeight;
				cursor += 1;
			}
			if (secondLastPageRows.length > 0) {
				result.push(secondLastPageRows);
			}
		}

		// Fill the last page with lastPageCapacity
		const lastPageRows: TableRow[] = [];
		let used = 0;
		while (cursor < totalToRepaginate) {
			const row = rowsToRepaginate[cursor];
			const originalIndex = allRows.findIndex((r) => r.order === row.order);
			const rowHeight = rowHeights[originalIndex] ?? 0;

			if (lastPageRows.length > 0 && used + rowHeight > lastPageCapacity + tolerance) {
				break;
			}
			if (lastPageRows.length === 0 && rowHeight > lastPageCapacity + tolerance) {
				lastPageRows.push(row);
				cursor += 1;
				break;
			}
			lastPageRows.push(row);
			used += rowHeight;
			cursor += 1;
		}
		if (lastPageRows.length > 0) {
			result.push(lastPageRows);
		}

		// Handle remaining rows by adding them as new pages with continuation capacity
		while (cursor < totalToRepaginate) {
			const intermediatePageRows: TableRow[] = [];
			let used = 0;
			while (cursor < totalToRepaginate) {
				const row = rowsToRepaginate[cursor];
				const originalIndex = allRows.findIndex((r) => r.order === row.order);
				const rowHeight = rowHeights[originalIndex] ?? 0;

				if (
					intermediatePageRows.length > 0 &&
					used + rowHeight > continuationCapacity + tolerance
				) {
					break;
				}
				if (intermediatePageRows.length === 0 && rowHeight > continuationCapacity + tolerance) {
					intermediatePageRows.push(row);
					cursor += 1;
					break;
				}
				intermediatePageRows.push(row);
				used += rowHeight;
				cursor += 1;
			}
			if (intermediatePageRows.length > 0) {
				result.push(intermediatePageRows);
			}
		}

		return result;
	}

	function fixGroupHeaderPlacement(pages: TableRow[][]): TableRow[][] {
		let result = pages.map((page) => [...page]); // Deep copy

		let changed = true;
		let iteration = 0;
		while (changed && iteration < 10) {
			// Add max iteration to prevent infinite loop
			iteration++;
			changed = false;
			const newResult: TableRow[][] = [];

			for (let i = 0; i < result.length; i++) {
				const page = result[i];

				// Check if last row is a group header
				if (page.length > 0 && page[page.length - 1].kind === 'intrak-group-header') {
					const lastRow = page[page.length - 1];

					// Remove header from current page
					const pageWithoutHeader = page.slice(0, -1);

					// Push page if it still has content
					if (pageWithoutHeader.length > 0) {
						newResult.push(pageWithoutHeader);
					}

					// Move header to next page
					if (i + 1 < result.length) {
						const nextPage = result[i + 1];
						result[i + 1] = [lastRow, ...nextPage];
					} else {
						// Create new page with just the header (will collect more rows)
						newResult.push([lastRow]);
					}

					changed = true;
				} else {
					newResult.push(page);
				}
			}

			result = newResult;
		}

		return result;
	}

	function queueSplit() {
		if (splitQueued) return;

		// Debounce split calls to reduce calculation spam in bulk mode
		const now = Date.now();
		if (now - lastSplitTimestamp < SPLIT_DEBOUNCE_MS) {
			// Too soon, reschedule
			if (splitAnimationFrameId !== null) {
				cancelAnimationFrame(splitAnimationFrameId);
			}
			splitAnimationFrameId = requestAnimationFrame(() => {
				setTimeout(queueSplit, SPLIT_DEBOUNCE_MS);
			});
			return;
		}

		lastSplitTimestamp = now;
		splitQueued = true;
		if (splitAnimationFrameId !== null) {
			cancelAnimationFrame(splitAnimationFrameId);
		}
		splitAnimationFrameId = requestAnimationFrame(() => {
			queueMicrotask(splitTableRows);
		});
	}

	function triggerSplitOnMount(node: Element) {
		void node;
		queueSplit();
		return {
			destroy() {
				queueSplit();
			}
		};
	}

	$effect(() => {
		void tableRows;
		// Reset instance state when murid changes to avoid cross-instance pollution
		const currentMuridId = murid?.id ?? null;
		if (currentMuridId !== lastMuridId) {
			console.debug(`RaporPreview[${instanceId}] murid changed, resetting state`, {
				oldMuridId: lastMuridId,
				newMuridId: currentMuridId
			});
			lastMuridId = currentMuridId;
			// Clear measured DOM references and pagination state
			tableRowElements.clear();
			tablePages = [];
			splitQueued = false;
			firstCardContent = null;
			firstTableSection = null;
			splitRetryCount = 0;
			lastSplitTimestamp = 0;
		}
		queueSplit();
	});

	onMount(() => {
		console.debug(`RaporPreview[${instanceId}] mounted`, {
			muridId: murid?.id ?? null,
			muridName: murid?.nama ?? null
		});

		// Initial split with slight delay to ensure DOM is fully rendered
		// In bulk mode, this helps stagger the computation
		const initialDelay = Math.random() * 30; // 0-30ms random jitter
		setTimeout(queueSplit, initialDelay);

		const handleResize = () => queueSplit();
		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
			if (splitAnimationFrameId !== null) {
				cancelAnimationFrame(splitAnimationFrameId);
			}
			console.debug(`RaporPreview[${instanceId}] unmounted`);
		};
	});

	function formatValue(value: string | null | undefined) {
		if (!value) return '—';
		const trimmed = value.trim();
		return trimmed.length ? trimmed : '—';
	}

	function formatUpper(value: string | null | undefined) {
		const formatted = formatValue(value);
		return formatted === '—' ? formatted : formatted.toUpperCase();
	}

	function formatHari(value: number | null | undefined) {
		if (value === null || value === undefined) return '—';
		return `${value} hari`;
	}

	$effect(() => {
		onPrintableReady?.(printable);
	});
</script>

<div
	class="bg-base-300 dark:bg-base-200 card preview w-full rounded-md border border-black/20 shadow-md print:border-none print:bg-transparent print:p-0"
>
	<div class="mx-auto flex w-fit flex-col gap-6 print:gap-0" bind:this={printable}>
		<PrintCardPage
			breakAfter
			bind:contentRef={firstCardContent}
			splitTrigger={triggerSplitOnMount}
			{backgroundStyle}
			{murid}
			{rombel}
			pageNumber={1}
		>
			<header class="pb-4 text-center">
				<h1 class="text-2xl font-bold tracking-wide uppercase">Laporan Hasil Belajar</h1>
				<h2 class="font-semibold tracking-wide uppercase">(Rapor)</h2>
			</header>

			<RaporIdentityTable {murid} {rombel} {sekolah} {periode} {formatValue} {formatUpper} />

			<RaporIntrakTable
				rows={firstPageRows}
				tableRowAction={tableRow}
				{rapor}
				{formatValue}
				{formatHari}
				{waliKelas}
				{kepalaSekolah}
				{ttd}
				bind:sectionRef={firstTableSection}
				sectionClass="mt-8"
				splitTrigger={triggerSplitOnMount}
			/>
			{#if tablePages.length <= 1}
				<!-- Footer/Signatures Section when only a single table page exists -->
				<section class="mt-8 flex break-inside-avoid flex-col gap-6 print:break-inside-avoid">
					<div class="grid gap-4 md:grid-cols-3 print:grid-cols-3">
						<div class="flex flex-col items-center text-center">
							<p>Orang Tua/Wali Murid</p>
							<div
								class="mt-20 h-px w-full max-w-[220px] border-b border-dashed"
								aria-hidden="true"
							></div>
						</div>
						<div class="text-center">
							<p>{kepalaSekolahTitle}</p>
							<div class="mt-16 font-semibold tracking-wide underline">
								{formatValue(kepalaSekolah?.nama)}
							</div>
							<div class="mt-1">{formatValue(kepalaSekolah?.nip)}</div>
						</div>
						<div class="relative flex flex-col items-center text-center">
							<p class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
								{formatValue(ttd?.tempat)}, {formatValue(ttd?.tanggal)}
							</p>
							<p>Wali Kelas</p>
							<div class="mt-16 font-semibold tracking-wide underline">
								{formatValue(waliKelas?.nama)}
							</div>
							<div class="mt-1">{formatValue(waliKelas?.nip)}</div>
						</div>
					</div>
				</section>
			{/if}
		</PrintCardPage>

		{#each intermediatePageRows as pageRows, pageIndex (pageIndex)}
			<PrintCardPage
				breakAfter
				splitTrigger={triggerSplitOnMount}
				{backgroundStyle}
				{murid}
				{rombel}
				pageNumber={2 + pageIndex}
			>
				<RaporIntrakTable
					rows={pageRows}
					tableRowAction={tableRow}
					{rapor}
					{formatValue}
					{formatHari}
					{waliKelas}
					{kepalaSekolah}
					{ttd}
					splitTrigger={triggerSplitOnMount}
				/>
			</PrintCardPage>
		{/each}

		<!-- Render final table page with optional footer if it fits -->
		{#if finalPageRows.length > 0}
			<PrintCardPage
				breakAfter={shouldRenderFooterOnSeparatePage}
				splitTrigger={triggerSplitOnMount}
				{backgroundStyle}
				{murid}
				{rombel}
				pageNumber={2 + intermediatePageRows.length}
			>
				<RaporIntrakTable
					rows={finalPageRows}
					tableRowAction={tableRow}
					{rapor}
					{formatValue}
					{formatHari}
					{waliKelas}
					{kepalaSekolah}
					{ttd}
					splitTrigger={triggerSplitOnMount}
				/>
				<!-- Include footer on same page if it fits -->
				{#if footerFitsOnLastPage}
					<section class="mt-8 flex break-inside-avoid flex-col gap-6 print:break-inside-avoid">
						<div class="grid gap-4 md:grid-cols-3 print:grid-cols-3">
							<div class="flex flex-col items-center text-center">
								<p>Orang Tua/Wali Murid</p>
								<div
									class="mt-20 h-px w-full max-w-[220px] border-b border-dashed"
									aria-hidden="true"
								></div>
							</div>
							<div class="text-center">
								<p>{kepalaSekolahTitle}</p>
								<div class="mt-16 font-semibold tracking-wide underline">
									{formatValue(kepalaSekolah?.nama)}
								</div>
								<div class="mt-1">{formatValue(kepalaSekolah?.nip)}</div>
							</div>
							<div class="relative flex flex-col items-center text-center">
								<p class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
									{formatValue(ttd?.tempat)}, {formatValue(ttd?.tanggal)}
								</p>
								<p>Wali Kelas</p>
								<div class="mt-16 font-semibold tracking-wide underline">
									{formatValue(waliKelas?.nama)}
								</div>
								<div class="mt-1">{formatValue(waliKelas?.nip)}</div>
							</div>
						</div>
					</section>
				{/if}
			</PrintCardPage>
		{/if}

		<!-- Render footer on separate page if it doesn't fit on last table page -->
		{#if shouldRenderFooterOnSeparatePage && finalPageRows.length > 0}
			<PrintCardPage
				splitTrigger={triggerSplitOnMount}
				{backgroundStyle}
				{murid}
				{rombel}
				pageNumber={3 + intermediatePageRows.length}
			>
				<!-- Footer/Signatures Section on dedicated page -->
				<section class="mt-8 flex break-inside-avoid flex-col gap-6 print:break-inside-avoid">
					<div class="grid gap-4 md:grid-cols-3 print:grid-cols-3">
						<div class="flex flex-col items-center text-center">
							<p>Orang Tua/Wali Murid</p>
							<div
								class="mt-20 h-px w-full max-w-[220px] border-b border-dashed"
								aria-hidden="true"
							></div>
						</div>
						<div class="text-center">
							<p>{kepalaSekolahTitle}</p>
							<div class="mt-16 font-semibold tracking-wide underline">
								{formatValue(kepalaSekolah?.nama)}
							</div>
							<div class="mt-1">{formatValue(kepalaSekolah?.nip)}</div>
						</div>
						<div class="relative flex flex-col items-center text-center">
							<p class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
								{formatValue(ttd?.tempat)}, {formatValue(ttd?.tanggal)}
							</p>
							<p>Wali Kelas</p>
							<div class="mt-16 font-semibold tracking-wide underline">
								{formatValue(waliKelas?.nama)}
							</div>
							<div class="mt-1">{formatValue(waliKelas?.nip)}</div>
						</div>
					</div>
				</section>
			</PrintCardPage>
		{/if}

		<div
			class="pointer-events-none"
			style="position: fixed; top: -10000px; left: -10000px; width: 210mm; pointer-events: none; opacity: 0;"
			aria-hidden="true"
		>
			<div class="card bg-base-100">
				<div
					class="bg-base-100 text-base-content mx-auto flex max-h-[297mm] min-h-[297mm] max-w-[210mm] min-w-[210mm] flex-col p-[20mm]"
				>
					<div
						class="flex min-h-0 flex-1 flex-col text-[12px]"
						bind:this={continuationPrototypeContent}
					>
						<section bind:this={continuationPrototypeTableSection} use:triggerSplitOnMount>
							<table class="w-full border-collapse" data-intrak-table="true">
								<thead>
									<tr>
										<th class="border px-3 py-2 text-left">No.</th>
										<th class="border px-3 py-2 text-left">Muatan Pelajaran</th>
										<th class="border px-3 py-2 text-center">Nilai Akhir</th>
										<th class="border px-3 py-2 text-left">Capaian Kompetensi</th>
									</tr>
								</thead>
							</table>
						</section>
					</div>
				</div>
			</div>
		</div>

		<div
			class="pointer-events-none"
			style="position: fixed; top: -10000px; left: -10000px; width: 210mm; pointer-events: none; opacity: 0;"
			aria-hidden="true"
		>
			<div class="card bg-base-100">
				<div
					class="bg-base-100 text-base-content mx-auto flex max-h-[297mm] min-h-[297mm] max-w-[210mm] min-w-[210mm] flex-col p-[20mm]"
				>
					<div
						class="flex min-h-0 flex-1 flex-col text-[12px]"
						bind:this={lastPagePrototypeContent}
					>
						<section bind:this={lastPagePrototypeTableSection} use:triggerSplitOnMount>
							<table class="w-full border-collapse" data-intrak-table="true">
								<thead>
									<tr>
										<th class="border px-3 py-2 text-left">No.</th>
										<th class="border px-3 py-2 text-left">Muatan Pelajaran</th>
										<th class="border px-3 py-2 text-center">Nilai Akhir</th>
										<th class="border px-3 py-2 text-left">Capaian Kompetensi</th>
									</tr>
								</thead>
							</table>
						</section>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
