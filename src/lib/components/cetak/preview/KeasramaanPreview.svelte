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
		rows: KeasramaanRow[];
	};

	let tablePages = $state<TablePage[]>([]);

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

		const paginatedRows = paginateRowsByHeight({
			rows: rowsWithOrder,
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
		if (!value) return '—';
		// Don't trim to preserve newlines in deskripsi
		return value.length ? value : '—';
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
		{#if finalPageRows.length > 0}
			<PrintCardPage splitTrigger={triggerSplitOnMount} {backgroundStyle}>
				<KeasramaanTable
					rows={finalPageRows}
					tableRowAction={tableRow}
					sectionClass="mt-4"
					splitTrigger={triggerSplitOnMount}
					{formatValue}
				/>

				<!-- Kehadiran Section on Last Page -->
				{#if kehadiran}
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
				{/if}

				<!-- Signatures Section on Last Page -->
				<section class="mt-8 grid grid-cols-2 gap-4 text-xs print:text-xs">
					<div class="text-center">
						<div class="mt-7 mb-2 font-semibold">Wali Asrama</div>
						<div class="mb-12 h-12"></div>
						<div class="print:border-black">
							{#if waliAsrama}
								<div class="font-semibold">{waliAsrama.nama}</div>
								<div class="mt-1 text-xs">{waliAsrama.nip}</div>
							{/if}
						</div>
					</div>
					<div class="text-center">
						{#if ttd}
							<div class="mb-2 text-xs print:text-xs">
								<div>{ttd.tempat}, {ttd.tanggal}</div>
							</div>
						{/if}
						<div class="mb-2 font-semibold">Wali Kelas</div>
						<div class="mb-12 h-12"></div>
						<div class="print:border-black">
							{#if waliKelas}
								<div class="font-semibold">{waliKelas.nama}</div>
								<div class="mt-1 text-xs">{waliKelas.nip}</div>
							{/if}
						</div>
					</div>
					<div class="text-center">
						<div class="mb-2 font-semibold">Orang Tua / Wali</div>
						<div class="mb-12 h-12"></div>
						<div class="print:border-black">
							<div class="font-semibold">_________________</div>
						</div>
					</div>
					<div class="text-center">
						<div class="mb-2 font-semibold">Kepala Sekolah</div>
						<div class="mb-12 h-12"></div>
						<div class="print:border-black">
							{#if kepalaSekolah}
								<div class="font-semibold">{kepalaSekolah.nama}</div>
								<div class="mt-1 text-xs">{kepalaSekolah.nip}</div>
							{/if}
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
	</div>
</div>
