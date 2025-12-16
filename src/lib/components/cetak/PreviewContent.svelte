<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	type DocumentType = 'cover' | 'biodata' | 'rapor' | 'piagam' | 'keasramaan';

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
		keasramaanData?: NonNullable<App.PageData['keasramaanData']> | null;
	};

	let {
		previewDocument = '',
		previewData = null,
		previewLoading = false,
		previewError = null,
		isBulkMode = false,
		bulkPreviewData = [],
		selectedTemplate = '1',
		bgRefreshKey = 0,
		bulkLoadProgress = null,
		waitingForPrintable = false,
		onPrintableReady,
		onBulkPrintableReady,
		showBgLogo = false
	}: {
		previewDocument: DocumentType | '';
		previewData: PreviewPayload | null;
		previewLoading: boolean;
		previewError: string | null;
		isBulkMode: boolean;
		bulkPreviewData: Array<{ murid: MuridData; data: PreviewPayload }>;
		selectedTemplate: '1' | '2';
		bgRefreshKey: number;
		bulkLoadProgress?: { current: number; total: number } | null;
		waitingForPrintable?: boolean;
		onPrintableReady: (node: HTMLDivElement | null) => void;
		onBulkPrintableReady: (index: number, node: HTMLDivElement | null) => void;
		showBgLogo?: boolean;
	} = $props();
</script>

{#if previewError}
	<div class="alert alert-error mt-6 flex items-center gap-2 text-sm">
		<Icon name="error" />
		<span>{previewError}</span>
	</div>
{:else if previewDocument && previewData}
	<div class="alert alert-info mt-6">
		<Icon name="info" />
		<span>Pilih murid dan klik tombol "Download PDF" untuk mengunduh dokumen.</span>
	</div>
{/if}

<style lang="postcss">
</style>
