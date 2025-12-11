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
	const kepalaSekolah = $derived.by(() => keasramaan?.kepalaSekolah ?? null);
	const ttd = $derived.by(() => keasramaan?.ttd ?? null);
	const kehadiran = $derived.by(() => keasramaan?.kehadiran ?? null);
	const keasramaanRows = $derived.by(() => keasramaan?.keasramaanRows ?? []);

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
	// Adjust this value based on your actual row heights (estimated ~50px for header + 40px for row)
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

	// Determine if we should display attendance & signature on a separate last page
	// This should be true when:
	// 1. tablePages is still empty (split not yet complete, show in first page)
	// 2. tablePages has content and there are intermediate pages (show in last page)
	const shouldRenderLastPageWithAttendance = $derived.by(() => {
		// If tablePages is empty, we'll show attendance in the single/first page
		if (tablePages.length === 0) return true;
		// If there are multiple pages, show on last page
		if (tablePages.length > 1) return true;
		// If only 1 page of table, also show (it means all rows fit in first page)
		return true;
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
		return Math.max(0, contentRect.bottom - tableRect.top - headerHeight);
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
		const rowHeights = rowsWithOrder.map((row) => {
			const set = tableRowElements.get(row.order);
			if (!set || set.size === 0) return 0;
			let total = 0;
			for (const el of set) {
				total += el.getBoundingClientRect().height;
			}
			return total;
		});

		// Jika ada row height yang belum terukur, coba lagi
		if (rowHeights.some((height) => height === 0)) {
			queueSplit();
			return;
		}

		const tolerance = 0.5;

		let paginatedRows = paginateRowsByHeight({
			rows: rowsWithOrder,
			rowHeights,
			firstPageCapacity: firstCapacity,
			continuationPageCapacity: continuationCapacity,
			tolerance
		});

		// Apply category header pagination logic:
		// Ensure category headers are not left alone at the bottom of a page
		// by moving them to the next page if they don't have indicators following
		paginatedRows = fixCategoryHeaderPlacement(paginatedRows);

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

		tablePages = paginatedRows.map((pageRows) => ({ rows: pageRows }));
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
		pages: KeasramaanRowWithOrder[][]
	): KeasramaanRowWithOrder[][] {
		const result: KeasramaanRowWithOrder[][] = [];
		let i = 0;

		while (i < pages.length) {
			const currentPage = [...pages[i]];

			// Check if last row is a category header
			if (currentPage.length > 0 && currentPage[currentPage.length - 1].kategoriHeader) {
				const lastRow = currentPage.pop()!;

				// If current page still has content, push it
				if (currentPage.length > 0) {
					result.push(currentPage);
				}

				// If there's a next page, prepend header to it
				if (i + 1 < pages.length) {
					const nextPage = pages[i + 1];
					pages[i + 1] = [lastRow, ...nextPage];
				} else {
					// This is the last page, create a new page with just the header
					result.push([lastRow]);
				}
			} else {
				// No header at end, just push the page
				result.push(currentPage);
			}

			i++;
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
			<KeasramaanTable
				rows={firstPageRows}
				tableRowAction={tableRow}
				bind:sectionRef={firstTableSection}
				sectionClass="mt-8"
				splitTrigger={triggerSplitOnMount}
				{formatValue}
			/>
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
		<!-- Always show last page with attendance & signature -->
		{#if shouldRenderLastPageWithAttendance}
			<PrintCardPage splitTrigger={triggerSplitOnMount} {backgroundStyle}>
				<!-- Show final table rows if they exist (multi-page scenario) -->
				{#if finalPageRows.length > 0}
					<KeasramaanTable
						rows={finalPageRows}
						tableRowAction={tableRow}
						sectionClass="mt-4"
						splitTrigger={triggerSplitOnMount}
						{formatValue}
					/>
				{/if}

				<!-- Kehadiran Section on Last Page -->
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

				<!-- Signatures Section on Last Page -->
				<section
					class="mt-8 grid break-inside-avoid grid-cols-2 gap-4 text-xs print:break-inside-avoid print:text-xs"
				>
					<div class="text-center">
						<div class="mt-7 mb-2 font-semibold">Wali Asrama</div>
						<div class="mb-8 h-8"></div>
						<div class="print:border-black">
							<div class="font-semibold">{formatValue(waliAsrama?.nama)}</div>
							<div class="mt-1 text-xs">{formatValue(waliAsrama?.nip)}</div>
						</div>
					</div>
					<div class="text-center">
						{#if ttd}
							<div class="mb-2 text-xs print:text-xs">
								<div>{ttd.tempat}, {ttd.tanggal}</div>
							</div>
						{/if}
						<div class="mb-2 font-semibold">Wali Kelas</div>
						<div class="mb-8 h-8"></div>
						<div class="print:border-black">
							<div class="font-semibold">{formatValue(waliKelas?.nama)}</div>
							<div class="mt-1 text-xs">{formatValue(waliKelas?.nip)}</div>
						</div>
					</div>
					<div class="text-center">
						<div class="mb-2 font-semibold">Orang Tua / Wali</div>
						<div class="mb-8 h-8"></div>
						<div class="print:border-black">
							<div class="font-semibold">_________________</div>
						</div>
					</div>
					<div class="text-center">
						<div class="mb-2 font-semibold">Kepala Sekolah</div>
						<div class="mb-8 h-8"></div>
						<div class="print:border-black">
							<div class="font-semibold">{formatValue(kepalaSekolah?.nama)}</div>
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
						<section class="mt-8 grid grid-cols-2 gap-4 text-xs">
							<div class="text-center">
								<div class="mt-7 mb-2 font-semibold">Wali Asrama</div>
								<div class="mb-8 h-8"></div>
								<div>
									<div class="font-semibold">Name</div>
									<div class="mt-1 text-xs">NIP</div>
								</div>
							</div>
							<div class="text-center">
								<div class="mb-2 text-xs">
									<div>Tempat, Tanggal</div>
								</div>
								<div class="mb-2 font-semibold">Wali Kelas</div>
								<div class="mb-8 h-8"></div>
								<div>
									<div class="font-semibold">Name</div>
									<div class="mt-1 text-xs">NIP</div>
								</div>
							</div>
							<div class="text-center">
								<div class="mb-2 font-semibold">Orang Tua / Wali</div>
								<div class="mb-8 h-8"></div>
								<div>
									<div class="font-semibold">_________________</div>
								</div>
							</div>
							<div class="text-center">
								<div class="mb-2 font-semibold">Kepala Sekolah</div>
								<div class="mb-8 h-8"></div>
								<div>
									<div class="font-semibold">Name</div>
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
