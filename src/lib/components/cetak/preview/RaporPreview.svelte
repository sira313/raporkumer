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

	type RaporData = NonNullable<App.PageData['raporData']>;
	type ComponentData = {
		raporData?: RaporData | null;
		meta?: { title?: string | null } | null;
	};

	let {
		data = {},
		onPrintableReady = () => {},
		showBgLogo = false
	} = $props<{
		data?: ComponentData;
		onPrintableReady?: (node: HTMLDivElement | null) => void;
		showBgLogo?: boolean;
	}>();

	let printable: HTMLDivElement | null = null;

	const rapor = $derived.by(() => data?.raporData ?? null);
	const sekolah = $derived.by(() => rapor?.sekolah ?? null);
	const murid = $derived.by(() => rapor?.murid ?? null);
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
	const tableRowElements = new Map<number, Set<HTMLTableRowElement>>();
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

	function computeTableCapacity(content: HTMLElement, tableSection: HTMLElement) {
		const contentRect = content.getBoundingClientRect();
		const tableRect = tableSection.getBoundingClientRect();
		const headerHeight = tableSection.querySelector('thead')?.getBoundingClientRect().height ?? 0;
		return Math.max(0, contentRect.bottom - tableRect.top - headerHeight);
	}

	async function splitTableRows() {
		splitQueued = false;
		if (splitAnimationFrameId !== null) {
			cancelAnimationFrame(splitAnimationFrameId);
			splitAnimationFrameId = null;
		}
		await tick();
		if (
			!firstCardContent ||
			!firstTableSection ||
			!continuationPrototypeContent ||
			!continuationPrototypeTableSection ||
			!lastPagePrototypeContent ||
			!lastPagePrototypeTableSection
		) {
			return;
		}

		const rows: TableRow[] = tableRows;
		const firstCapacity = computeTableCapacity(firstCardContent, firstTableSection);
		const continuationCapacity = computeTableCapacity(
			continuationPrototypeContent,
			continuationPrototypeTableSection
		);
		// For lastPageCapacity, just measure table section
		const lastPageCapacity = computeTableCapacity(
			lastPagePrototypeContent,
			lastPagePrototypeTableSection
		);

		// Measure footer height from a temporary rendered element
		// Use the actual font size from the page (text-[12px]) for accuracy
		const tempFooter = document.createElement('section');
		tempFooter.className = 'mt-8 flex flex-col gap-6 text-[12px]';
		tempFooter.style.position = 'fixed';
		tempFooter.style.left = '-10000px';
		tempFooter.style.visibility = 'hidden';
		// Don't add padding - measure the actual footer content height only
		tempFooter.innerHTML = `
			<div class="grid gap-4 md:grid-cols-2 print:grid-cols-2">
				<div class="flex flex-col items-center text-center">
					<p>Orang Tua/Wali Murid</p>
					<div class="mt-20 h-px w-full max-w-[220px] border-b border-dashed"></div>
				</div>
				<div class="relative flex flex-col items-center text-center">
					<p class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">Tempat, Tanggal</p>
					<p>Wali Kelas</p>
					<div class="mt-16 font-semibold tracking-wide underline">Nama</div>
					<div class="mt-1">NIP</div>
				</div>
			</div>
			<div class="text-center">
				<p>Kepala Sekolah</p>
				<div class="mt-16 font-semibold tracking-wide underline">Nama</div>
				<div class="mt-1">NIP</div>
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
			return total;
		});
		if (rowHeights.some((height) => height === 0)) {
			queueSplit();
			return;
		}

		const tolerance = 0.5;

		let paginatedRows = paginateRowsByHeight({
			rows,
			rowHeights,
			firstPageCapacity: firstCapacity,
			continuationPageCapacity: continuationCapacity,
			tolerance
		});

		// If we have multiple pages, re-fit the last page with the constrained lastPageCapacity
		if (paginatedRows.length > 1) {
			paginatedRows = refitLastPageWithCapacity(
				paginatedRows,
				rows,
				rowHeights,
				lastPageCapacity,
				tolerance
			);
		}

		// Apply group header pagination logic AFTER re-fitting:
		// Ensure group headers are not left alone at the bottom of a page
		paginatedRows = fixGroupHeaderPlacement(paginatedRows, rowHeights, rows);

		tablePages = paginatedRows.map((pageRows) => ({ rows: pageRows }));

		// Determine if footer fits on the last page
		// Calculate remaining space on last page
		const safetyMargin = 8; // Extra margin for rendering variance only
		const footerGapMargin = 10; // Space for mt-8 before footer

		if (paginatedRows.length > 0) {
			const lastPageRowsHeights = paginatedRows[paginatedRows.length - 1].map((row) => {
				const originalIndex = rows.findIndex((r) => r.order === row.order);
				return rowHeights[originalIndex] ?? 0;
			});
			const lastPageUsedHeight = lastPageRowsHeights.reduce((sum, h) => sum + h, 0);
			const remainingSpace = lastPageCapacity - lastPageUsedHeight;
			const footerHeightWithGap = footerHeight + safetyMargin + footerGapMargin;
			footerFitsOnLastPage = remainingSpace >= footerHeightWithGap;
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
			footerFitsOnLastPage = remainingSpace >= footerHeightWithGap;
		}
	}

	function refitLastPageWithCapacity(
		pages: TableRow[][],
		allRows: TableRow[],
		rowHeights: number[],
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
			const continuationCapacity = computeTableCapacity(
				continuationPrototypeContent!,
				continuationPrototypeTableSection!
			);
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
			const continuationCapacity = computeTableCapacity(
				continuationPrototypeContent!,
				continuationPrototypeTableSection!
			);
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

	function fixGroupHeaderPlacement(
		pages: TableRow[][],
		rowHeights: number[],
		allRows: TableRow[]
	): TableRow[][] {
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
		queueSplit();
	});

	onMount(() => {
		queueSplit();
		const handleResize = () => queueSplit();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
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
		</PrintCardPage>

		{#each intermediatePageRows as pageRows, pageIndex (pageIndex)}
			<PrintCardPage breakAfter splitTrigger={triggerSplitOnMount} {backgroundStyle}>
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
						<div class="grid gap-4 md:grid-cols-2 print:grid-cols-2">
							<div class="flex flex-col items-center text-center">
								<p>Orang Tua/Wali Murid</p>
								<div
									class="mt-20 h-px w-full max-w-[220px] border-b border-dashed"
									aria-hidden="true"
								></div>
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
						<div class="text-center">
							<p>{kepalaSekolahTitle}</p>
							<div class="mt-16 font-semibold tracking-wide underline">
								{formatValue(kepalaSekolah?.nama)}
							</div>
							<div class="mt-1">{formatValue(kepalaSekolah?.nip)}</div>
						</div>
					</section>
				{/if}
			</PrintCardPage>
		{:else}
			<!-- If no finalPageRows, all content fits in first page -->
			<!-- So render footer on same first page -->
			<PrintCardPage splitTrigger={triggerSplitOnMount} {backgroundStyle}>
				<!-- Footer/Signatures Section on first page if it's the only page -->
				<section class="mt-8 flex break-inside-avoid flex-col gap-6 print:break-inside-avoid">
					<div class="grid gap-4 md:grid-cols-2 print:grid-cols-2">
						<div class="flex flex-col items-center text-center">
							<p>Orang Tua/Wali Murid</p>
							<div
								class="mt-20 h-px w-full max-w-[220px] border-b border-dashed"
								aria-hidden="true"
							></div>
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
					<div class="text-center">
						<p>{kepalaSekolahTitle}</p>
						<div class="mt-16 font-semibold tracking-wide underline">
							{formatValue(kepalaSekolah?.nama)}
						</div>
						<div class="mt-1">{formatValue(kepalaSekolah?.nip)}</div>
					</div>
				</section>
			</PrintCardPage>
		{/if}

		<!-- Render footer on separate page if it doesn't fit on last table page -->
		{#if shouldRenderFooterOnSeparatePage && finalPageRows.length > 0}
			<PrintCardPage splitTrigger={triggerSplitOnMount} {backgroundStyle}>
				<!-- Footer/Signatures Section on dedicated page -->
				<section class="mt-8 flex break-inside-avoid flex-col gap-6 print:break-inside-avoid">
					<div class="grid gap-4 md:grid-cols-2 print:grid-cols-2">
						<div class="flex flex-col items-center text-center">
							<p>Orang Tua/Wali Murid</p>
							<div
								class="mt-20 h-px w-full max-w-[220px] border-b border-dashed"
								aria-hidden="true"
							></div>
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
					<div class="text-center">
						<p>{kepalaSekolahTitle}</p>
						<div class="mt-16 font-semibold tracking-wide underline">
							{formatValue(kepalaSekolah?.nama)}
						</div>
						<div class="mt-1">{formatValue(kepalaSekolah?.nip)}</div>
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
