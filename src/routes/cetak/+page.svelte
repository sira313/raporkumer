<script lang="ts">
	// preview parameter building uses SvelteURLSearchParams; no file-level ESLint disables needed
	import { page } from '$app/state';
	import SvelteURLSearchParams from '$lib/svelte-helpers/url-search-params';
	import PreviewHeader from '$lib/components/cetak/PreviewHeader.svelte';
	import DocumentMuridSelector from '$lib/components/cetak/DocumentMuridSelector.svelte';
	import PreviewFooter from '$lib/components/cetak/PreviewFooter.svelte';
	import PreviewContent from '$lib/components/cetak/PreviewContent.svelte';
	import { printElement } from '$lib/utils';
	import { toast } from '$lib/components/toast.svelte';
	import { onDestroy, tick, onMount } from 'svelte';

	let { data } = $props();

	type DocumentType = 'cover' | 'biodata' | 'rapor' | 'piagam';
	type MuridData = {
		id: number;
		nama: string;
		nis?: string | null;
		nisn?: string | null;
	};
	type PreviewPayload = {
		meta?: { title?: string | null } | null;
		coverData?: NonNullable<App.PageData['coverData']> | null;
		biodataData?: NonNullable<App.PageData['biodataData']> | null;
		raporData?: NonNullable<App.PageData['raporData']> | null;
		piagamData?: NonNullable<App.PageData['piagamData']> | null;
	};

	const documentOptions: Array<{ value: DocumentType; label: string }> = [
		{ value: 'cover', label: 'Cover' },
		{ value: 'biodata', label: 'Biodata' },
		{ value: 'rapor', label: 'Rapor' },
		{ value: 'piagam', label: 'Piagam' }
	];

	const documentPaths: Record<DocumentType, string> = {
		cover: '/cetak/cover',
		biodata: '/cetak/biodata',
		rapor: '/cetak/rapor',
		piagam: '/cetak/piagam'
	};

	const printFailureMessages: Record<DocumentType, string> = {
		cover: 'Elemen cover belum siap untuk dicetak. Coba muat ulang halaman.',
		biodata: 'Elemen biodata belum siap untuk dicetak. Coba muat ulang halaman.',
		rapor: 'Elemen rapor belum siap untuk dicetak. Coba muat ulang halaman.',
		piagam: 'Elemen piagam belum siap untuk dicetak. Coba muat ulang halaman.'
	};

	function isPreviewableDocument(value: DocumentType | ''): value is DocumentType {
		return value === 'cover' || value === 'biodata' || value === 'rapor' || value === 'piagam';
	}

	let selectedDocument = $state<DocumentType | ''>('');
	let selectedMuridId = $state('');
	let selectedTemplate = $state<'1' | '2'>('1');
	let previewDocument = $state<DocumentType | ''>('');
	let previewMetaTitle = $state('');
	let previewData = $state<PreviewPayload | null>(null);
	let previewMurid = $state<MuridData | null>(null);
	let previewPrintable = $state<HTMLDivElement | null>(null);
	let previewLoading = $state(false);
	let previewError = $state<string | null>(null);

	// show full TP listing: 'compact' | 'full' | 'full-desc'
	let fullTP = $state<'compact' | 'full' | 'full-desc'>('compact');

	// Kriteria intrakurikuler (defaults per spec)

	let kritCukup = $state<number>(85);
	let kritBaik = $state<number>(95);

	// Load persisted criteria from localStorage (if available)
	// Load persisted criteria from server (if available). Falls back to defaults.
	onMount(async () => {
		try {
			const res = await fetch('/api/sekolah/rapor-kriteria');
			if (res.ok) {
				const json = await res.json();
				const lc = json?.cukup;
				const lb = json?.baik;
				if (lc !== undefined && !Number.isNaN(Number(lc))) kritCukup = Number(lc);
				if (lb !== undefined && !Number.isNaN(Number(lb))) kritBaik = Number(lb);
			}
		} catch {
			// ignore network errors — keep defaults
		}
	});

	// bulk print state
	let isBulkMode = $state(false);
	let bulkPreviewData = $state<Array<{ murid: MuridData; data: PreviewPayload }>>([]);
	let bulkPrintableNodes = $state<HTMLDivElement[]>([]);
	let waitingForPrintable = $state(false);

	// increment this to bust background cache after upload
	let bgRefreshKey = $state<number>(0);

	const academicContext = $derived(data.academicContext ?? null);

	const kelasAktif = $derived(page.data.kelasAktif ?? null);
	const kelasAktifLabel = $derived.by(() => {
		if (!kelasAktif) return null;
		return kelasAktif.fase ? `${kelasAktif.nama} - ${kelasAktif.fase}` : kelasAktif.nama;
	});

	const piagamRankingOptions = $derived(data.piagamRankingOptions ?? []);
	const hasPiagamRankingOptions = $derived.by(() => piagamRankingOptions.length > 0);
	const daftarMurid = $derived(data.daftarMurid ?? []);
	const muridCount = $derived.by(() => daftarMurid.length);
	const hasMurid = $derived.by(() => muridCount > 0);
	const selectedMurid = $derived.by<MuridData | null>(() => {
		const murid = daftarMurid.find((item) => String(item.id) === selectedMuridId);
		return murid
			? {
					id: murid.id,
					nama: murid.nama,
					nis: murid.nis,
					nisn: murid.nisn
				}
			: null;
	});
	const isPiagamSelected = $derived.by(() => selectedDocument === 'piagam');
	const navigationMuridIds = $derived.by(() => {
		if (isPiagamSelected) {
			return piagamRankingOptions.map((option) => String(option.muridId));
		}
		return daftarMurid.map((murid) => String(murid.id));
	});
	const selectedMuridIndex = $derived.by(() => {
		if (!selectedMuridId) return -1;
		return navigationMuridIds.findIndex((id) => id === selectedMuridId);
	});
	const hasPrevMurid = $derived.by(() => selectedMuridIndex > 0);
	const hasNextMurid = $derived.by(
		() => selectedMuridIndex >= 0 && selectedMuridIndex < navigationMuridIds.length - 1
	);
	const hasSelectionOptions = $derived.by(() =>
		isPiagamSelected ? hasPiagamRankingOptions : hasMurid
	);
	const canNavigateMurid = $derived.by(() => {
		if (!selectedDocument) return false;
		if (!hasSelectionOptions) return false;
		return selectedMuridIndex >= 0 && navigationMuridIds.length > 0;
	});
	const isPreviewMatchingSelection = $derived.by(() =>
		Boolean(previewDocument && selectedDocument && selectedDocument === previewDocument)
	);

	$effect(() => {
		if (isPiagamSelected) {
			const rankingOptions = piagamRankingOptions;
			if (!rankingOptions.length) {
				if (selectedMuridId) {
					selectedMuridId = '';
				}
				return;
			}
			if (
				selectedMuridId &&
				!rankingOptions.some((option) => String(option.muridId) === selectedMuridId)
			) {
				selectedMuridId = '';
			}
			return;
		}

		const list = daftarMurid;
		if (!list.length) {
			if (selectedMuridId) {
				selectedMuridId = '';
			}
			return;
		}
		if (selectedMuridId && !list.some((murid) => String(murid.id) === selectedMuridId)) {
			selectedMuridId = '';
		}
	});

	const selectedDocumentEntry = $derived.by(
		() => documentOptions.find((option) => option.value === selectedDocument) ?? null
	);
	const previewDocumentEntry = $derived.by(
		() => documentOptions.find((option) => option.value === previewDocument) ?? null
	);
	const headingDocumentLabel = $derived.by(() => {
		if (previewDocumentEntry?.label) return previewDocumentEntry.label;
		if (selectedDocumentEntry?.label) return selectedDocumentEntry.label;
		return 'Dokumen';
	});
	const headingMuridName = $derived.by(() => {
		if (previewMurid?.nama) return previewMurid.nama;
		if (selectedMurid?.nama) return selectedMurid.nama;
		return '';
	});
	const headingTitle = $derived.by(() => {
		const parts: string[] = ['Cetak'];
		const docLabel = headingDocumentLabel.trim();
		if (docLabel) parts.push(docLabel);
		const muridLabel = headingMuridName.trim();
		if (muridLabel) parts.push(muridLabel);
		return parts.join(' - ');
	});

	const previewDisabled = $derived.by(
		() => !selectedDocument || !hasSelectionOptions || !selectedMurid
	);
	const previewButtonTitle = $derived.by(() => {
		if (!selectedDocument) return 'Pilih dokumen yang ingin di-preview terlebih dahulu';
		if (!hasSelectionOptions) {
			return selectedDocument === 'piagam'
				? 'Tidak ada data peringkat yang tersedia untuk piagam di kelas ini'
				: 'Tidak ada murid yang dapat di-preview untuk kelas ini';
		}
		if (!selectedMurid) {
			return selectedDocument === 'piagam'
				? 'Pilih peringkat piagam yang ingin di-preview terlebih dahulu'
				: 'Pilih murid yang ingin di-preview terlebih dahulu';
		}
		return `Preview ${selectedDocumentEntry?.label ?? 'dokumen'} untuk ${selectedMurid.nama}`;
	});

	const isPrintLoading = $derived.by(() => previewLoading || waitingForPrintable);
	const printDisabled = $derived.by(() => !previewDocument || !previewPrintable);
	const printButtonTitle = $derived.by(() => {
		if (!previewDocument) {
			return 'Preview dokumen terlebih dahulu sebelum mencetak';
		}
		if (!previewPrintable) {
			return isBulkMode && bulkPreviewData.length > 0
				? 'Menyiapkan dokumen untuk dicetak, tunggu sebentar...'
				: 'Preview sedang disiapkan untuk dicetak';
		}
		if (isBulkMode) {
			return `Cetak ${bulkPreviewData.length} ${previewDocumentEntry?.label ?? 'dokumen'} untuk semua murid`;
		}
		const targetName = previewMurid?.nama ?? 'murid ini';
		return `Cetak ${previewDocumentEntry?.label ?? 'dokumen'} untuk ${targetName}`;
	});

	let previewAbortController: AbortController | null = null;
	let keydownHandler: ((event: KeyboardEvent) => void) | null = null;

	function resetPreviewState() {
		previewDocument = '';
		previewMetaTitle = '';
		previewData = null;
		previewMurid = null;
		previewPrintable = null;
		isBulkMode = false;
		bulkPreviewData = [];
		bulkPrintableNodes = [];
		waitingForPrintable = false;
	}

	async function handlePreview() {
		const documentType = selectedDocument;
		if (!documentType) {
			toast('Pilih dokumen yang ingin di-preview terlebih dahulu.', 'warning');
			return;
		}
		if (!isPreviewableDocument(documentType)) {
			return;
		}
		if (!hasSelectionOptions) {
			const message =
				documentType === 'piagam'
					? 'Tidak ada data peringkat piagam yang dapat di-preview untuk kelas ini.'
					: 'Tidak ada murid yang dapat di-preview untuk kelas ini.';
			toast(message, 'warning');
			return;
		}
		const murid = selectedMurid;
		if (!murid) {
			const message =
				documentType === 'piagam'
					? 'Pilih peringkat piagam yang ingin di-preview.'
					: 'Pilih murid yang ingin di-preview.';
			toast(message, 'warning');
			return;
		}

		const path = documentPaths[documentType];
		const params = new SvelteURLSearchParams({ murid_id: String(murid.id) });
		if (data.kelasId) {
			params.set('kelas_id', data.kelasId);
		}
		// include intrakurikuler criteria if present
		params.set('krit_cukup', String(kritCukup));
		params.set('krit_baik', String(kritBaik));
		if (fullTP === 'full') params.set('full_tp', '1');
		else if (fullTP === 'full-desc') params.set('full_tp', 'desc');

		if (previewAbortController) {
			previewAbortController.abort();
		}
		const controller = new AbortController();
		previewAbortController = controller;

		previewLoading = true;
		previewError = null;
		resetPreviewState();

		let response: Response;
		try {
			response = await fetch(`${path}.json?${params.toString()}`, {
				signal: controller.signal
			});
		} catch (err) {
			if (controller.signal.aborted) {
				return;
			}
			console.error(err);
			previewLoading = false;
			previewAbortController = null;
			previewError = 'Gagal memuat preview dokumen. Periksa koneksi lalu coba lagi.';
			toast('Gagal memuat preview dokumen. Periksa koneksi lalu coba lagi.', 'error');
			return;
		}

		if (controller.signal.aborted) {
			return;
		}

		if (!response.ok) {
			previewLoading = false;
			previewAbortController = null;
			previewError = 'Server tidak dapat menyiapkan preview dokumen. Coba lagi nanti.';
			toast('Server tidak dapat menyiapkan preview dokumen. Coba lagi nanti.', 'error');
			return;
		}

		const payload = (await response.json()) as PreviewPayload;
		previewDocument = documentType;
		previewData = payload;
		previewMetaTitle =
			(payload.meta && typeof payload.meta === 'object' && 'title' in payload.meta
				? ((payload.meta as { title?: string | null }).title ?? '')
				: '') || `${selectedDocumentEntry?.label ?? 'Dokumen'} - ${murid.nama}`;
		previewMurid = murid;
		previewLoading = false;
		previewAbortController = null;

		await tick();
	}

	async function navigateMurid(direction: 'prev' | 'next') {
		if (!canNavigateMurid) return;
		const list = navigationMuridIds;
		const currentIndex = selectedMuridIndex;
		if (currentIndex < 0) return;
		const offset = direction === 'next' ? 1 : -1;
		const targetIndex = currentIndex + offset;
		if (targetIndex < 0 || targetIndex >= list.length) return;
		const targetId = list[targetIndex];
		selectedMuridId = targetId;
		await tick();
		if (isPreviewMatchingSelection) {
			await handlePreview();
		}
	}

	async function handleBulkPreview() {
		const documentType = selectedDocument;
		if (!documentType) {
			toast('Pilih dokumen yang ingin di-preview terlebih dahulu.', 'warning');
			return;
		}
		if (!isPreviewableDocument(documentType)) {
			return;
		}

		// untuk piagam gunakan ranking options, untuk lainnya gunakan semua murid
		const muridList = isPiagamSelected
			? piagamRankingOptions.map((option) => ({
					id: option.muridId,
					nama: option.nama,
					nis: null,
					nisn: null
				}))
			: daftarMurid;

		if (!muridList.length) {
			const message = isPiagamSelected
				? 'Tidak ada data peringkat piagam yang dapat di-preview untuk kelas ini.'
				: 'Tidak ada murid yang dapat di-preview untuk kelas ini.';
			toast(message, 'warning');
			return;
		}

		const path = documentPaths[documentType];

		if (previewAbortController) {
			previewAbortController.abort();
		}
		const controller = new AbortController();
		previewAbortController = controller;

		previewLoading = true;
		previewError = null;
		resetPreviewState();

		const allData: Array<{ murid: MuridData; data: PreviewPayload }> = [];

		for (let i = 0; i < muridList.length; i++) {
			const murid = muridList[i];
			const params = new SvelteURLSearchParams({ murid_id: String(murid.id) });
			if (data.kelasId) {
				params.set('kelas_id', data.kelasId);
			}
			// include intrakurikuler criteria for bulk requests as well
			params.set('krit_cukup', String(kritCukup));
			params.set('krit_baik', String(kritBaik));
			if (fullTP === 'full') params.set('full_tp', '1');
			else if (fullTP === 'full-desc') params.set('full_tp', 'desc');

			try {
				const response = await fetch(`${path}.json?${params.toString()}`, {
					signal: controller.signal
				});

				if (controller.signal.aborted) {
					return;
				}

				if (!response.ok) {
					console.error(`Gagal memuat data untuk ${murid.nama}`);
					continue;
				}

				const payload = (await response.json()) as PreviewPayload;
				allData.push({ murid, data: payload });
			} catch (err) {
				if (controller.signal.aborted) {
					return;
				}
				console.error(`Error loading data for ${murid.nama}:`, err);
			}
		}

		if (!allData.length) {
			previewLoading = false;
			previewAbortController = null;
			previewError = 'Tidak ada data yang berhasil dimuat untuk murid manapun.';
			toast('Tidak ada data yang berhasil dimuat untuk murid manapun.', 'error');
			return;
		}

		isBulkMode = true;
		bulkPreviewData = allData;
		previewDocument = documentType;
		previewMetaTitle = `${selectedDocumentEntry?.label ?? 'Dokumen'} - Semua Murid`;
		previewLoading = false;
		waitingForPrintable = true;
		previewAbortController = null;

		await tick();
	}

	function handlePrintableReady(node: HTMLDivElement | null) {
		previewPrintable = node;
	}

	function handleBulkPrintableReady(index: number, node: HTMLDivElement | null) {
		if (node) {
			bulkPrintableNodes[index] = node;
		}
	}

	// Watch for all bulk printable nodes to be ready
	$effect(() => {
		if (!isBulkMode || bulkPreviewData.length === 0) {
			return;
		}

		const nodes = bulkPrintableNodes;
		const expectedCount = bulkPreviewData.length;
		const readyCount = nodes.filter(Boolean).length;

		if (readyCount === expectedCount) {
			// All nodes are ready, but for rapor we need to wait for pagination
			// Rapor needs more time because it dynamically splits tables across pages
			const isRapor = previewDocument === 'rapor';
			const delay = isRapor ? 1500 : 300;

			const timeoutId = setTimeout(() => {
				const wrapper = document.createElement('div');
				nodes.forEach((n) => {
					if (n) {
						const clone = n.cloneNode(true) as HTMLDivElement;
						wrapper.appendChild(clone);
					}
				});
				previewPrintable = wrapper;
				waitingForPrintable = false;
			}, delay);

			return () => clearTimeout(timeoutId);
		}
	});

	function handlePrint() {
		const doc = previewDocument;
		if (!doc) {
			toast('Preview dokumen belum tersedia untuk dicetak.', 'warning');
			return;
		}
		if (!isPreviewableDocument(doc)) {
			return;
		}
		const printableNode = previewPrintable;
		if (!printableNode) {
			toast(printFailureMessages[doc], 'warning');
			return;
		}
		const landscape = doc === 'piagam';
		const ok = printElement(printableNode, {
			title: previewMetaTitle || previewDocumentEntry?.label || 'Dokumen Rapor',
			pageMargin: '0',
			pageWidth: landscape ? '297mm' : '210mm',
			pageHeight: landscape ? '210mm' : '297mm'
		});
		if (!ok) {
			toast(printFailureMessages[doc], 'warning');
		}
	}

	async function handleBgRefresh() {
		bgRefreshKey = Date.now();
		if (previewDocument === 'piagam') await handlePreview();
	}

	$effect(() => {
		if (keydownHandler) {
			window.removeEventListener('keydown', keydownHandler);
			keydownHandler = null;
		}
		const doc = previewDocument;
		const printableNode = previewPrintable;
		if (!doc || !printableNode) {
			return;
		}
		const handler = (event: KeyboardEvent) => {
			if (!(event.ctrlKey || event.metaKey)) return;
			if (event.key.toLowerCase() !== 'p') return;
			event.preventDefault();
			handlePrint();
		};
		keydownHandler = handler;
		window.addEventListener('keydown', handler);
	});

	onDestroy(() => {
		if (keydownHandler) {
			window.removeEventListener('keydown', keydownHandler);
			keydownHandler = null;
		}
		if (previewAbortController) {
			previewAbortController.abort();
			previewAbortController = null;
		}
	});
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<PreviewHeader
		{headingTitle}
		{kelasAktifLabel}
		{academicContext}
		{canNavigateMurid}
		{hasPrevMurid}
		{hasNextMurid}
		onNavigatePrev={() => navigateMurid('prev')}
		onNavigateNext={() => navigateMurid('next')}
	/>

	<DocumentMuridSelector
		bind:selectedDocument
		bind:selectedTemplate
		bind:selectedMuridId
		{daftarMurid}
		{piagamRankingOptions}
		onPreview={handlePreview}
		onBulkPreview={handleBulkPreview}
		onPrint={handlePrint}
		{previewDisabled}
		{printDisabled}
		{previewButtonTitle}
		{printButtonTitle}
		previewLoading={isPrintLoading}
	/>

	<PreviewFooter
		{hasMurid}
		{muridCount}
		{isPiagamSelected}
		{selectedTemplate}
		isRaporSelected={selectedDocument === 'rapor'}
		{kritCukup}
		{kritBaik}
		tpMode={fullTP}
		onSetKriteria={(cukup: number, baik: number) => {
			// optimistic update in UI
			kritCukup = cukup;
			kritBaik = baik;
			// persist to server (requires sekolah_manage permission)
			fetch('/api/sekolah/rapor-kriteria', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cukup: kritCukup, baik: kritBaik })
			})
				.then(async (res) => {
					if (res.ok) {
						toast('Kriteria rapor tersimpan di server.', 'success');
					} else {
						const payload = await res.json().catch(() => ({}));
						console.error('Gagal menyimpan kriteria rapor', payload);
						toast(payload?.error ?? 'Gagal menyimpan kriteria rapor.', 'error');
					}
				})
				.catch((err) => {
					console.error('Error saving kriteria rapor', err);
					toast('Gagal menyimpan kriteria rapor (jaringan).', 'error');
				});
			// If a rapor preview is already shown, refresh it using new criteria
			if (previewDocument === 'rapor') {
				if (isBulkMode) handleBulkPreview();
				else handlePreview();
			}
		}}
		onToggleFullTP={(value: 'compact' | 'full' | 'full-desc') => {
			fullTP = value;
			if (previewDocument === 'rapor') {
				if (isBulkMode) handleBulkPreview();
				else handlePreview();
			}
		}}
		onBgRefresh={handleBgRefresh}
	/>
</div>

<PreviewContent
	{previewDocument}
	{previewData}
	{previewLoading}
	{previewError}
	{isBulkMode}
	{bulkPreviewData}
	{selectedDocumentEntry}
	{selectedTemplate}
	{bgRefreshKey}
	onPrintableReady={handlePrintableReady}
	onBulkPrintableReady={handleBulkPrintableReady}
/>
