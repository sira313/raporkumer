<script lang="ts">
	import { onMount, tick } from 'svelte';
	import PrintCardPage from '$lib/components/cetak/rapor/PrintCardPage.svelte';
	import RaporIdentityTable from '$lib/components/cetak/rapor/RaporIdentityTable.svelte';
	import KeasramaanTable from '$lib/components/cetak/keasramaan/KeasramaanTable.svelte';
	import { paginateRowsByHeight } from '$lib/utils/table-pagination';

	type KeasramaanPrintData = NonNullable<App.PageData['keasramaanData']>;
	type KeasramaanRow = {
		no: number;
		indikator: string;
		predikat: 'perlu-bimbingan' | 'cukup' | 'baik' | 'sangat-baik';
		deskripsi: string;
		kategoriHeader?: string;
		order?: number; // Added for table pagination tracking
	};
	type KeasramaanRowWithOrder = KeasramaanRow & { order: number };

	type ComponentData = {
		keasramaanData?: KeasramaanPrintData | null;
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

	const keasramaan = $derived.by(() => data?.keasramaanData ?? null);
	const sekolah = $derived.by(() => keasramaan?.sekolah ?? null);
	const murid = $derived.by(() => keasramaan?.murid ?? null);
	const rombel = $derived.by(() => keasramaan?.rombel ?? null);
	const periode = $derived.by(() => keasramaan?.periode ?? null);
	const waliAsrama = $derived.by(() => keasramaan?.waliAsrama ?? null);
	const waliKelas = $derived.by(() => keasramaan?.waliKelas ?? null);
	const waliAsuh = $derived.by(() => keasramaan?.waliAsuh ?? null);
	const kepalaSekolah = $derived.by(() => keasramaan?.kepalaSekolah ?? null);
	const ttd = $derived.by(() => keasramaan?.ttd ?? null);
	const kehadiran = $derived.by(() => keasramaan?.kehadiran ?? null);
	const keasramaanRows = $derived.by(() => keasramaan?.keasramaanRows ?? []);
	const hasCompleteData = $derived.by(() => {
		return !!(murid?.nama && rombel?.nama && sekolah?.nama);
	});
	const kepalaSekolahTitle = $derived.by(() => {
		const status = kepalaSekolah?.statusKepalaSekolah;
		return status === 'plt' ? 'Plt. Kepala Sekolah' : 'Kepala Sekolah';
	});

	const logoUrl = $derived.by(() => sekolah?.logoUrl ?? '/tutwuri.png');
	const backgroundStyle = $derived.by(() => {
		if (!showBgLogo) return '';
		const escapedUrl = logoUrl.replace(/'/g, "\\'");
		return `background-image: url('${escapedUrl}'); background-position: center center; background-repeat: no-repeat; background-size: 45%; background-attachment: local; position: relative;`;
	});

	let firstCardContent = $state<HTMLDivElement | null>(null);
	let firstTableSection = $state<HTMLElement | null>(null);
	let continuationPrototypeContent = $state<HTMLDivElement | null>(null);
	let continuationPrototypeTableSection = $state<HTMLElement | null>(null);
	let lastPagePrototypeContent = $state<HTMLDivElement | null>(null);
	let lastPagePrototypeTableSection = $state<HTMLElement | null>(null);

	// Minimum height needed for a category header + at least one indicator row
	// This ensures category headers are not left alone at page bottom
	const MIN_HEIGHT_FOR_CATEGORY = 90;

	// Support multiple <tr> elements for a single logical row (rowspan-style groups).
	// IMPORTANT: Each instance of KeasramaanPreview gets its own tableRowElements Map
	// to prevent state pollution in bulk mode where multiple murid are rendered.
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
		rows: KeasramaanRow[];
	};

	let tablePages = $state<TablePage[]>([]);
	let lastMuridId = $state<number | null>(null);
	let footerHeight = $state<number>(0);
	let footerFitsOnLastPage = $state<boolean>(false);

	const firstPageRows = $derived.by(() => {
		if (tablePages.length > 0) return tablePages[0]?.rows ?? [];
		return keasramaanRows;
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

	/**
	 * Reset internal state when murid data changes.
	 * This ensures that in bulk mode (multiple murid rendered),
	 * each murid instance has a clean state.
	 */
	$effect(() => {
		const currentMuridId = murid?.id ?? null;

		// If this is a new murid (different from last render), reset state
		if (currentMuridId !== lastMuridId) {
			lastMuridId = currentMuridId;
			tableRowElements.clear();
			tablePages = [];
			splitQueued = false;
			firstCardContent = null;
			firstTableSection = null;
		}
	});

	function computeTableCapacity(content: HTMLElement, tableSection: HTMLElement) {
		const contentRect = content.getBoundingClientRect();
		const tableRect = tableSection.getBoundingClientRect();
		const headerHeight = tableSection.querySelector('thead')?.getBoundingClientRect().height ?? 0;
		// Apply safety margin: reduce capacity by 10px to account for rendering variance & wrapping
		const safetyMargin = 10;
		return Math.max(0, contentRect.bottom - tableRect.top - headerHeight - safetyMargin);
	}

	async function splitTableRows() {
		splitQueued = false;
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

		const rows: KeasramaanRow[] = keasramaanRows;
		if (rows.length === 0) {
			tablePages = [];
			return;
		}

		const firstCapacity = computeTableCapacity(firstCardContent, firstTableSection);
		const continuationCapacity = computeTableCapacity(
			continuationPrototypeContent,
			continuationPrototypeTableSection
		);
		const lastPageCapacity = computeTableCapacity(
			lastPagePrototypeContent,
			lastPagePrototypeTableSection
		);

		// Map rows dengan order untuk tracking DOM
		const rowsWithOrder = rows.map((row, index) => ({ ...row, order: index }));

		// Hitung heights dari DOM elements
		// Add small buffer (1px) to each row to account for border/padding variance
		const rowHeights = rowsWithOrder.map((row) => {
			const set = tableRowElements.get(row.order);
			if (!set || set.size === 0) return 0;
			let total = 0;
			for (const el of set) {
				total += el.getBoundingClientRect().height;
			}
			// Add 1px buffer per row to account for rendering variance
			return total + 1;
		});

		// Jika ada row height yang belum terukur, coba lagi
		if (rowHeights.some((height) => height === 0)) {
			queueSplit();
			return;
		}

		const tolerance = 2; // Increased from 0.5 to 2 for better safety margin

		let paginatedRows = paginateRowsByHeight({
			rows: rowsWithOrder,
			rowHeights,
			firstPageCapacity: firstCapacity,
			continuationPageCapacity: continuationCapacity,
			tolerance
		});

		// If we have multiple pages, re-fit the last page with the constrained lastPageCapacity
		if (paginatedRows.length > 1) {
			paginatedRows = refitLastPageWithCapacity(
				paginatedRows,
				rowsWithOrder,
				rowHeights,
				lastPageCapacity,
				tolerance
			);
		}

		// Apply category header pagination logic AFTER re-fitting:
		// Ensure category headers are not left alone at the bottom of a page
		// by moving them to the next page if they don't have indicators following
		paginatedRows = fixCategoryHeaderPlacement(paginatedRows, rowHeights, rowsWithOrder);

		tablePages = paginatedRows.map((pageRows) => ({ rows: pageRows }));

		// Measure footer height from a temporary rendered element
		const tempFooter = document.createElement('section');
		tempFooter.className = 'mt-6 flex flex-col gap-6 text-xs print:text-xs';
		tempFooter.style.position = 'fixed';
		tempFooter.style.left = '-10000px';
		tempFooter.style.visibility = 'hidden';
		tempFooter.innerHTML = `
			<table class="w-full border">
				<thead>
					<tr>
						<th class="border px-3 py-2 text-left font-bold" colspan="3">KETIDAKHADIRAN</th>
					</tr>
					<tr>
						<th class="w-12 border px-3 py-2 text-center font-semibold">No</th>
						<th class="border px-3 py-2 text-left font-semibold">Alasan Ketidakhadiran</th>
						<th class="w-16 border px-3 py-2 text-center font-semibold">Jumlah</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td class="border px-3 py-2 text-center">1</td>
						<td class="border px-3 py-2">Sakit</td>
						<td class="border px-3 py-2 text-center">0</td>
					</tr>
					<tr>
						<td class="border px-3 py-2 text-center">2</td>
						<td class="border px-3 py-2">Izin</td>
						<td class="border px-3 py-2 text-center">0</td>
					</tr>
					<tr>
						<td class="border px-3 py-2 text-center">3</td>
						<td class="border px-3 py-2">Tanpa Keterangan</td>
						<td class="border px-3 py-2 text-center">0</td>
					</tr>
				</tbody>
			</table>
			<div class="flex flex-col gap-6">
				<div class="grid gap-4 md:grid-cols-2 print:grid-cols-2">
					<div class="flex flex-col items-center text-center text-xs print:text-xs">
						<p>Wali Asrama</p>
						<div class="mt-16 font-semibold tracking-wide underline">Nama</div>
						<div class="mt-1 text-xs">NIP</div>
					</div>
					<div class="relative flex flex-col items-center text-center text-xs print:text-xs">
						<p class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">Tempat, Tanggal</p>
						<p>Wali Asuh</p>
						<div class="mt-16 font-semibold tracking-wide underline">Nama</div>
						<div class="mt-1 text-xs">NIP</div>
					</div>
				</div>
				<div class="grid gap-4 md:grid-cols-2 print:grid-cols-2">
					<div class="flex flex-col items-center text-center text-xs print:text-xs">
						<p>Orang Tua/Wali Murid</p>
						<div class="mt-20 h-px w-full max-w-[220px] border-b border-dashed"></div>
					</div>
					<div class="flex flex-col items-center text-center text-xs print:text-xs">
						<p>Kepala Sekolah</p>
						<div class="mt-16 font-semibold tracking-wide underline">Nama</div>
						<div class="mt-1 text-xs">NIP</div>
					</div>
				</div>
			</div>
		`;
		document.body.appendChild(tempFooter);
		const measured = tempFooter.getBoundingClientRect().height;
		footerHeight = measured > 0 ? measured : 200; // Fallback if measurement fails
		document.body.removeChild(tempFooter);

		// Determine if footer fits on the last page
		const safetyMargin = 8;
		const footerGapMargin = 10;

		if (paginatedRows.length > 0) {
			const lastPageRowsHeights = paginatedRows[paginatedRows.length - 1].map((row) => {
				const originalIndex = rowsWithOrder.findIndex((r) => r.order === row.order);
				return rowHeights[originalIndex] ?? 0;
			});
			const lastPageUsedHeight = lastPageRowsHeights.reduce((sum, h) => sum + h, 0);
			const remainingSpace = lastPageCapacity - lastPageUsedHeight;
			const footerHeightWithGap = footerHeight + safetyMargin + footerGapMargin;
			footerFitsOnLastPage = remainingSpace >= footerHeightWithGap;
		} else {
			// Single page case
			const firstPageRowsHeights =
				paginatedRows[0]?.map((row) => {
					const originalIndex = rowsWithOrder.findIndex((r) => r.order === row.order);
					return rowHeights[originalIndex] ?? 0;
				}) ?? [];
			const firstPageUsedHeight = firstPageRowsHeights.reduce((sum, h) => sum + h, 0);
			const remainingSpace = firstCapacity - firstPageUsedHeight;
			const footerHeightWithGap = footerHeight + safetyMargin + footerGapMargin;
			footerFitsOnLastPage = remainingSpace >= footerHeightWithGap;
		}
	}

	function refitLastPageWithCapacity(
		pages: KeasramaanRowWithOrder[][],
		allRowsWithOrder: KeasramaanRowWithOrder[],
		rowHeights: number[],
		lastPageCapacity: number,
		tolerance: number
	): KeasramaanRowWithOrder[][] {
		if (pages.length === 0) return pages;

		// Flatten the last 2 pages to re-paginate with proper capacity
		const lastPageIndex = pages.length - 1;
		const secondLastPageIndex = lastPageIndex - 1;

		// Get all rows from last 2 pages (or just last page if only 1 exists)
		const rowsToRepaginate: KeasramaanRowWithOrder[] = [];
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
			const secondLastPageRows: KeasramaanRowWithOrder[] = [];
			let used = 0;
			while (cursor < totalToRepaginate) {
				const row = rowsToRepaginate[cursor];
				const originalIndex = allRowsWithOrder.findIndex((r) => r.order === row.order);
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
		const lastPageRows: KeasramaanRowWithOrder[] = [];
		let used = 0;
		while (cursor < totalToRepaginate) {
			const row = rowsToRepaginate[cursor];
			const originalIndex = allRowsWithOrder.findIndex((r) => r.order === row.order);
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
			const intermediatePageRows: KeasramaanRowWithOrder[] = [];
			let used = 0;
			while (cursor < totalToRepaginate) {
				const row = rowsToRepaginate[cursor];
				const originalIndex = allRowsWithOrder.findIndex((r) => r.order === row.order);
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

	function fixCategoryHeaderPlacement(
		pages: KeasramaanRowWithOrder[][],
		rowHeights: number[],
		allRowsWithOrder: KeasramaanRowWithOrder[]
	): KeasramaanRowWithOrder[][] {
		let result = pages.map((page) => [...page]); // Deep copy

		let changed = true;
		let iteration = 0;
		while (changed && iteration < 10) {
			// Add max iteration to prevent infinite loop
			iteration++;
			changed = false;
			const newResult: KeasramaanRowWithOrder[][] = [];

			for (let i = 0; i < result.length; i++) {
				const page = result[i];

				// Check if last row is a category header
				if (page.length > 0 && page[page.length - 1].kategoriHeader) {
					const lastRow = page[page.length - 1];
					const nextPageIndex = i + 1;

					// Jika ini adalah header di akhir page, move ke page berikutnya
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
		queueMicrotask(splitTableRows);
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
		void keasramaanRows;
		queueSplit();
	});

	onMount(() => {
		queueSplit();
		const handleResize = () => queueSplit();
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});

	function formatValue(value: string | null | undefined) {
		if (value === null || value === undefined || value === '') return '—';
		return value;
	}

	function formatUpper(value: string | null | undefined) {
		const formatted = formatValue(value);
		return formatted === '—' ? formatted : formatted.toUpperCase();
	}

	$effect(() => {
		onPrintableReady?.(printable);
	});
</script>

<div
	class="bg-base-300 dark:bg-base-200 card preview w-full rounded-md border border-black/20 shadow-md print:border-none print:bg-transparent print:p-0"
>
	{#if !hasCompleteData}
		<div class="alert alert-warning m-4 print:hidden">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-6 w-6 shrink-0 stroke-current"
				fill="none"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M12 9v2m0 4v2m0 4v2M7.08 6.06A9 9 0 1 0 20.94 19M7.08 6.06l11.86 11.86"
				></path>
			</svg>
			<span
				>Data murid, kelas, atau sekolah belum lengkap. Silahkan isi data terlebih dahulu sebelum
				cetak.</span
			>
		</div>
	{/if}
	<div class="mx-auto flex w-fit flex-col gap-6 print:gap-0" bind:this={printable}>
		<PrintCardPage
			breakAfter
			bind:contentRef={firstCardContent}
			splitTrigger={triggerSplitOnMount}
			{backgroundStyle}
		>
			<header class="pb-4 text-center">
				<h1 class="text-2xl font-bold tracking-wide uppercase">Laporan Kegiatan Keasramaan</h1>
				<h2 class="font-semibold tracking-wide uppercase">(Rapor)</h2>
			</header>

			<RaporIdentityTable
				{murid}
				{rombel}
				{sekolah}
				periode={periode
					? { tahunPelajaran: periode.tahunAjaran, semester: periode.semester }
					: { tahunPelajaran: '', semester: '' }}
				{formatValue}
				{formatUpper}
			/>

			<!-- Keasramaan Assessment Table -->
			{#if keasramaanRows.length > 0}
				<KeasramaanTable
					rows={firstPageRows}
					tableRowAction={tableRow}
					bind:sectionRef={firstTableSection}
					sectionClass="mt-8"
					splitTrigger={triggerSplitOnMount}
					{formatValue}
				/>
			{:else}
				<section
					class="mt-8 rounded-md border-2 border-dashed border-gray-400 bg-gray-50 px-6 py-8 text-center"
				>
					<p class="text-gray-600">Belum ada data kegiatan keasramaan yang dicatat.</p>
				</section>
			{/if}
		</PrintCardPage>

		{#each intermediatePageRows as pageRows, pageIndex (pageIndex)}
			<PrintCardPage breakAfter splitTrigger={triggerSplitOnMount} {backgroundStyle}>
				<KeasramaanTable
					rows={pageRows}
					tableRowAction={tableRow}
					sectionClass="mt-4"
					splitTrigger={triggerSplitOnMount}
					{formatValue}
				/>
			</PrintCardPage>
		{/each}
		<!-- Show footer (attendance & signature) either on same page or separate page -->
		{#if finalPageRows.length > 0}
			<!-- Multi-page: Show on same page if it fits -->
			<PrintCardPage splitTrigger={triggerSplitOnMount} {backgroundStyle}>
				<KeasramaanTable
					rows={finalPageRows}
					tableRowAction={tableRow}
					sectionClass="mt-4"
					splitTrigger={triggerSplitOnMount}
					{formatValue}
				/>

				{#if !shouldRenderFooterOnSeparatePage}
					<!-- Footer fits on last page -->
					<!-- Kehadiran Section -->
					<section class="mt-6 break-inside-avoid print:break-inside-avoid">
						<table class="w-full border">
							<thead>
								<tr>
									<th class="border px-3 py-2 text-left font-bold" colspan="3">KETIDAKHADIRAN</th>
								</tr>
								<tr>
									<th class="w-12 border px-3 py-2 text-center font-semibold">No</th>
									<th class="border px-3 py-2 text-left font-semibold">Alasan Ketidakhadiran</th>
									<th class="w-16 border px-3 py-2 text-center font-semibold">Jumlah</th>
								</tr>
							</thead>
							<tbody>
								<tr>
									<td class="border px-3 py-2 text-center">1</td>
									<td class="border px-3 py-2">Sakit</td>
									<td class="border px-3 py-2 text-center">
										{kehadiran.sakit}
									</td>
								</tr>
								<tr>
									<td class="border px-3 py-2 text-center">2</td>
									<td class="border px-3 py-2">Izin</td>
									<td class="border px-3 py-2 text-center">
										{kehadiran.izin}
									</td>
								</tr>
								<tr>
									<td class="border px-3 py-2 text-center">3</td>
									<td class="border px-3 py-2">Tanpa Keterangan</td>
									<td class="border px-3 py-2 text-center">
										{kehadiran.alfa}
									</td>
								</tr>
							</tbody>
						</table>
					</section>

					<!-- Signatures Section -->
					<section class="mt-8 flex break-inside-avoid flex-col gap-6 print:break-inside-avoid">
						<div class="grid gap-4 md:grid-cols-2 print:grid-cols-2">
							<div class="flex flex-col items-center text-center text-xs print:text-xs">
								<p>Wali Asrama</p>
								<div class="mt-16 font-semibold tracking-wide underline">
									{formatValue(waliAsrama?.nama)}
								</div>
								<div class="mt-1 text-xs">{formatValue(waliAsrama?.nip)}</div>
							</div>
							<div class="relative flex flex-col items-center text-center text-xs print:text-xs">
								{#if ttd}
									<p class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
										{ttd.tempat}, {ttd.tanggal}
									</p>
								{/if}
								<p>Wali Asuh</p>
								<div class="mt-16 font-semibold tracking-wide underline">
									{formatValue(waliAsuh?.nama)}
								</div>
								<div class="mt-1 text-xs">{formatValue(waliAsuh?.nip)}</div>
							</div>
						</div>
						<div class="grid gap-4 md:grid-cols-2 print:grid-cols-2">
							<div class="flex flex-col items-center text-center text-xs print:text-xs">
								<p>Orang Tua/Wali Murid</p>
								<div
									class="mt-20 h-px w-full max-w-[220px] border-b border-dashed"
									aria-hidden="true"
								></div>
							</div>
							<div class="flex flex-col items-center text-center text-xs print:text-xs">
								<p>{kepalaSekolahTitle}</p>
								<div class="mt-16 font-semibold tracking-wide underline">
									{formatValue(kepalaSekolah?.nama)}
								</div>
								<div class="mt-1 text-xs">{formatValue(kepalaSekolah?.nip)}</div>
							</div>
						</div>
					</section>
				{/if}
			</PrintCardPage>
		{:else}
			<!-- Single page: always render footer on same page -->
			<PrintCardPage splitTrigger={triggerSplitOnMount} {backgroundStyle}>
				<!-- Kehadiran Section -->
				<section class="mt-6 break-inside-avoid print:break-inside-avoid">
					<table class="w-full border">
						<thead>
							<tr>
								<th class="border px-3 py-2 text-left font-bold" colspan="3">KETIDAKHADIRAN</th>
							</tr>
							<tr>
								<th class="w-12 border px-3 py-2 text-center font-semibold">No</th>
								<th class="border px-3 py-2 text-left font-semibold">Alasan Ketidakhadiran</th>
								<th class="w-16 border px-3 py-2 text-center font-semibold">Jumlah</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="border px-3 py-2 text-center">1</td>
								<td class="border px-3 py-2">Sakit</td>
								<td class="border px-3 py-2 text-center">
									{kehadiran.sakit}
								</td>
							</tr>
							<tr>
								<td class="border px-3 py-2 text-center">2</td>
								<td class="border px-3 py-2">Izin</td>
								<td class="border px-3 py-2 text-center">
									{kehadiran.izin}
								</td>
							</tr>
							<tr>
								<td class="border px-3 py-2 text-center">3</td>
								<td class="border px-3 py-2">Tanpa Keterangan</td>
								<td class="border px-3 py-2 text-center">
									{kehadiran.alfa}
								</td>
							</tr>
						</tbody>
					</table>
				</section>

				<!-- Signatures Section -->
				<section class="mt-8 flex break-inside-avoid flex-col gap-6 print:break-inside-avoid">
					<div class="grid gap-4 md:grid-cols-2 print:grid-cols-2">
						<div class="flex flex-col items-center text-center text-xs print:text-xs">
							<p>Wali Asrama</p>
							<div class="mt-16 font-semibold tracking-wide underline">
								{formatValue(waliAsrama?.nama)}
							</div>
							<div class="mt-1 text-xs">{formatValue(waliAsrama?.nip)}</div>
						</div>
						<div class="relative flex flex-col items-center text-center text-xs print:text-xs">
							{#if ttd}
								<p class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
									{ttd.tempat}, {ttd.tanggal}
								</p>
							{/if}
							<p>Wali Asuh</p>
							<div class="mt-16 font-semibold tracking-wide underline">
								{formatValue(waliAsuh?.nama)}
							</div>
							<div class="mt-1 text-xs">{formatValue(waliAsuh?.nip)}</div>
						</div>
					</div>
					<div class="grid gap-4 md:grid-cols-2 print:grid-cols-2">
						<div class="flex flex-col items-center text-center text-xs print:text-xs">
							<p>Orang Tua/Wali Murid</p>
							<div
								class="mt-20 h-px w-full max-w-[220px] border-b border-dashed"
								aria-hidden="true"
							></div>
						</div>
						<div class="flex flex-col items-center text-center text-xs print:text-xs">
							<p>{kepalaSekolahTitle}</p>
							<div class="mt-16 font-semibold tracking-wide underline">
								{formatValue(kepalaSekolah?.nama)}
							</div>
							<div class="mt-1 text-xs">{formatValue(kepalaSekolah?.nip)}</div>
						</div>
					</div>
				</section>
			</PrintCardPage>
		{/if}

		<!-- Separate page for footer if it doesn't fit on last page -->
		{#if shouldRenderFooterOnSeparatePage && finalPageRows.length > 0}
			<PrintCardPage splitTrigger={triggerSplitOnMount} {backgroundStyle}>
				<!-- Kehadiran Section -->
				<section class="mt-6 break-inside-avoid print:break-inside-avoid">
					<table class="w-full border">
						<thead>
							<tr>
								<th class="border px-3 py-2 text-left font-bold" colspan="3">KETIDAKHADIRAN</th>
							</tr>
							<tr>
								<th class="w-12 border px-3 py-2 text-center font-semibold">No</th>
								<th class="border px-3 py-2 text-left font-semibold">Alasan Ketidakhadiran</th>
								<th class="w-16 border px-3 py-2 text-center font-semibold">Jumlah</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="border px-3 py-2 text-center">1</td>
								<td class="border px-3 py-2">Sakit</td>
								<td class="border px-3 py-2 text-center">
									{kehadiran.sakit}
								</td>
							</tr>
							<tr>
								<td class="border px-3 py-2 text-center">2</td>
								<td class="border px-3 py-2">Izin</td>
								<td class="border px-3 py-2 text-center">
									{kehadiran.izin}
								</td>
							</tr>
							<tr>
								<td class="border px-3 py-2 text-center">3</td>
								<td class="border px-3 py-2">Tanpa Keterangan</td>
								<td class="border px-3 py-2 text-center">
									{kehadiran.alfa}
								</td>
							</tr>
						</tbody>
					</table>
				</section>

				<!-- Signatures Section -->
				<section class="mt-8 flex break-inside-avoid flex-col gap-6 print:break-inside-avoid">
					<div class="grid gap-4 md:grid-cols-2 print:grid-cols-2">
						<div class="flex flex-col items-center text-center text-xs print:text-xs">
							<p>Wali Asrama</p>
							<div class="mt-16 font-semibold tracking-wide underline">
								{formatValue(waliAsrama?.nama)}
							</div>
							<div class="mt-1 text-xs">{formatValue(waliAsrama?.nip)}</div>
						</div>
						<div class="relative flex flex-col items-center text-center text-xs print:text-xs">
							{#if ttd}
								<p class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
									{ttd.tempat}, {ttd.tanggal}
								</p>
							{/if}
							<p>Wali Asuh</p>
							<div class="mt-16 font-semibold tracking-wide underline">
								{formatValue(waliAsuh?.nama)}
							</div>
							<div class="mt-1 text-xs">{formatValue(waliAsuh?.nip)}</div>
						</div>
					</div>
					<div class="grid gap-4 md:grid-cols-2 print:grid-cols-2">
						<div class="flex flex-col items-center text-center text-xs print:text-xs">
							<p>Orang Tua/Wali Murid</p>
							<div
								class="mt-20 h-px w-full max-w-[220px] border-b border-dashed"
								aria-hidden="true"
							></div>
						</div>
						<div class="flex flex-col items-center text-center text-xs print:text-xs">
							<p>{kepalaSekolahTitle}</p>
							<div class="mt-16 font-semibold tracking-wide underline">
								{formatValue(kepalaSekolah?.nama)}
							</div>
							<div class="mt-1 text-xs">{formatValue(kepalaSekolah?.nip)}</div>
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
						<section bind:this={continuationPrototypeTableSection}>
							<table class="table-compact table w-full">
								<thead>
									<tr class="bg-gray-100">
										<th class="border border-black px-2 py-1">No</th>
										<th class="border border-black px-2 py-1">Indikator</th>
										<th class="border border-black px-2 py-1">Predikat</th>
										<th class="border border-black px-2 py-1">Deskripsi</th>
									</tr>
								</thead>
								<tbody>
									<!-- Test dengan kategori header + indicator row -->
									<tr>
										<td colspan="4" class="border border-black bg-gray-50 px-2 py-1 font-semibold"
											>Kategori Header</td
										>
									</tr>
									<tr>
										<td class="border border-black px-2 py-1">—</td>
										<td class="border border-black px-2 py-1">—</td>
										<td class="border border-black px-2 py-1">—</td>
										<td class="border border-black px-2 py-1">—</td>
									</tr>
								</tbody>
							</table>
						</section>
					</div>
				</div>
			</div>
		</div>

		<!-- Prototype for last page calculation including attendance & signatures -->
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
						<section bind:this={lastPagePrototypeTableSection}>
							<table class="table-compact table w-full">
								<thead>
									<tr class="bg-gray-100">
										<th class="border border-black px-2 py-1">No</th>
										<th class="border border-black px-2 py-1">Indikator</th>
										<th class="border border-black px-2 py-1">Predikat</th>
										<th class="border border-black px-2 py-1">Deskripsi</th>
									</tr>
								</thead>
								<tbody>
									<!-- Test dengan kategori header + indicator row -->
									<tr>
										<td colspan="4" class="border border-black bg-gray-50 px-2 py-1 font-semibold"
											>Kategori Header</td
										>
									</tr>
									<tr>
										<td class="border border-black px-2 py-1">—</td>
										<td class="border border-black px-2 py-1">—</td>
										<td class="border border-black px-2 py-1">—</td>
										<td class="border border-black px-2 py-1">—</td>
									</tr>
								</tbody>
							</table>
						</section>
						<!-- Simulate kehadiran section -->
						<section class="mt-6">
							<table class="w-full border">
								<thead>
									<tr>
										<th class="border px-3 py-2 text-left font-bold" colspan="3">KETIDAKHADIRAN</th>
									</tr>
									<tr>
										<th class="w-12 border px-3 py-2 text-center font-semibold">No</th>
										<th class="border px-3 py-2 text-left font-semibold">Alasan Ketidakhadiran</th>
										<th class="w-16 border px-3 py-2 text-center font-semibold">Jumlah</th>
									</tr>
								</thead>
								<tbody>
									<tr>
										<td class="border px-3 py-2 text-center">1</td>
										<td class="border px-3 py-2">Sakit</td>
										<td class="border px-3 py-2 text-center">0</td>
									</tr>
									<tr>
										<td class="border px-3 py-2 text-center">2</td>
										<td class="border px-3 py-2">Izin</td>
										<td class="border px-3 py-2 text-center">0</td>
									</tr>
									<tr>
										<td class="border px-3 py-2 text-center">3</td>
										<td class="border px-3 py-2">Tanpa Keterangan</td>
										<td class="border px-3 py-2 text-center">0</td>
									</tr>
								</tbody>
							</table>
						</section>
						<!-- Simulate signatures section -->
						<section class="mt-8 flex flex-col gap-6">
							<div class="grid gap-4 md:grid-cols-2 print:grid-cols-2">
								<div class="flex flex-col items-center text-center text-xs print:text-xs">
									<p>Wali Asrama</p>
									<div class="mt-16 font-semibold tracking-wide underline">Name</div>
									<div class="mt-1 text-xs">NIP</div>
								</div>
								<div class="relative flex flex-col items-center text-center text-xs print:text-xs">
									<p class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
										Tempat, Tanggal
									</p>
									<p>Wali Asuh</p>
									<div class="mt-16 font-semibold tracking-wide underline">Name</div>
									<div class="mt-1 text-xs">NIP</div>
								</div>
							</div>
							<div class="grid gap-4 md:grid-cols-2 print:grid-cols-2">
								<div class="flex flex-col items-center text-center text-xs print:text-xs">
									<p>Orang Tua/Wali Murid</p>
									<div
										class="mt-20 h-px w-full max-w-[220px] border-b border-dashed"
										aria-hidden="true"
									></div>
								</div>
								<div class="flex flex-col items-center text-center text-xs print:text-xs">
									<p>{kepalaSekolahTitle}</p>
									<div class="mt-16 font-semibold tracking-wide underline">Name</div>
									<div class="mt-1 text-xs">NIP</div>
								</div>
							</div>
						</section>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	:global(.break-inside-avoid) {
		page-break-inside: avoid;
		break-inside: avoid;
	}

	:global(.print\:break-inside-avoid) {
		page-break-inside: avoid;
		break-inside: avoid;
	}
</style>
