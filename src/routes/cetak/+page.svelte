<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/icon.svelte';
	import BiodataPreview from '$lib/components/cetak/preview/BiodataPreview.svelte';
	import CoverPreview from '$lib/components/cetak/preview/CoverPreview.svelte';
	import RaporPreview from '$lib/components/cetak/preview/RaporPreview.svelte';
	import { printElement } from '$lib/utils';
	import { toast } from '$lib/components/toast.svelte';
	import { onDestroy, tick } from 'svelte';

	let { data } = $props();

	type DocumentType = 'cover' | 'biodata' | 'rapor' | 'piagam';
	type PreviewableDocument = Exclude<DocumentType, 'piagam'>;
	type MuridData = {
		id: number;
		nama: string;
		nis?: string | null;
		nisn?: string | null;
	};

	const previewComponents: Record<PreviewableDocument, typeof CoverPreview> = {
		cover: CoverPreview,
		biodata: BiodataPreview,
		rapor: RaporPreview
	};

	const documentOptions: Array<{ value: DocumentType; label: string }> = [
		{ value: 'cover', label: 'Cover' },
		{ value: 'biodata', label: 'Biodata' },
		{ value: 'rapor', label: 'Rapor' },
		{ value: 'piagam', label: 'Piagam' }
	];

	const documentPaths: Record<PreviewableDocument, string> = {
		cover: '/cetak/cover',
		biodata: '/cetak/biodata',
		rapor: '/cetak/rapor'
	};

	const printFailureMessages: Record<PreviewableDocument, string> = {
		cover: 'Elemen cover belum siap untuk dicetak. Coba muat ulang halaman.',
		biodata: 'Elemen biodata belum siap untuk dicetak. Coba muat ulang halaman.',
		rapor: 'Elemen rapor belum siap untuk dicetak. Coba muat ulang halaman.'
	};

	let selectedDocument = $state<DocumentType | ''>('');
	let selectedMuridId = $state('');
	let previewDocument = $state<DocumentType | ''>('');
	let previewMetaTitle = $state('');
	let previewData = $state<any>(null);
	let previewMurid = $state<MuridData | null>(null);
	let previewPrintable = $state<HTMLDivElement | null>(null);
	let previewLoading = $state(false);
	let previewError = $state<string | null>(null);

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
	const selectedMuridIndex = $derived.by(() => {
		if (!selectedMuridId) return -1;
		return daftarMurid.findIndex((murid) => String(murid.id) === selectedMuridId);
	});
	const hasPrevMurid = $derived.by(() => selectedMuridIndex > 0);
	const hasNextMurid = $derived.by(
		() => selectedMuridIndex >= 0 && selectedMuridIndex < daftarMurid.length - 1
	);
	const canNavigateMurid = $derived.by(() => {
		if (!selectedDocument || selectedDocument === 'piagam') return false;
		if (!hasMurid) return false;
		return selectedMuridIndex >= 0;
	});
	const isPreviewMatchingSelection = $derived.by(
		() =>
			Boolean(
				previewDocument &&
				previewDocument !== 'piagam' &&
				selectedDocument &&
				selectedDocument === previewDocument
			)
	);

	$effect(() => {
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

	const previewDisabled = $derived.by(
		() => !selectedDocument || selectedDocument === 'piagam' || !hasMurid || !selectedMurid
	);
	const previewButtonTitle = $derived.by(() => {
		if (!selectedDocument) return 'Pilih dokumen yang ingin dipreview terlebih dahulu';
		if (selectedDocument === 'piagam') return 'Preview piagam belum tersedia';
		if (!hasMurid) return 'Tidak ada murid yang dapat dipreview untuk kelas ini';
		if (!selectedMurid) return 'Pilih murid yang ingin dipreview terlebih dahulu';
		return `Preview ${selectedDocumentEntry?.label ?? 'dokumen'} untuk ${selectedMurid.nama}`;
	});

	const printDisabled = $derived.by(
		() => !previewDocument || previewDocument === 'piagam' || !previewPrintable
	);
	const printButtonTitle = $derived.by(() => {
		if (!previewDocument || previewDocument === 'piagam') {
			return 'Preview dokumen terlebih dahulu sebelum mencetak';
		}
		if (!previewPrintable) {
			return 'Preview sedang disiapkan untuk dicetak';
		}
		const targetName = previewMurid?.nama ?? 'murid ini';
		return `Cetak ${previewDocumentEntry?.label ?? 'dokumen'} untuk ${targetName}`;
	});

	let previewAbortController: AbortController | null = null;
	let previewContainer = $state<HTMLDivElement | null>(null);
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
		const list = daftarMurid;
		const currentIndex = selectedMuridIndex;
		if (currentIndex < 0) return;
		const offset = direction === 'next' ? 1 : -1;
		const targetIndex = currentIndex + offset;
		if (targetIndex < 0 || targetIndex >= list.length) return;
		const target = list[targetIndex];
		selectedMuridId = String(target.id);
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
		if (documentType === 'piagam') {
			toast('Preview piagam akan tersedia setelah tampilan piagam selesai dibuat.', 'info');
			return;
		}
		if (!hasMurid) {
			toast('Tidak ada murid yang dapat dipreview untuk kelas ini.', 'warning');
			return;
		}
		const murid = selectedMurid;
		if (!murid) {
			toast('Pilih murid yang ingin dipreview.', 'warning');
			return;
		}

		const path = documentPaths[documentType as PreviewableDocument];
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
		} catch (error) {
			if (controller.signal.aborted) {
				return;
			}
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

		const payload = (await response.json()) as any;
		previewDocument = documentType;
		previewData = payload;
		previewMetaTitle =
			(payload.meta && typeof payload.meta === 'object' && 'title' in payload.meta
				? (payload.meta as { title?: string | null }).title ?? ''
				: '') || `${selectedDocumentEntry?.label ?? 'Dokumen'} - ${murid.nama}`;
		previewMurid = murid;
		previewLoading = false;
		previewAbortController = null;

		await tick();
		if (previewContainer) {
			previewContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
	}

	function handlePrintableReady(node: HTMLDivElement | null) {
		previewPrintable = node;
	}

	function handlePrint() {
		const doc = previewDocument;
		if (!doc || doc === 'piagam') {
			toast('Preview dokumen belum tersedia untuk dicetak.', 'warning');
			return;
		}
		const printableNode = previewPrintable;
		if (!printableNode) {
			toast(printFailureMessages[doc as PreviewableDocument], 'warning');
			return;
		}
		const ok = printElement(printableNode, {
			title: previewMetaTitle || previewDocumentEntry?.label || 'Dokumen Rapor',
			pageMargin: '0'
		});
		if (!ok) {
			toast(printFailureMessages[doc as PreviewableDocument], 'warning');
		}
	}

	$effect(() => {
		if (keydownHandler) {
			window.removeEventListener('keydown', keydownHandler);
			keydownHandler = null;
		}
		const doc = previewDocument;
		const printableNode = previewPrintable;
		if (!doc || doc === 'piagam' || !printableNode) {
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
			Cetak Dokumen Rapor
			{#if kelasAktifLabel}
				<span class="mt-2 block text-lg font-semibold text-base-content">
					{kelasAktifLabel}
					{#if activeSemester}
						{' '}- Semester {activeSemester.nama} ({activeSemester.tahunAjaranNama})
					{:else if academicContext?.activeSemesterId}
						{' '}- Semester aktif tidak ditemukan dalam daftar tahun ajaran.
					{:else}
						{' '}- Semester belum disetel di menu Rapor.
					{/if}
				</span>
			{/if}
		</h2>
		<div class="flex items-center gap-2 self-end sm:self-auto">
			<button
				class="btn btn-circle shadow-none"
				type="button"
				onclick={() => navigateMurid('prev')}
				title="Murid sebelumnya"
				aria-label="Murid sebelumnya"
				disabled={!canNavigateMurid || !hasPrevMurid}
			>
				<Icon name="left" />
			</button>
			<button
				class="btn btn-circle shadow-none"
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
		<button
			class="btn shadow-none sm:ml-auto"
			type="button"
			title={previewButtonTitle}
			disabled={previewDisabled}
			onclick={handlePreview}
		>
			<Icon name="eye" />
			Preview
		</button>
		<button
			class="btn btn-outline shadow-none"
			type="button"
			title={printButtonTitle}
			disabled={printDisabled}
			onclick={handlePrint}
		>
			<Icon name="print" />
			Cetak
		</button>
	</div>
	{#if selectedDocument === 'piagam'}
		<p class="text-warning text-sm">
			Preview dan cetak piagam akan tersedia setelah tampilan piagam selesai dibuat.
		</p>
	{/if}

	<div class="mt-4 space-y-2 text-sm">
		{#if hasMurid}
			<p>
				Terdapat <strong>{muridCount}</strong> murid di kelas ini. Preview dan cetak dokumen dilakukan per murid.
			</p>
		{:else}
			<p class="text-warning">
				Belum ada data murid yang bisa dipreview. Tambahkan murid terlebih dahulu pada menu Informasi Umum › Murid.
			</p>
		{/if}
	</div>
</div>

{#if previewLoading}
	<div class="mt-6 flex items-center gap-3 text-sm text-base-content/70">
		<span class="loading loading-spinner loading-sm" aria-hidden="true"></span>
		<span>Menyiapkan preview dokumen…</span>
	</div>
{:else if previewError}
	<div class="alert alert-error mt-6 flex items-center gap-2 text-sm">
		<Icon name="error" />
		<span>{previewError}</span>
	</div>
{:else if previewDocument && previewDocument !== 'piagam' && previewData}
	{@const PreviewComponent = previewComponents[previewDocument as PreviewableDocument]}
	<div class="mt-6" bind:this={previewContainer}>
		<PreviewComponent data={previewData} onPrintableReady={handlePrintableReady} />
	</div>
{/if}
