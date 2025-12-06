<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	type Props = {
		isDownloading?: boolean;
		isImporting?: boolean;
		disabled?: boolean;
		onDownload?: () => void;
		onImport?: (event: Event) => void;
	};

	let {
		isDownloading = false,
		isImporting = false,
		disabled = false,
		onDownload,
		onImport
	}: Props = $props();

	let fileInput: HTMLInputElement | undefined;

	function handleFileClick() {
		fileInput?.click();
	}

	function handleFileChange(event: Event) {
		onImport?.(event);
	}
</script>

<div class="mb-4 flex flex-col justify-between gap-2 sm:flex-row">
	<button
		type="button"
		class="btn btn-soft shadow-none"
		onclick={onDownload}
		disabled={isDownloading || disabled}
	>
		{#if isDownloading}
			<span class="loading loading-spinner loading-sm"></span>
		{:else}
			<Icon name="download" />
		{/if}
		Download template
	</button>
	<div class="relative">
		<input
			type="file"
			accept=".xlsx"
			bind:this={fileInput}
			onchange={handleFileChange}
			style="display: none;"
		/>
		<button
			type="button"
			class="btn btn-soft shadow-none"
			onclick={handleFileClick}
			disabled={isImporting || disabled}
		>
			{#if isImporting}
				<span class="loading loading-spinner loading-sm"></span>
			{:else}
				<Icon name="import" />
			{/if}
			Import nilai
		</button>
	</div>
</div>
