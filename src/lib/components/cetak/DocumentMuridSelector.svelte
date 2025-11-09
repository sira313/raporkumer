<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	type DocumentType = 'cover' | 'biodata' | 'rapor' | 'piagam';

	type MuridData = {
		id: number;
		nama: string;
		nis?: string | null;
		nisn?: string | null;
	};

	type PiagamRankingOption = {
		muridId: number;
		nama: string;
		peringkat: number;
		nilaiRataRata: number | null;
	};

	let {
		selectedDocument = $bindable(''),
		selectedTemplate = $bindable<'1' | '2'>('1'),
		selectedMuridId = $bindable(''),
		daftarMurid = [],
		piagamRankingOptions = [],
		onPreview,
		onBulkPreview,
		onPrint,
		previewDisabled = false,
		printDisabled = false,
		previewButtonTitle = '',
		printButtonTitle = '',
		previewLoading = false
	}: {
		selectedDocument: DocumentType | '';
		selectedTemplate: '1' | '2';
		selectedMuridId: string;
		daftarMurid: MuridData[];
		piagamRankingOptions: PiagamRankingOption[];
		onPreview: () => void;
		onBulkPreview: () => void;
		onPrint: () => void;
		previewDisabled?: boolean;
		printDisabled?: boolean;
		previewButtonTitle?: string;
		printButtonTitle?: string;
		previewLoading?: boolean;
	} = $props();

	const documentOptions: Array<{ value: DocumentType; label: string }> = [
		{ value: 'cover', label: 'Cover' },
		{ value: 'biodata', label: 'Biodata' },
		{ value: 'rapor', label: 'Rapor' },
		{ value: 'piagam', label: 'Piagam' }
	];

	const isPiagamSelected = $derived.by(() => selectedDocument === 'piagam');
	const hasMurid = $derived.by(() => daftarMurid.length > 0);
	const hasPiagamRankingOptions = $derived.by(() => piagamRankingOptions.length > 0);

	const averageFormatter = new Intl.NumberFormat('id-ID', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	});

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

	const hasSelectionOptions = $derived.by(() =>
		isPiagamSelected ? hasPiagamRankingOptions : hasMurid
	);
</script>

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
	<div class="flex flex-row">
		<button
			class="btn btn-soft flex-1 rounded-r-none shadow-none"
			type="button"
			title={previewButtonTitle}
			disabled={previewDisabled}
			onclick={onPreview}
		>
			<Icon name="eye" />
			Preview
		</button>
		<div class="dropdown dropdown-end">
			<div
				tabindex="0"
				role="button"
				class="btn btn-primary rounded-l-none shadow-none"
				class:btn-disabled={!selectedDocument}
				title={selectedDocument ? 'Opsi preview lainnya' : 'Pilih dokumen terlebih dahulu'}
			>
				<Icon name="down" />
			</div>
			<ul
				tabindex="-1"
				class="dropdown-content menu bg-base-100 rounded-box z-1 w-38 p-2 shadow-sm"
			>
				<li>
					<button
						type="button"
						onclick={onBulkPreview}
						disabled={!selectedDocument || !hasSelectionOptions}
					>
						Semua Murid
					</button>
				</li>
			</ul>
		</div>
	</div>
	<button
		class="btn btn-primary shadow-none"
		type="button"
		title={printButtonTitle}
		disabled={printDisabled}
		onclick={onPrint}
	>
		{#if previewLoading}
			<span class="loading loading-spinner loading-sm"></span>
		{:else}
			<Icon name="print" />
		{/if}
		Cetak
	</button>
</div>
