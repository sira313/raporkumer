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

	let { data = {}, onPrintableReady = () => {} } = $props<{
		data?: ComponentData;
		onPrintableReady?: (node: HTMLDivElement | null) => void;
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

	let firstCardContent = $state<HTMLDivElement | null>(null);
	let firstTableSection = $state<HTMLElement | null>(null);
	let continuationPrototypeContent = $state<HTMLDivElement | null>(null);
	let continuationPrototypeTableSection = $state<HTMLElement | null>(null);

	const intrakurikulerRows = $derived.by(() => {
		const items = rapor?.nilaiIntrakurikuler ?? [];
		return createIntrakRows(items);
	});

	const tableRows = $derived.by<TableRow[]>(() => {
		return createTableRows(intrakurikulerRows, tailBlockOrder);
	});

	const tableRowElements = new Map<number, HTMLTableRowElement>();
	function tableRow(node: HTMLTableRowElement, order: number) {
		tableRowElements.set(order, node);
		let currentOrder = order;
		return {
			update(newOrder: number) {
				if (newOrder === currentOrder) return;
				tableRowElements.delete(currentOrder);
				currentOrder = newOrder;
				tableRowElements.set(currentOrder, node);
			},
			destroy() {
				tableRowElements.delete(currentOrder);
			}
		};
	}

	type TablePage = {
		rows: TableRow[];
	};

	let tablePages = $state<TablePage[]>([]);
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

	let splitQueued = false;

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
			!continuationPrototypeTableSection
		) {
			return;
		}

		const rows: TableRow[] = tableRows;
		const firstCapacity = computeTableCapacity(firstCardContent, firstTableSection);
		const continuationCapacity = computeTableCapacity(
			continuationPrototypeContent,
			continuationPrototypeTableSection
		);

		const rowHeights = rows.map(
			(row) => tableRowElements.get(row.order)?.getBoundingClientRect().height ?? 0
		);
		if (rowHeights.some((height) => height === 0)) {
			queueSplit();
			return;
		}

		const tolerance = 0.5;

		const paginatedRows = paginateRowsByHeight({
			rows,
			rowHeights,
			firstPageCapacity: firstCapacity,
			continuationPageCapacity: continuationCapacity,
			tolerance
		});

		tablePages = paginatedRows.map((pageRows) => ({ rows: pageRows }));
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
	class="bg-base-300 dark:bg-base-200 card w-full overflow-x-auto rounded-md border border-black/20 shadow-md print:border-none print:bg-transparent print:p-0 preview"
>
	<div class="mx-auto flex w-fit flex-col gap-6 print:gap-0" bind:this={printable}>
		<PrintCardPage breakAfter bind:contentRef={firstCardContent} splitTrigger={triggerSplitOnMount}>
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
			<PrintCardPage breakAfter splitTrigger={triggerSplitOnMount}>
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

		{#if finalPageRows.length > 0}
			<PrintCardPage splitTrigger={triggerSplitOnMount}>
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
							<table class="border-base-300 w-full border-collapse" data-intrak-table="true">
								<thead class="bg-base-300">
									<tr>
										<th class="border-base-300 border px-3 py-2 text-left">No.</th>
										<th class="border-base-300 border px-3 py-2 text-left">Muatan Pelajaran</th>
										<th class="border-base-300 border px-3 py-2 text-center">Nilai Akhir</th>
										<th class="border-base-300 border px-3 py-2 text-left">Capaian Kompetensi</th>
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
