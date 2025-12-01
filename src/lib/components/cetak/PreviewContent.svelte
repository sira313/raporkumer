<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import BiodataPreview from '$lib/components/cetak/preview/BiodataPreview.svelte';
	import CoverPreview from '$lib/components/cetak/preview/CoverPreview.svelte';
	import RaporPreview from '$lib/components/cetak/preview/RaporPreview.svelte';
	import PiagamPreview from '$lib/components/cetak/preview/PiagamPreview.svelte';
	import PiagamPreview2 from '$lib/components/cetak/preview/PiagamPreview2.svelte';

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

	let {
		previewDocument = '',
		previewData = null,
		previewLoading = false,
		previewError = null,
		isBulkMode = false,
		bulkPreviewData = [],
		selectedDocumentEntry = null,
		selectedTemplate = '1',
		bgRefreshKey = 0,
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
		selectedDocumentEntry: { value: DocumentType; label: string } | null;
		selectedTemplate: '1' | '2';
		bgRefreshKey: number;
		onPrintableReady: (node: HTMLDivElement | null) => void;
		onBulkPrintableReady: (index: number, node: HTMLDivElement | null) => void;
		showBgLogo?: boolean;
	} = $props();

	const previewComponents: Record<DocumentType, typeof CoverPreview> = {
		cover: CoverPreview,
		biodata: BiodataPreview,
		rapor: RaporPreview,
		piagam: PiagamPreview
	};

	function getPiagamPreviewComponent() {
		return selectedTemplate === '2' ? PiagamPreview2 : PiagamPreview;
	}
</script>

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
{:else if previewDocument && isBulkMode && bulkPreviewData.length > 0}
	<div class="mt-6">
		<div class="alert alert-info mb-4 flex items-center gap-2 text-sm print:hidden">
			<Icon name="alert" />
			<span>
				Menampilkan {bulkPreviewData.length} dokumen {selectedDocumentEntry?.label.toLowerCase() ??
					'dokumen'} untuk semua murid. Scroll ke bawah untuk melihat semua dokumen.
			</span>
		</div>
		<div class="flex flex-col gap-6">
			{#each bulkPreviewData as item, index (item.murid.id)}
				<div class="border-base-300 border-b last:border-b-0">
					<div class="text-base-content/70 mb-3 text-sm font-semibold">
						{index + 1}. {item.murid.nama}
						{#if item.murid.nisn}
							— NISN: {item.murid.nisn}
						{:else if item.murid.nis}
							— NIS: {item.murid.nis}
						{/if}
					</div>
					{#if previewDocument === 'piagam'}
						{@const PreviewComponent = getPiagamPreviewComponent()}
						<PreviewComponent
							data={item.data}
							onPrintableReady={(node) => onBulkPrintableReady(index, node)}
							{bgRefreshKey}
							template={selectedTemplate}
						/>
					{:else if previewDocument === 'biodata'}
						{#key showBgLogo}
							<BiodataPreview
								data={item.data}
								onPrintableReady={(node) => onBulkPrintableReady(index, node)}
								{showBgLogo}
							/>
						{/key}
					{:else}
						{@const PreviewComponent = previewComponents[previewDocument as DocumentType]}
						{#key showBgLogo}
							<PreviewComponent
								data={item.data}
								onPrintableReady={(node) => onBulkPrintableReady(index, node)}
								{showBgLogo}
							/>
						{/key}
					{/if}
				</div>
			{/each}
		</div>
	</div>
{:else if previewDocument && previewData}
	{#if previewDocument === 'piagam'}
		{@const PreviewComponent = getPiagamPreviewComponent()}
		<div class="mt-6">
			<PreviewComponent
				data={previewData}
				{onPrintableReady}
				{bgRefreshKey}
				template={selectedTemplate}
			/>
		</div>
	{:else if previewDocument === 'biodata'}
		<div class="mt-6">
			{#key showBgLogo}
				<BiodataPreview data={previewData} {onPrintableReady} {showBgLogo} />
			{/key}
		</div>
	{:else}
		{@const PreviewComponent = previewComponents[previewDocument as DocumentType]}
		<div class="mt-6">
			{#key showBgLogo}
				<PreviewComponent data={previewData} {onPrintableReady} {showBgLogo} />
			{/key}
		</div>
	{/if}
{/if}
