<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/icon.svelte';
	import BiodataPreview from '$lib/components/cetak/preview/BiodataPreview.svelte';
	import CoverPreview from '$lib/components/cetak/preview/CoverPreview.svelte';
	import RaporPreview from '$lib/components/cetak/preview/RaporPreview.svelte';
	import PiagamPreview from '$lib/components/cetak/preview/PiagamPreview.svelte';
	import PiagamPreview2 from '$lib/components/cetak/preview/PiagamPreview2.svelte';
	import PiagamBgUploadBody from '$lib/components/PiagamBgUploadBody.svelte';
	import { printElement } from '$lib/utils';
	import { toast } from '$lib/components/toast.svelte';
	import { showModal } from '$lib/components/global-modal.svelte';
	import { deletePiagamBg } from '$lib/components/piagam-bg.client';
	import { onDestroy, tick } from 'svelte';

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

	const previewComponents: Record<DocumentType, typeof CoverPreview> = {
		cover: CoverPreview,
		biodata: BiodataPreview,
		rapor: RaporPreview,
		piagam: PiagamPreview
	};

	// template selection for piagam (1 or 2)
	let selectedTemplate = $state<'1' | '2'>('1');

	function getPiagamPreviewComponent() {
		return selectedTemplate === '2' ? PiagamPreview2 : PiagamPreview;
	}

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

	const averageFormatter = new Intl.NumberFormat('id-ID', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});

	let selectedDocument = $state<DocumentType | ''>('');
	let selectedMuridId = $state('');
	let previewDocument = $state<DocumentType | ''>('');
	let previewMetaTitle = $state('');
	let previewData = $state<PreviewPayload | null>(null);
	let previewMurid = $state<MuridData | null>(null);
	let previewPrintable = $state<HTMLDivElement | null>(null);
	let previewLoading = $state(false);
	let previewError = $state<string | null>(null);

	// increment this to bust background cache after upload
	let bgRefreshKey = $state<number>(0);

	const academicContext = $derived(data.academicContext ?? null);
	const activeSemester = $derived.by(() => {
		const context = academicContext;
		if (!context?.activeSemesterId) return null;
		for (const tahun of context.tahunAjaranList ?? []) {
			const match = tahun.semester.find((item) => item.id === context.activeSemesterId);
			if (match) {
				return {
					...match,
					tahunAjaranNama: tahun.nama
				};
			}
		}
		return null;
	});

	const kelasAktif = $derived(page.data.kelasAktif ?? null);
	const kelasAktifLabel = $derived.by(() => {
		if (!kelasAktif) return null;
		return kelasAktif.fase ? `${kelasAktif.nama} - ${kelasAktif.fase}` : kelasAktif.nama;
	});

	const piagamRankingOptions = $derived(data.piagamRankingOptions ?? []);
	const piagamSelectOptions = $derived.by(() =>
		piagamRankingOptions.map((option) => {
			const formattedAverage =
				option.nilaiRataRata != null ? averageFormatter.format(option.nilaiRataRata) : null;
			const label = formattedAverage
				? `Peringkat ${option.peringkat} — ${option.nama} (${formattedAverage})`
				: `Peringkat ${option.peringkat} — ${option.nama}`;
			return {
				value: String(option.muridId),
				label
			};
		})
	);
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
		if (!selectedDocument) return 'Pilih dokumen yang ingin dipreview terlebih dahulu';
		if (!hasSelectionOptions) {
			return selectedDocument === 'piagam'
				? 'Tidak ada data peringkat yang tersedia untuk piagam di kelas ini'
				: 'Tidak ada murid yang dapat dipreview untuk kelas ini';
		}
		if (!selectedMurid) {
			return selectedDocument === 'piagam'
				? 'Pilih peringkat piagam yang ingin dipreview terlebih dahulu'
				: 'Pilih murid yang ingin dipreview terlebih dahulu';
		}
		return `Preview ${selectedDocumentEntry?.label ?? 'dokumen'} untuk ${selectedMurid.nama}`;
	});

	const printDisabled = $derived.by(() => !previewDocument || !previewPrintable);
	const printButtonTitle = $derived.by(() => {
		if (!previewDocument) {
			return 'Preview dokumen terlebih dahulu sebelum mencetak';
		}
		if (!previewPrintable) {
			return 'Preview sedang disiapkan untuk dicetak';
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

	async function handlePreview() {
		const documentType = selectedDocument;
		if (!documentType) {
			toast('Pilih dokumen yang ingin dipreview terlebih dahulu.', 'warning');
			return;
		}
		if (!isPreviewableDocument(documentType)) {
			return;
		}
		if (!hasSelectionOptions) {
			const message =
				documentType === 'piagam'
					? 'Tidak ada data peringkat piagam yang dapat dipreview untuk kelas ini.'
					: 'Tidak ada murid yang dapat dipreview untuk kelas ini.';
			toast(message, 'warning');
			return;
		}
		const murid = selectedMurid;
		if (!murid) {
			const message =
				documentType === 'piagam'
					? 'Pilih peringkat piagam yang ingin dipreview.'
					: 'Pilih murid yang ingin dipreview.';
			toast(message, 'warning');
			return;
		}

		const path = documentPaths[documentType];
		const params = new URLSearchParams({ murid_id: String(murid.id) });
		if (data.kelasId) {
			params.set('kelas_id', data.kelasId);
		}

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

	function handlePrintableReady(node: HTMLDivElement | null) {
		previewPrintable = node;
	}

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
	<div class="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
		<h2 class="text-xl font-bold">
			{headingTitle}
			{#if kelasAktifLabel}
				<span class="text-base-content mt-2 block text-lg font-semibold">
					{kelasAktifLabel}
					{#if activeSemester}
						- Semester {activeSemester.nama} ({activeSemester.tahunAjaranNama})
					{:else if academicContext?.activeSemesterId}
						- Semester aktif tidak ditemukan dalam daftar tahun ajaran.
					{:else}
						- Semester belum disetel di menu Rapor.
					{/if}
				</span>
			{/if}
		</h2>
		<div class="flex items-center gap-2 self-end sm:self-auto">
			<button
				class="btn btn-circle btn-soft shadow-none"
				type="button"
				onclick={() => navigateMurid('prev')}
				title="Murid sebelumnya"
				aria-label="Murid sebelumnya"
				disabled={!canNavigateMurid || !hasPrevMurid}
			>
				<Icon name="left" />
			</button>
			<button
				class="btn btn-circle btn-soft shadow-none"
				type="button"
				onclick={() => navigateMurid('next')}
				title="Murid berikutnya"
				aria-label="Murid berikutnya"
				disabled={!canNavigateMurid || !hasNextMurid}
			>
				<Icon name="right" />
			</button>
		</div>
	</div>
	<div class="mb-2 flex flex-col gap-2 sm:flex-row">
		<select
			class="select bg-base-200 w-full dark:border-none"
			bind:value={selectedDocument}
			title="Pilih dokumen yang ingin dipreview"
		>
			<option value="">Pilih dokumen…</option>
			{#each documentOptions as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
		{#if isPiagamSelected}
			<select
				class="select bg-base-200 w-full max-w-30 dark:border-none"
				bind:value={selectedTemplate}
				title="Pilih template piagam"
			>
				<option value="1">Template 1</option>
				<option value="2">Template 2</option>
			</select>
		{/if}
		{#if isPiagamSelected}
			<select
				class="select bg-base-200 w-full dark:border-none"
				bind:value={selectedMuridId}
				title="Pilih peringkat piagam yang ingin dipreview"
				disabled={!hasPiagamRankingOptions}
			>
				<option value="">Pilih peringkat…</option>
				{#each piagamSelectOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		{:else}
			<select
				class="select bg-base-200 w-full dark:border-none"
				bind:value={selectedMuridId}
				title="Pilih murid yang ingin dipreview dokumennya"
				disabled={!hasMurid}
			>
				<option value="">Pilih murid…</option>
				{#each daftarMurid as murid (murid.id)}
					<option value={String(murid.id)}>
						{murid.nama}
						{#if murid.nisn}
							— {murid.nisn}
						{:else if murid.nis}
							— {murid.nis}
						{/if}
					</option>
				{/each}
			</select>
		{/if}
		<button
			class="btn btn-soft shadow-none sm:ml-auto"
			type="button"
			title={previewButtonTitle}
			disabled={previewDisabled}
			onclick={handlePreview}
		>
			<Icon name="eye" />
			Preview
		</button>
		<button
			class="btn btn-primary btn-soft shadow-none"
			type="button"
			title={printButtonTitle}
			disabled={printDisabled}
			onclick={handlePrint}
		>
			<Icon name="print" />
			Cetak
		</button>
	</div>
	<div class="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-start sm:justify-between">
		{#if hasMurid}
			<p>
				Terdapat <strong>{muridCount}</strong> murid di kelas ini. Preview dan cetak dokumen dilakukan
				per murid.
			</p>
		{:else}
			<p class="text-warning">
				Belum ada data murid yang bisa dipreview. Tambahkan murid terlebih dahulu pada menu
				Informasi Umum › Murid.
			</p>
		{/if}
		<div class="flex items-center gap-2 self-end sm:self-auto">
			{#if isPiagamSelected}
				<button
					class="btn btn-sm btn-error btn-soft shadow-none"
					type="button"
					title="Hapus background piagam"
					onclick={() => {
						showModal({
							title: 'Hapus Background Piagam',
							body: `Hapus background piagam template ${selectedTemplate}?<br />Ini akan mengembalikan background ke default.`,
							dismissible: true,
							onNegative: {
								label: 'Batal',
								action: ({ close }) => close()
							},
							onPositive: {
								label: 'Hapus',
								icon: 'del',
								action: async ({ close }) => {
									try {
										await deletePiagamBg(selectedTemplate);
										bgRefreshKey = Date.now();
										toast('Background piagam dikembalikan ke default.', 'success');
										if (previewDocument === 'piagam') await handlePreview();
									} catch (err) {
										console.error(err);
										toast('Gagal menghapus background piagam.', 'error');
									} finally {
										close();
									}
								}
							}
						});
					}}
				>
					<Icon name="del" />
					Hapus BG
				</button>

				<button
					class="btn btn-sm shadow-none"
					type="button"
					onclick={() =>
						showModal({
							title: `Unggah Background Piagam — Template ${selectedTemplate}`,
							body: PiagamBgUploadBody,
							bodyProps: {
								template: selectedTemplate,
								onUploaded: async () => {
									bgRefreshKey = Date.now();
									if (previewDocument === 'piagam') await handlePreview();
								}
							},
							dismissible: true
						})}
					title="Ganti background piagam"
				>
					<Icon name="image" />
					Ganti BG
				</button>
			{/if}
		</div>
	</div>
</div>

{#if previewLoading}
	<div class="text-base-content/70 mt-6 flex items-center gap-3 text-sm">
		<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
		<span>Menyiapkan preview dokumen…</span>
	</div>
{:else if previewError}
	<div class="alert alert-error mt-6 flex items-center gap-2 text-sm">
		<Icon name="error" />
		<span>{previewError}</span>
	</div>
{:else if previewDocument && previewData}
	{#if previewDocument === 'piagam'}
		{@const PreviewComponent = getPiagamPreviewComponent()}
		<div class="mt-6">
			<PreviewComponent
				data={previewData}
				onPrintableReady={handlePrintableReady}
				{bgRefreshKey}
				template={selectedTemplate}
			/>
		</div>
	{:else}
		{@const PreviewComponent = previewComponents[previewDocument as DocumentType]}
		<div class="mt-6">
			<PreviewComponent data={previewData} onPrintableReady={handlePrintableReady} />
		</div>
	{/if}
{/if}
