<script lang="ts">
	import { onMount, tick } from 'svelte';
	import PrintTip from '$lib/components/alerts/print-tip.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import { printElement } from '$lib/utils';

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

	let firstCardContent = $state<HTMLDivElement | null>(null);
	let firstTableSection = $state<HTMLElement | null>(null);
	let continuationPrototypeContent = $state<HTMLDivElement | null>(null);
	let continuationPrototypeTableSection = $state<HTMLElement | null>(null);
	let finalCardContent = $state<HTMLDivElement | null>(null);
	let finalTableSection = $state<HTMLElement | null>(null);
	let finalTailAnchor = $state<HTMLElement | null>(null);

	const intrakurikulerRows = $derived.by(() => {
		const items = rapor?.nilaiIntrakurikuler ?? [];
		return items.map((entry, index) => ({ index, nomor: index + 1, entry }));
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
		rows: { index: number; nomor: number; entry: (typeof intrakurikulerRows)[number]['entry'] }[];
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

	let splitQueued = false;

	async function splitIntrakRows() {
		splitQueued = false;
		await tick();
		const rows = intrakurikulerRows;
		if (rows.length === 0) {
			intrakPages = [];
			return;
		}
		if (
			!firstCardContent ||
			!firstTableSection ||
			!continuationPrototypeContent ||
			!continuationPrototypeTableSection ||
			!finalCardContent ||
			!finalTailAnchor
		) {
			return;
		}

		const firstContentRect = firstCardContent.getBoundingClientRect();
		const firstTableRect = firstTableSection.getBoundingClientRect();
		const firstHeaderHeight = firstTableSection.querySelector('thead')?.getBoundingClientRect().height ?? 0;
		const firstCapacity = Math.max(0, firstContentRect.bottom - firstTableRect.top - firstHeaderHeight);

		const continuationContentRect = continuationPrototypeContent.getBoundingClientRect();
		const continuationTableRect = continuationPrototypeTableSection.getBoundingClientRect();
		const continuationHeaderHeight = continuationPrototypeTableSection
			.querySelector('thead')
			?.getBoundingClientRect().height ?? 0;
		const continuationCapacity = Math.max(
			0,
			continuationContentRect.bottom - continuationTableRect.top - continuationHeaderHeight
		);

		let finalCapacity = continuationCapacity;
		const finalTableRect = finalTableSection?.getBoundingClientRect();
		const finalHeaderHeight = finalTableSection?.querySelector('thead')?.getBoundingClientRect().height ?? continuationHeaderHeight;
		const finalTailRect = finalTailAnchor?.getBoundingClientRect();
		if (finalTableRect && finalTailRect) {
			finalCapacity = Math.max(0, finalTailRect.top - finalTableRect.top - finalHeaderHeight);
		}

		const subsequentCapacity = Math.max(0, Math.min(continuationCapacity, finalCapacity));

		const rowHeights = rows.map((row) => intrakRowElements.get(row.index)?.getBoundingClientRect().height ?? 0);
		if (rowHeights.some((height) => height === 0)) {
			queueSplit();
			return;
		}

		const newPages: IntrakPage[] = [];
		let currentCapacity = firstCapacity;
		let accumulated = 0;
		let pageRows: IntrakPage['rows'] = [];
		const tolerance = 0.5;

		rows.forEach((row, idx) => {
			const rowHeight = rowHeights[idx];
			if (pageRows.length > 0 && accumulated + rowHeight > currentCapacity + tolerance) {
				newPages.push({ rows: pageRows });
				currentCapacity = subsequentCapacity;
				accumulated = 0;
				pageRows = [];
			}
			pageRows.push(row);
			accumulated += rowHeight;
		});

		if (pageRows.length > 0) {
			newPages.push({ rows: pageRows });
		}

		intrakPages = newPages;
	}

	function queueSplit() {
		if (splitQueued) return;
		splitQueued = true;
		queueMicrotask(splitIntrakRows);
	}

	function triggerSplitOnMount(_node: Element) {
		queueSplit();
		return {
			destroy() {
				queueSplit();
			}
		};
	}

	$effect(() => {
		intrakurikulerRows;
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

<div class="flex flex-col gap-4 print:gap-0" bind:this={printable}>
	<div
		class="card bg-base-100 rounded-lg border border-none shadow-md print:shadow-none print:border-none print:bg-transparent"
		style="break-inside: avoid-page; break-after: page;"
	>
		<div class="min-w-[210mm] max-w-[210mm] min-h-[297mm] max-h-[297mm] mx-auto bg-base-100 text-base-content flex flex-col">
			<div
				class="m-[20mm] flex flex-1 flex-col text-[12px]"
				bind:this={firstCardContent}
				use:triggerSplitOnMount
			>
				<header class="text-center">
					<h1 class="text-2xl font-bold uppercase tracking-wide">Laporan Hasil Belajar</h1>
					<h2 class="font-semibold uppercase tracking-wide">(Rapor)</h2>
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
								<td class="font-semibold">{formatValue(murid?.nisn)} / {formatValue(murid?.nis)}</td>
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
								<td class="font-semibold align-top">{formatValue(periode?.tahunPelajaran)}</td>
							</tr>
						</tbody>
					</table>
				</section>

				<section class="mt-8" bind:this={firstTableSection} use:triggerSplitOnMount>
					<table class="w-full border border-base-300">
						<thead class="bg-base-300">
							<tr>
								<th class="border border-base-300 px-3 py-2 text-left">No.</th>
								<th class="border border-base-300 px-3 py-2 text-left">Muatan Pelajaran</th>
								<th class="border border-base-300 px-3 py-2 text-center">Nilai Akhir</th>
								<th class="border border-base-300 px-3 py-2 text-left">Capaian Kompetensi</th>
							</tr>
						</thead>
						<tbody>
							{#if intrakurikulerCount === 0}
								<tr>
									<td class="border border-base-300 px-3 py-2 text-center" colspan="4">Belum ada data intrakurikuler.</td>
								</tr>
							{:else}
								{#each intrakFirstPageRows as row (row.index)}
									<tr use:intrakRow={row.index}>
										<td class="border border-base-300 px-3 py-2 align-top">{row.nomor}</td>
										<td class="border border-base-300 px-3 py-2 align-top">
											<span class="font-semibold">{row.entry.mataPelajaran}</span>
											{#if row.entry.kelompok}
												<div class="text-xs text-base-content/70">{formatValue(row.entry.kelompok)}</div>
											{/if}
										</td>
										<td class="border border-base-300 px-3 py-2 align-top text-center font-semibold">{formatValue(row.entry.nilaiAkhir)}</td>
										<td class="border border-base-300 px-3 py-2 align-top whitespace-pre-line">{formatValue(row.entry.deskripsi)}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</section>
			</div>
		</div>
	</div>

	{#each intrakIntermediatePageRows as pageRows, pageIndex}
		<div
			class="card bg-base-100 rounded-lg border border-none shadow-md print:shadow-none print:border-none print:bg-transparent"
			style="break-inside: avoid-page; break-after: page;"
		>
			<div class="min-w-[210mm] max-w-[210mm] min-h-[297mm] max-h-[297mm] mx-auto bg-base-100 text-base-content flex flex-col">
				<div class="m-[20mm] flex flex-1 flex-col text-[12px]" use:triggerSplitOnMount>
					<header class="text-center">
						<h2 class="text-xl font-semibold uppercase tracking-wide">Muatan Pelajaran (Lanjutan)</h2>
						<p class="text-sm text-base-content/70">Halaman lanjutan #{pageIndex + 2}</p>
					</header>

					<section class="mt-6">
						<table class="w-full border border-base-300">
							<thead class="bg-base-300">
								<tr>
									<th class="border border-base-300 px-3 py-2 text-left">No.</th>
									<th class="border border-base-300 px-3 py-2 text-left">Muatan Pelajaran</th>
									<th class="border border-base-300 px-3 py-2 text-center">Nilai Akhir</th>
									<th class="border border-base-300 px-3 py-2 text-left">Capaian Kompetensi</th>
								</tr>
							</thead>
							<tbody>
								{#each pageRows as row (row.index)}
									<tr use:intrakRow={row.index}>
										<td class="border border-base-300 px-3 py-2 align-top">{row.nomor}</td>
										<td class="border border-base-300 px-3 py-2 align-top">
											<span class="font-semibold">{row.entry.mataPelajaran}</span>
											{#if row.entry.kelompok}
												<div class="text-xs text-base-content/70">{formatValue(row.entry.kelompok)}</div>
											{/if}
										</td>
										<td class="border border-base-300 px-3 py-2 align-top text-center font-semibold">{formatValue(row.entry.nilaiAkhir)}</td>
										<td class="border border-base-300 px-3 py-2 align-top whitespace-pre-line">{formatValue(row.entry.deskripsi)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</section>
				</div>
			</div>
		</div>
	{/each}

	<div
		class="card bg-base-100 rounded-lg border border-none shadow-md print:shadow-none print:border-none print:bg-transparent"
		style="break-inside: avoid-page;"
	>
		<div class="min-w-[210mm] max-w-[210mm] min-h-[297mm] max-h-[297mm] mx-auto bg-base-100 text-base-content flex flex-col">
			<div
				class="m-[20mm] flex flex-1 flex-col text-[12px]"
				bind:this={finalCardContent}
				use:triggerSplitOnMount
			>
				{#if intrakFinalPageRows.length > 0}
					<section bind:this={finalTableSection} use:triggerSplitOnMount>
						<table class="w-full border border-base-300">
							<thead class="bg-base-300">
								<tr>
									<th class="border border-base-300 px-3 py-2 text-left">No.</th>
									<th class="border border-base-300 px-3 py-2 text-left">Muatan Pelajaran</th>
									<th class="border border-base-300 px-3 py-2 text-center">Nilai Akhir</th>
									<th class="border border-base-300 px-3 py-2 text-left">Capaian Kompetensi</th>
								</tr>
							</thead>
							<tbody>
								{#each intrakFinalPageRows as row (row.index)}
									<tr use:intrakRow={row.index}>
										<td class="border border-base-300 px-3 py-2 align-top">{row.nomor}</td>
										<td class="border border-base-300 px-3 py-2 align-top">
											<span class="font-semibold">{row.entry.mataPelajaran}</span>
											{#if row.entry.kelompok}
												<div class="text-xs text-base-content/70">{formatValue(row.entry.kelompok)}</div>
											{/if}
										</td>
										<td class="border border-base-300 px-3 py-2 align-top text-center font-semibold">{formatValue(row.entry.nilaiAkhir)}</td>
										<td class="border border-base-300 px-3 py-2 align-top whitespace-pre-line">{formatValue(row.entry.deskripsi)}</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</section>
				{/if}

				<div bind:this={finalTailAnchor} class="h-0" aria-hidden="true" use:triggerSplitOnMount></div>

				<section class="mt-6" class:mt-8={intrakFinalPageRows.length > 0}>
					<table class="w-full border border-base-300">
						<thead class="bg-base-300">
							<tr>
								<th class="border border-base-300 px-3 py-2 text-left">Kokurikuler</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="border border-base-300 px-3 py-3 whitespace-pre-line">
									{formatValue(rapor?.kokurikuler)}
								</td>
							</tr>
						</tbody>
					</table>
				</section>

				<section class="mt-6">
					<table class="w-full border border-base-300">
						<thead class="bg-base-300">
							<tr>
								<th class="border border-base-300 px-3 py-2 text-left" style="width: 40px;">No.</th>
								<th class="border border-base-300 px-3 py-2 text-left">Ekstrakurikuler</th>
								<th class="border border-base-300 px-3 py-2 text-left">Keterangan</th>
							</tr>
						</thead>
						<tbody>
							{#if (rapor?.ekstrakurikuler?.length ?? 0) === 0}
								<tr>
									<td class="border border-base-300 px-3 py-2 text-center" colspan="3">Belum ada data ekstrakurikuler.</td>
								</tr>
							{:else}
								{#each rapor?.ekstrakurikuler ?? [] as ekskul, index}
									<tr>
										<td class="border border-base-300 px-3 py-2 align-top">{index + 1}</td>
										<td class="border border-base-300 px-3 py-2 align-top">{formatValue(ekskul.nama)}</td>
										<td class="border border-base-300 px-3 py-2 align-top whitespace-pre-line">{formatValue(ekskul.deskripsi)}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</section>

				<section class="mt-8 grid gap-6 print:grid-cols-2 md:grid-cols-2">
					<table class="w-full border border-base-300">
						<thead class="bg-base-300">
							<tr>
								<th class="border border-base-300 px-3 py-2 text-left" colspan="2">Ketidakhadiran</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="border border-base-300 px-3 py-2">Sakit</td>
								<td class="border border-base-300 px-3 py-2 text-center">{formatHari(rapor?.ketidakhadiran?.sakit)}</td>
							</tr>
							<tr>
								<td class="border border-base-300 px-3 py-2">Izin</td>
								<td class="border border-base-300 px-3 py-2 text-center">{formatHari(rapor?.ketidakhadiran?.izin)}</td>
							</tr>
							<tr>
								<td class="border border-base-300 px-3 py-2">Tanpa Keterangan</td>
								<td class="border border-base-300 px-3 py-2 text-center">{formatHari(rapor?.ketidakhadiran?.tanpaKeterangan)}</td>
							</tr>
						</tbody>
					</table>
					<table class="w-full border border-base-300">
						<thead class="bg-base-300">
							<tr>
								<th class="border border-base-300 px-3 py-2 text-left">Catatan Wali Kelas</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="border border-base-300 px-3 py-3 min-h-[80px] whitespace-pre-line">
									{formatValue(rapor?.catatanWali)}
								</td>
							</tr>
						</tbody>
					</table>
				</section>

				<section class="mt-6">
					<table class="w-full border border-base-300">
						<thead class="bg-base-300">
							<tr>
								<th class="border border-base-300 px-3 py-2 text-left">Tanggapan Orang Tua/Wali Murid</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="border border-base-300 px-3 py-4 align-top">
									<div class="min-h-[70px] whitespace-pre-line">
										{rapor?.tanggapanOrangTua?.trim() || ''}
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</section>

				<footer class="pt-12">
					<div class="flex flex-col gap-10">
						<div class="grid gap-8 print:grid-cols-2 md:grid-cols-2">
							<div class="flex flex-col items-center text-center">
								<p>Orang Tua/Wali Murid</p>
								<div
									class="mt-16 h-[1px] w-full max-w-[220px] border-b border-dashed border-base-300"
									aria-hidden="true"
								></div>
								<div class="mt-1 text-sm text-base-content/70">Nama Orang Tua/Wali</div>
							</div>
							<div class="relative flex flex-col items-center text-center">
								<p class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
									{formatValue(ttd?.tempat)}, {formatValue(ttd?.tanggal)}
								</p>
								<p>Wali Kelas</p>
								<div class="mt-16 font-semibold uppercase tracking-wide">{formatUpper(waliKelas?.nama)}</div>
								<div class="mt-1">NIP. {formatValue(waliKelas?.nip)}</div>
							</div>
						</div>
						<div class="text-center">
							<p>Kepala Sekolah</p>
							<div class="mt-16 font-semibold uppercase tracking-wide">{formatUpper(kepalaSekolah?.nama)}</div>
							<div class="mt-1">NIP. {formatValue(kepalaSekolah?.nip)}</div>
						</div>
					</div>
				</footer>
			</div>
		</div>
	</div>

	<div
		class="pointer-events-none"
		style="position: absolute; width: 0; height: 0; overflow: hidden;"
		aria-hidden="true"
	>
		<div class="card bg-base-100 rounded-lg border border-none shadow-md">
			<div class="min-w-[210mm] max-w-[210mm] min-h-[297mm] max-h-[297mm] mx-auto bg-base-100 text-base-content flex flex-col">
				<div class="m-[20mm] flex flex-1 flex-col text-[12px]" bind:this={continuationPrototypeContent}>
					<section class="mt-6" bind:this={continuationPrototypeTableSection} use:triggerSplitOnMount>
						<table class="w-full border border-base-300">
							<thead class="bg-base-300">
								<tr>
									<th class="border border-base-300 px-3 py-2 text-left">No.</th>
									<th class="border border-base-300 px-3 py-2 text-left">Muatan Pelajaran</th>
									<th class="border border-base-300 px-3 py-2 text-center">Nilai Akhir</th>
									<th class="border border-base-300 px-3 py-2 text-left">Capaian Kompetensi</th>
								</tr>
							</thead>
						</table>
					</section>
				</div>
			</div>
		</div>
	</div>
</div>
