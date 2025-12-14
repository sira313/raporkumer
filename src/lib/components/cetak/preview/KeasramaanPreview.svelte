<script lang="ts">
	import { onMount, tick } from 'svelte';
	import PrintCardPage from '$lib/components/cetak/rapor/PrintCardPage.svelte';
	import RaporIdentityTable from '$lib/components/cetak/rapor/RaporIdentityTable.svelte';
	import KeasramaanTable from '$lib/components/cetak/keasramaan/KeasramaanTable.svelte';
	import {
		measureRows,
		detectBoundaryViolations,
		debugBoundaryDetection,
		waitForRender,
		type BoundaryDetectionResult,
		type KeasramaanRowWithOrder
	} from '$lib/utils/keasramaan-boundary-detection';

	type KeasramaanPrintData = NonNullable<App.PageData['keasramaanData']>;

	type ComponentData = {
		keasramaanData?: KeasramaanPrintData | null;
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

	const keasramaan = $derived.by(() => data?.keasramaanData ?? null);
	const sekolah = $derived.by(() => keasramaan?.sekolah ?? null);
	const derivedMurid = $derived.by(() => keasramaan?.murid ?? null);
	const murid = $derived.by(() => {
		if (muridProp) return { ...derivedMurid, id: muridProp.id };
		return derivedMurid;
	});
	const rombel = $derived.by(() => keasramaan?.rombel ?? null);
	const periode = $derived.by(() => keasramaan?.periode ?? null);
	const waliAsrama = $derived.by(() => keasramaan?.waliAsrama ?? null);
	const waliAsuh = $derived.by(() => keasramaan?.waliAsuh ?? null);
	const kepalaSekolah = $derived.by(() => keasramaan?.kepalaSekolah ?? null);
	const ttd = $derived.by(() => keasramaan?.ttd ?? null);
	const kehadiran = $derived.by(() => keasramaan?.kehadiran ?? null);
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

	const keasramaanRows = $derived.by<KeasramaanRowWithOrder[]>(() => {
		const rows = keasramaan?.keasramaanRows ?? [];
		return rows.map((row: KeasramaanRowWithOrder, index: number) => ({ ...row, order: index }));
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
		if (!measurementContainer || isDetecting) {
			return;
		}

		isDetecting = true;
		detectionComplete = false;

		// Jika tidak ada data, langsung selesaikan detection dengan hasil kosong
		if (keasramaanRows.length === 0) {
			boundaryResult = { pages: [], totalPages: 0, measurements: [] };
			detectionComplete = true;
			isDetecting = false;
			console.debug(`[Keasramaan-${instanceId}] No data, skipping detection`);
			return;
		}

		try {
			// Wait for DOM to fully render all rows
			await waitForRender(150);

			// Measure all row positions
			const measurements = measureRows(measurementContainer, keasramaanRows);

			console.debug(
				`[Keasramaan-${instanceId}] Measured ${measurements.length} rows from ${keasramaanRows.length} total rows`
			);

			// Measure actual available space on page 1
			if (measurementContainer && measurements.length > 0) {
				const containerRect = measurementContainer.getBoundingClientRect();
				const firstRow = measurements[0];
				const actualOffsetToFirstRow = firstRow.top - containerRect.top;
				console.debug(
					`[Keasramaan-${instanceId}] Actual offset to first row: ${Math.round(actualOffsetToFirstRow)}px (expected: 360px)`
				);
			}

			// Log ALL measurements for debugging
			if (measurements.length > 0) {
				const totalHeight = measurements.reduce((sum, m) => sum + m.height, 0);
				console.table(
					measurements.map((m) => ({
						order: m.order,
						kategori: m.row.kategoriHeader ?? 'indicator',
						height: Math.round(m.height)
					}))
				);
				console.debug(
					`[Keasramaan-${instanceId}] Total height: ${Math.round(totalHeight)}px | Page 1 capacity: 611px | Page 2+ capacity: 881px`
				);
			}

			if (measurements.length === 0) {
				console.warn(`[Keasramaan-${instanceId}] No measurements found, retrying...`);
				await waitForRender(150);
				const retryMeasurements = measureRows(measurementContainer, keasramaanRows);
				if (retryMeasurements.length === 0) {
					console.error(`[Keasramaan-${instanceId}] Failed to measure rows after retry`);
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
			console.error(`[Keasramaan-${instanceId}] Boundary detection error:`, error);
		} finally {
			isDetecting = false;
		}
	}

	// Trigger detection when keasramaanRows change
	$effect(() => {
		if (measurementContainer) {
			detectionComplete = false;
			// Reset to show measurement phase
			boundaryResult = { pages: [], totalPages: 0, measurements: [] };
			// Trigger detection after render
			tick().then(() => performBoundaryDetection());
		}
	});

	function formatValue(value: string | null | undefined) {
		if (value === null || value === undefined || value === '') return '—';
		return value;
	}

	function formatUpper(value: string | null | undefined) {
		const formatted = formatValue(value);
		return formatted === '—' ? formatted : formatted.toUpperCase();
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
		console.debug(`KeasramaanPreview[${instanceId}] mounted (boundary detection mode)`, {
			muridId: murid?.id ?? null,
			muridName: murid?.nama ?? null
		});

		return () => {
			console.debug(`KeasramaanPreview[${instanceId}] unmounted`);
		};
	});
</script>

<div
	class="bg-base-300 dark:bg-base-200 card preview w-full overflow-x-auto rounded-md border border-black/20 shadow-md print:border-none print:bg-transparent print:p-0"
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

				<div class="mt-8" bind:this={measurementContainer}>
					<KeasramaanTable rows={keasramaanRows} tableRowAction={() => {}} {formatValue} />
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
			{#if keasramaanRows.length === 0}
				<!-- No data state: only show message -->
				<PrintCardPage {backgroundStyle} {murid} {rombel} pageNumber={1}>
					<div
						class="flex items-center justify-center rounded-md border-2 border-dashed border-gray-400 bg-gray-50 px-6 py-16 text-center"
					>
						<p class="text-gray-600">Belum ada data kegiatan keasramaan yang dicatat.</p>
					</div>
				</PrintCardPage>
			{:else}
				<!-- Has data: render paginated pages -->
				{#each pages as page, pageIndex (pageIndex)}
					{@const isFirstPage = pageIndex === 0}
					{@const isLastPage = pageIndex === pages.length - 1}
					{@const pageNumber = pageIndex + 1}
					{@const breakAfter = !isLastPage}

					<PrintCardPage {backgroundStyle} {murid} {rombel} {pageNumber} {breakAfter}>
						{#if isFirstPage}
							<!-- First page: Header + Identity + Table -->
							<header class="pb-4 text-center">
								<h1 class="text-2xl font-bold tracking-wide uppercase">
									Laporan Kegiatan Keasramaan
								</h1>
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
						{/if}

						{#if page.rows.length > 0}
							<!-- Table content -->
							<KeasramaanTable
								rows={page.rows}
								tableRowAction={() => {}}
								{formatValue}
								sectionClass={isFirstPage ? 'mt-8' : ''}
							/>
						{/if}

						{#if page.hasKehadiran}
							<!-- Kehadiran Section -->
							<section class="mt-6 break-inside-avoid print:break-inside-avoid">
								<table class="w-full border">
									<thead>
										<tr>
											<th class="border px-3 py-2 text-left font-bold" colspan="3"
												>KETIDAKHADIRAN</th
											>
										</tr>
										<tr>
											<th class="w-12 border px-3 py-2 text-center font-semibold">No</th>
											<th class="border px-3 py-2 text-left font-semibold">Alasan Ketidakhadiran</th
											>
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

						{#if page.hasSignature}
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
									<div
										class="relative flex flex-col items-center text-center text-xs print:text-xs"
									>
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
				{/each}
			{/if}
		</div>
	{/if}
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
