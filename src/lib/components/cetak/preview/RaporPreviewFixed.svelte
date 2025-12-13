<script lang="ts">
	import { onMount } from 'svelte';
	import PrintCardPage from '$lib/components/cetak/rapor/PrintCardPage.svelte';
	import RaporIdentityTable from '$lib/components/cetak/rapor/RaporIdentityTable.svelte';
	import RaporIntrakTable from '$lib/components/cetak/rapor/RaporIntrakTable.svelte';
	import { tailBlockOrder } from '$lib/components/cetak/rapor/tail-blocks';
	import {
		createIntrakRows,
		createTableRows,
		type TableRow
	} from '$lib/components/cetak/rapor/table-rows';
	import {
		paginateRaporWithFixedHeights,
		debugPagination,
		type PaginationResult
	} from '$lib/utils/rapor-pagination-fixed';

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

	const instanceId = Math.random().toString(36).substring(2, 9);
	let printable: HTMLDivElement | null = null;

	const rapor = $derived.by(() => data?.raporData ?? null);
	const sekolah = $derived.by(() => rapor?.sekolah ?? null);
	const derivedMurid = $derived.by(() => rapor?.murid ?? null);
	const murid = $derived.by(() => {
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
		const escapedUrl = logoUrl.replace(/'/g, "\\'");
		return `background-image: url('${escapedUrl}'); background-position: center center; background-repeat: no-repeat; background-size: 45%; background-attachment: local; position: relative;`;
	});

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

	// Pre-calculate pagination with fixed heights
	// This runs ONCE per data change, no reactive re-calculation
	const paginationResult = $derived.by<PaginationResult>(() => {
		const result = paginateRaporWithFixedHeights(tableRows, rapor);

		// Debug log
		if (murid?.nama) {
			debugPagination(result, murid.nama, rapor);
		}

		return result;
	});

	const pages = $derived.by(() => paginationResult.pages);
	const totalPages = $derived.by(() => paginationResult.totalPages);

	// No tableRowElements, no DOM measurement, no retry logic
	// Just simple, predictable pagination based on fixed heights

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

	onMount(() => {
		console.debug(`RaporPreview[${instanceId}] mounted (fixed-height mode)`, {
			muridId: murid?.id ?? null,
			muridName: murid?.nama ?? null,
			totalPages
		});

		return () => {
			console.debug(`RaporPreview[${instanceId}] unmounted`);
		};
	});
</script>

<div
	class="bg-base-300 dark:bg-base-200 card preview w-full rounded-md border border-black/20 shadow-md print:border-none print:bg-transparent print:p-0"
>
	<div class="mx-auto flex w-fit flex-col gap-6 print:gap-0" bind:this={printable}>
		{#each pages as page, pageIndex (pageIndex)}
			{@const isFirstPage = pageIndex === 0}
			{@const isLastPage = pageIndex === pages.length - 1}
			{@const pageNumber = pageIndex + 1}
			{@const breakAfter = !isLastPage || (isLastPage && !page.hasFooter)}

			<PrintCardPage {breakAfter} {backgroundStyle} {murid} {rombel} {pageNumber}>
				{#if isFirstPage}
					<!-- First page: Header + Identity + Table -->
					<header class="pb-4 text-center">
						<h1 class="text-2xl font-bold tracking-wide uppercase">Laporan Hasil Belajar</h1>
						<h2 class="font-semibold tracking-wide uppercase">(Rapor)</h2>
					</header>

					<RaporIdentityTable {murid} {rombel} {sekolah} {periode} {formatValue} {formatUpper} />
				{/if}

				{#if page.rows.length > 0}
					<!-- Table content -->
					<RaporIntrakTable
						rows={page.rows}
						tableRowAction={() => {}}
						{rapor}
						{formatValue}
						{formatHari}
						{waliKelas}
						{kepalaSekolah}
						{ttd}
						sectionClass={isFirstPage ? 'mt-8' : ''}
					/>
				{/if}

				{#if page.hasFooter}
					<!-- Footer/Signatures Section -->
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
		{/each}
	</div>
</div>

<style lang="postcss">
	/* Force consistent row heights via CSS */
	:global(.rapor-preview-fixed) {
		/* Ensure table rows have minimum heights */
	}
</style>
