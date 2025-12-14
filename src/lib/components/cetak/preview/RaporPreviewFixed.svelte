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
	import {
		measureRows,
		detectBoundaryViolations,
		debugBoundaryDetection,
		waitForRender,
		type BoundaryDetectionResult
	} from '$lib/utils/rapor-boundary-detection';

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
	let printable: HTMLDivElement | null = $state(null);
	let measurementContainer: HTMLElement | null = $state(null);
	let isDetecting = $state(false);
	let detectionComplete = $state(false);

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
		return createTableRows(
			intrakurikulerRows,
			activeTailBlocks,
			jenjangVariant,
			rapor?.ekstrakurikuler
		);
	});

	// Boundary detection result
	let boundaryResult = $state<BoundaryDetectionResult>({
		pages: [],
		totalPages: 0,
		measurements: []
	});

	const pages = $derived.by(() => boundaryResult.pages);
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const _totalPages = $derived.by(() => boundaryResult.totalPages);

	/**
	 * Perform boundary detection after initial render
	 */
	async function performBoundaryDetection() {
		if (!measurementContainer || isDetecting || tableRows.length === 0) {
			return;
		}

		isDetecting = true;
		detectionComplete = false;

		try {
			// Wait for DOM to fully render all rows
			await waitForRender(150);

			// Measure all row positions
			const measurements = measureRows(measurementContainer, tableRows);

			console.debug(
				`[${instanceId}] Measured ${measurements.length} rows from ${tableRows.length} total rows`
			);

			// Measure actual available space on page 1
			if (measurementContainer && measurements.length > 0) {
				const containerRect = measurementContainer.getBoundingClientRect();
				const firstRow = measurements[0];
				const actualOffsetToFirstRow = firstRow.top - containerRect.top;
				console.debug(
					`[${instanceId}] Actual offset to first row: ${Math.round(actualOffsetToFirstRow)}px (expected: 360px)`
				);
			}

			// Log ALL measurements for debugging
			if (measurements.length > 0) {
				const totalHeight = measurements.reduce((sum, m) => sum + m.height, 0);
				console.table(
					measurements.map((m) => ({
						order: m.order,
						kind: m.row.kind,
						height: Math.round(m.height)
					}))
				);
				console.debug(
					`[${instanceId}] Total height: ${Math.round(totalHeight)}px | Page 1 capacity: 611px | Page 2+ capacity: 881px`
				);
			}

			if (measurements.length === 0) {
				console.warn(`[${instanceId}] No measurements found, retrying...`);
				await waitForRender(150);
				const retryMeasurements = measureRows(measurementContainer, tableRows);
				if (retryMeasurements.length === 0) {
					console.error(`[${instanceId}] Failed to measure rows after retry`);
					isDetecting = false;
					return;
				}
				boundaryResult = detectBoundaryViolations(retryMeasurements, true);
			} else {
				// Detect boundaries and split pages
				boundaryResult = detectBoundaryViolations(measurements, true);
			}

			// Debug log
			if (murid?.nama) {
				debugBoundaryDetection(boundaryResult, murid.nama);
			}

			detectionComplete = true;
		} catch (error) {
			console.error(`[${instanceId}] Boundary detection error:`, error);
		} finally {
			isDetecting = false;
		}
	}

	// Trigger detection when tableRows change
	$effect(() => {
		if (tableRows.length > 0 && measurementContainer) {
			detectionComplete = false;
			// Reset to show measurement phase
			boundaryResult = { pages: [], totalPages: 0, measurements: [] };
			// Trigger detection after render
			tick().then(() => performBoundaryDetection());
		}
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

	// Callback to get ref after detection complete
	function handlePrintableRef(node: HTMLDivElement) {
		printable = node;
		onPrintableReady?.(printable);
		return {
			destroy() {
				printable = null;
			}
		};
	}

	onMount(() => {
		console.debug(`RaporPreview[${instanceId}] mounted (fixed-height mode)`, {
			muridId: murid?.id ?? null,
			muridName: murid?.nama ?? null
		});

		return () => {
			console.debug(`RaporPreview[${instanceId}] unmounted`);
		};
	});
</script>

<div
	class="bg-base-300 dark:bg-base-200 card preview w-full overflow-x-auto rounded-md border border-black/20 shadow-md print:border-none print:bg-transparent print:p-0"
>
	{#if !detectionComplete}
		<!-- Measurement Phase: render all rows in single container for measurement -->
		<div
			class="pointer-events-none mx-auto opacity-0"
			style="position: absolute; left: -9999px; top: 0; width: 210mm;"
		>
			<div
				class="bg-base-100 text-base-content mx-auto flex flex-col text-[12px]"
				style="width: 210mm; padding: 20mm; box-sizing: border-box;"
			>
				<header class="pb-4 text-center">
					<h1 class="text-2xl font-bold tracking-wide uppercase">Laporan Hasil Belajar</h1>
					<h2 class="font-semibold tracking-wide uppercase">(Rapor)</h2>
				</header>

				<RaporIdentityTable {murid} {rombel} {sekolah} {periode} {formatValue} {formatUpper} />

				<div class="mt-8" bind:this={measurementContainer}>
					<RaporIntrakTable
						rows={tableRows}
						tableRowAction={() => {}}
						{rapor}
						{formatValue}
						{formatHari}
						{waliKelas}
						{kepalaSekolah}
						{ttd}
					/>
				</div>
			</div>
		</div>

		<!-- Loading indicator -->
		<div class="mx-auto flex w-fit items-center justify-center" style="min-height: 297mm;">
			<div class="flex flex-col items-center gap-2">
				<span class="loading loading-spinner loading-md"></span>
				<span class="text-base-content/70 text-sm">Mengukur layout...</span>
			</div>
		</div>
	{:else}
		<!-- Render Phase: display paginated result -->
		<div class="mx-auto flex w-fit flex-col gap-6 print:gap-0" use:handlePrintableRef>
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
	{/if}
</div>

<style lang="postcss">
	/* Force consistent row heights via CSS */
	:global(.rapor-preview-fixed) {
		/* Ensure table rows have minimum heights */
	}
</style>
