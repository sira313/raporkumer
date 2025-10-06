<script lang="ts">
	import { onMount, tick } from 'svelte';
	import PrintTip from '$lib/components/alerts/print-tip.svelte';
	import TailSection from '$lib/components/cetak/rapor/TailSection.svelte';
	import { tailBlockOrder } from '$lib/components/cetak/rapor/tail-blocks';
	import { toast } from '$lib/components/toast.svelte';
	import { printElement } from '$lib/utils';

	const tailContentKeys = tailBlockOrder.filter((key) => key !== 'footer');

	let { data } = $props();
	let printable: HTMLDivElement | null = null;

	const rapor = $derived.by(() => data.raporData ?? null);
	const sekolah = $derived.by(() => rapor?.sekolah ?? null);
	const murid = $derived.by(() => rapor?.murid ?? null);
	const rombel = $derived.by(() => rapor?.rombel ?? null);
	const periode = $derived.by(() => rapor?.periode ?? null);
	const waliKelas = $derived.by(() => rapor?.waliKelas ?? null);
	const kepalaSekolah = $derived.by(() => rapor?.kepalaSekolah ?? null);
	const ttd = $derived.by(() => rapor?.ttd ?? null);
	const printTitle = $derived.by(() => data.meta?.title ?? 'Rapor Murid');

	type IntrakurikulerEntry = NonNullable<RaporPrintData['nilaiIntrakurikuler']>[number];
	type IntrakRow = { index: number; nomor: number; entry: IntrakurikulerEntry };

	let firstCardContent = $state<HTMLDivElement | null>(null);
	let firstTableSection = $state<HTMLElement | null>(null);
	let continuationPrototypeContent = $state<HTMLDivElement | null>(null);
	let continuationPrototypeTableSection = $state<HTMLElement | null>(null);

	const intrakurikulerRows = $derived.by(() => {
		const items: IntrakurikulerEntry[] = rapor?.nilaiIntrakurikuler ?? [];
		return items.map<IntrakRow>((entry, index) => ({ index, nomor: index + 1, entry }));
	});

	const intrakRowElements = new Map<number, HTMLTableRowElement>();
	function intrakRow(node: HTMLTableRowElement, index: number) {
		intrakRowElements.set(index, node);
		let currentIndex = index;
		return {
			update(newIndex: number) {
				if (newIndex === currentIndex) return;
				intrakRowElements.delete(currentIndex);
				currentIndex = newIndex;
				intrakRowElements.set(currentIndex, node);
			},
			destroy() {
				intrakRowElements.delete(currentIndex);
			}
		};
	}

	type IntrakPage = {
		rows: IntrakRow[];
	};

	let intrakPages = $state<IntrakPage[]>([]);
	const intrakurikulerCount = $derived.by(() => intrakurikulerRows.length);
	const intrakFirstPageRows = $derived.by(() => {
		if (intrakPages.length > 0) return intrakPages[0]?.rows ?? [];
		return intrakurikulerRows;
	});
	const intrakIntermediatePageRows = $derived.by(() => {
		if (intrakPages.length <= 1) return [] as IntrakPage['rows'][];
		const start = 1;
		const end = Math.max(1, intrakPages.length - 1);
		return intrakPages.slice(start, end).map((page) => page.rows);
	});
	const intrakFinalPageRows = $derived.by(() => {
		if (intrakPages.length > 1) {
			return intrakPages.at(-1)?.rows ?? [];
		}
		return [] as IntrakPage['rows'];
	});

	const showTailOnFirstPage = $derived.by(() => intrakPages.length <= 1);

	let splitQueued = false;

	function computeTableCapacity(content: HTMLElement, tableSection: HTMLElement) {
		const contentRect = content.getBoundingClientRect();
		const tableRect = tableSection.getBoundingClientRect();
		const headerHeight = tableSection.querySelector('thead')?.getBoundingClientRect().height ?? 0;
		return Math.max(0, contentRect.bottom - tableRect.top - headerHeight);
	}

	async function splitIntrakRows() {
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

		const rows: IntrakRow[] = intrakurikulerRows;
		const firstCapacity = computeTableCapacity(firstCardContent, firstTableSection);
		const continuationCapacity = computeTableCapacity(
			continuationPrototypeContent,
			continuationPrototypeTableSection
		);

		const rowHeights = rows.map(
			(row) => intrakRowElements.get(row.index)?.getBoundingClientRect().height ?? 0
		);
		if (rowHeights.some((height) => height === 0)) {
			queueSplit();
			return;
		}

		const tolerance = 0.5;

		const pages: IntrakPage[] = [];
		const firstLimit = Math.max(0, firstCapacity);
		let cursor = 0;

		function takeRows(capacity: number) {
			const pageRows: IntrakPage['rows'] = [];
			let used = 0;
			while (cursor < rows.length) {
				const rowHeight = rowHeights[cursor];
				if (pageRows.length > 0 && used + rowHeight > capacity + tolerance) {
					break;
				}
				if (pageRows.length === 0 && capacity <= 0) {
					pageRows.push(rows[cursor]);
					cursor += 1;
					break;
				}
				if (pageRows.length === 0 && rowHeight > capacity + tolerance) {
					pageRows.push(rows[cursor]);
					cursor += 1;
					break;
				}
				pageRows.push(rows[cursor]);
				used += rowHeight;
				cursor += 1;
			}
			return pageRows;
		}

		const firstPageRows = takeRows(firstLimit);
		if (firstPageRows.length > 0) {
			pages.push({ rows: firstPageRows });
		}

		while (cursor < rows.length) {
			const pageRows = takeRows(continuationCapacity);
			if (pageRows.length === 0) {
				pageRows.push(rows[cursor]);
				cursor += 1;
			}
			pages.push({ rows: pageRows });
		}

		intrakPages = pages;
	}

	function queueSplit() {
		if (splitQueued) return;
		splitQueued = true;
		queueMicrotask(splitIntrakRows);
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
		if (intrakurikulerRows.length >= 0) {
			queueSplit();
		}
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

	function handlePrint() {
		const ok = printElement(printable, {
			title: printTitle,
			pageMargin: '0'
		});
		if (!ok) {
			toast('Elemen rapor belum siap untuk dicetak. Coba muat ulang halaman.', 'warning');
		}
	}

	onMount(() => {
		function onKeydown(event: KeyboardEvent) {
			if (!(event.ctrlKey || event.metaKey)) return;
			if (event.key.toLowerCase() !== 'p') return;
			event.preventDefault();
			handlePrint();
		}

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

<PrintTip onPrint={handlePrint} buttonLabel="Cetak rapor" />

<div class="flex flex-col gap-4 overflow-visible print:gap-0" bind:this={printable}>
	<div
		class="card bg-base-100 rounded-lg border border-none shadow-md print:break-after-page print:border-none print:bg-transparent print:shadow-none"
		style="break-inside: avoid-page;"
	>
		<div
			class="bg-base-100 text-base-content mx-auto flex max-h-[297mm] min-h-[297mm] max-w-[210mm] min-w-[210mm] flex-col p-[20mm]"
		>
			<div
				class="flex min-h-0 flex-1 flex-col text-[12px]"
				bind:this={firstCardContent}
				use:triggerSplitOnMount
			>
				<header class="text-center">
					<h1 class="text-2xl font-bold tracking-wide uppercase">Laporan Hasil Belajar</h1>
					<h2 class="font-semibold tracking-wide uppercase">(Rapor)</h2>
				</header>

				<section class="mt-6">
					<table class="w-full border-collapse">
						<tbody>
							<tr>
								<td class="align-top" style="width: 170px;">Nama Peserta Didik</td>
								<td class="align-top" style="width: 0.75rem;">:</td>
								<td class="font-semibold uppercase">{formatUpper(murid?.nama)}</td>
								<td class="align-top" style="width: 110px;">Kelas</td>
								<td class="align-top" style="width: 0.75rem;">:</td>
								<td class="font-semibold">{formatValue(rombel?.nama)}</td>
							</tr>
							<tr>
								<td class="align-top">NISN / NIS</td>
								<td class="align-top">:</td>
								<td class="font-semibold">{formatValue(murid?.nisn)} / {formatValue(murid?.nis)}</td
								>
								<td class="align-top">Fase</td>
								<td class="align-top">:</td>
								<td class="font-semibold uppercase">{formatUpper(rombel?.fase)}</td>
							</tr>
							<tr>
								<td class="align-top">Sekolah</td>
								<td class="align-top">:</td>
								<td class="font-semibold uppercase">{formatUpper(sekolah?.nama)}</td>
								<td class="align-top">Semester</td>
								<td class="align-top">:</td>
								<td class="font-semibold">{formatValue(periode?.semester)}</td>
							</tr>
							<tr>
								<td class="align-top">Alamat</td>
								<td class="align-top">:</td>
								<td>{formatValue(sekolah?.alamat)}</td>
								<td class="align-top">Tahun Pelajaran</td>
								<td class="align-top">:</td>
								<td class="align-top font-semibold">{formatValue(periode?.tahunPelajaran)}</td>
							</tr>
						</tbody>
					</table>
				</section>

				<section class="mt-8" bind:this={firstTableSection} use:triggerSplitOnMount>
					<table class="border-base-300 w-full border">
						<thead class="bg-base-300">
							<tr>
								<th class="border-base-300 border px-3 py-2 text-left">No.</th>
								<th class="border-base-300 border px-3 py-2 text-left">Muatan Pelajaran</th>
								<th class="border-base-300 border px-3 py-2 text-center">Nilai Akhir</th>
								<th class="border-base-300 border px-3 py-2 text-left">Capaian Kompetensi</th>
							</tr>
						</thead>
						<tbody>
							{#if intrakurikulerCount === 0}
								<tr>
									<td class="border-base-300 border px-3 py-2 text-center" colspan="4"
										>Belum ada data intrakurikuler.</td
									>
								</tr>
							{:else}
								{#each intrakFirstPageRows as row (row.index)}
									<tr use:intrakRow={row.index}>
										<td class="border-base-300 border px-3 py-2 align-top">{row.nomor}</td>
										<td class="border-base-300 border px-3 py-2 align-top">
											<span class="font-semibold">{row.entry.mataPelajaran}</span>
											{#if row.entry.kelompok}
												<div class="text-base-content/70 text-xs">
													{formatValue(row.entry.kelompok)}
												</div>
											{/if}
										</td>
										<td class="border-base-300 border px-3 py-2 text-center align-top font-semibold"
											>{formatValue(row.entry.nilaiAkhir)}</td
										>
										<td class="border-base-300 border px-3 py-2 align-top whitespace-pre-line"
											>{formatValue(row.entry.deskripsi)}</td
										>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</section>

				{#if showTailOnFirstPage}
					{#each tailContentKeys as tailKey (tailKey)}
						<TailSection
							{tailKey}
							{rapor}
							{formatValue}
							{formatUpper}
							{formatHari}
							{waliKelas}
							{kepalaSekolah}
							{ttd}
						/>
					{/each}

					<TailSection
						tailKey="footer"
						{rapor}
						{formatValue}
						{formatUpper}
						{formatHari}
						{waliKelas}
						{kepalaSekolah}
						{ttd}
					/>
				{/if}
			</div>
		</div>
	</div>

	{#each intrakIntermediatePageRows as pageRows, pageIndex (pageIndex)}
		<div
			class="card bg-base-100 rounded-lg border border-none shadow-md print:break-after-page print:border-none print:bg-transparent print:shadow-none"
			style="break-inside: avoid-page;"
		>
			<div
				class="bg-base-100 text-base-content mx-auto flex max-h-[297mm] min-h-[297mm] max-w-[210mm] min-w-[210mm] flex-col p-[20mm]"
			>
				<div class="flex min-h-0 flex-1 flex-col text-[12px]" use:triggerSplitOnMount>
					<header class="text-center">
						<h2 class="text-xl font-semibold tracking-wide uppercase">
							Muatan Pelajaran (Lanjutan)
						</h2>
						<p class="text-base-content/70 text-sm">Halaman lanjutan #{pageIndex + 2}</p>
					</header>

					<section class="mt-6">
						<table class="border-base-300 w-full border">
							<thead class="bg-base-300">
								<tr>
									<th class="border-base-300 border px-3 py-2 text-left">No.</th>
									<th class="border-base-300 border px-3 py-2 text-left">Muatan Pelajaran</th>
									<th class="border-base-300 border px-3 py-2 text-center">Nilai Akhir</th>
									<th class="border-base-300 border px-3 py-2 text-left">Capaian Kompetensi</th>
								</tr>
							</thead>
							<tbody>
								{#each pageRows as row (row.index)}
									<tr use:intrakRow={row.index}>
										<td class="border-base-300 border px-3 py-2 align-top">{row.nomor}</td>
										<td class="border-base-300 border px-3 py-2 align-top">
											<span class="font-semibold">{row.entry.mataPelajaran}</span>
											{#if row.entry.kelompok}
												<div class="text-base-content/70 text-xs">
													{formatValue(row.entry.kelompok)}
												</div>
											{/if}
										</td>
										<td class="border-base-300 border px-3 py-2 text-center align-top font-semibold"
											>{formatValue(row.entry.nilaiAkhir)}</td
										>
										<td class="border-base-300 border px-3 py-2 align-top whitespace-pre-line"
											>{formatValue(row.entry.deskripsi)}</td
										>
									</tr>
								{/each}
							</tbody>
						</table>
					</section>
				</div>
			</div>
		</div>
	{/each}

	{#if intrakFinalPageRows.length > 0}
		<div
			class="card bg-base-100 rounded-lg border border-none shadow-md print:border-none print:bg-transparent print:shadow-none"
			style="break-inside: avoid-page;"
		>
			<div
				class="bg-base-100 text-base-content mx-auto flex max-h-[297mm] min-h-[297mm] max-w-[210mm] min-w-[210mm] flex-col p-[20mm]"
			>
				<div class="flex min-h-0 flex-1 flex-col text-[12px]" use:triggerSplitOnMount>
					<section use:triggerSplitOnMount>
						<table class="border-base-300 w-full border">
							<thead class="bg-base-300">
								<tr>
									<th class="border-base-300 border px-3 py-2 text-left">No.</th>
									<th class="border-base-300 border px-3 py-2 text-left">Muatan Pelajaran</th>
									<th class="border-base-300 border px-3 py-2 text-center">Nilai Akhir</th>
									<th class="border-base-300 border px-3 py-2 text-left">Capaian Kompetensi</th>
								</tr>
							</thead>
							<tbody>
								{#each intrakFinalPageRows as row (row.index)}
									<tr use:intrakRow={row.index}>
										<td class="border-base-300 border px-3 py-2 align-top">{row.nomor}</td>
										<td class="border-base-300 border px-3 py-2 align-top">
											<span class="font-semibold">{row.entry.mataPelajaran}</span>
											{#if row.entry.kelompok}
												<div class="text-base-content/70 text-xs">
													{formatValue(row.entry.kelompok)}
												</div>
											{/if}
										</td>
										<td class="border-base-300 border px-3 py-2 text-center align-top font-semibold"
											>{formatValue(row.entry.nilaiAkhir)}</td
										>
										<td class="border-base-300 border px-3 py-2 align-top whitespace-pre-line"
											>{formatValue(row.entry.deskripsi)}</td
										>
									</tr>
								{/each}
							</tbody>
						</table>
					</section>

					{#if !showTailOnFirstPage}
						{#each tailContentKeys as tailKey (tailKey)}
							<TailSection
								{tailKey}
								{rapor}
								{formatValue}
								{formatUpper}
								{formatHari}
								{waliKelas}
								{kepalaSekolah}
								{ttd}
							/>
						{/each}

						<TailSection
							tailKey="footer"
							{rapor}
							{formatValue}
							{formatUpper}
							{formatHari}
							{waliKelas}
							{kepalaSekolah}
							{ttd}
						/>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<div
		class="pointer-events-none"
		style="position: fixed; top: -10000px; left: -10000px; width: 210mm; pointer-events: none; opacity: 0;"
		aria-hidden="true"
	>
		<div class="card bg-base-100 rounded-lg border border-none shadow-md">
			<div
				class="bg-base-100 text-base-content mx-auto flex max-h-[297mm] min-h-[297mm] max-w-[210mm] min-w-[210mm] flex-col p-[20mm]"
			>
				<div
					class="flex min-h-0 flex-1 flex-col text-[12px]"
					bind:this={continuationPrototypeContent}
				>
					<section
						class="mt-6"
						bind:this={continuationPrototypeTableSection}
						use:triggerSplitOnMount
					>
						<table class="border-base-300 w-full border">
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
