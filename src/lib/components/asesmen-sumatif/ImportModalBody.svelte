<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import AgamaSelectBody from '$lib/components/asesmen-sumatif/AgamaSelectBody.svelte';
	import { agamaVariantOptions } from '$lib/statics';

	const dispatch = createEventDispatcher();

	export let setUploader: ((fn: () => File | null) => void) | null = null;
	// optional: parent can provide a setter to receive the agama-key getter
	export let setAgamaGetter: ((fn: () => string) => void) | null = null;
	export let showAgamaSelect: boolean = false;
	export let agamaOptions: { key: string; label: string; name: string }[] = agamaVariantOptions;

	let fileInput: HTMLInputElement | null = null;
	let selectedFile: File | null = null;

	function onFileChange(e: Event) {
		const f = (e.currentTarget as HTMLInputElement).files?.[0] ?? null;
		if (f) {
			selectedFile = f;
			dispatch('fileselected', { file: f });
		}
	}

	onMount(() => {
		if (setUploader && typeof setUploader === 'function') {
			setUploader(() => selectedFile);
		}
	});

	$: if (setUploader && typeof setUploader === 'function') {
		setUploader(() => selectedFile);
	}
</script>

<div class="p-2">
	{#if showAgamaSelect}
		<div class="mb-4">
			<AgamaSelectBody
				options={agamaOptions}
				setGetter={(fn: () => string) => {
					if (setAgamaGetter && typeof setAgamaGetter === 'function') setAgamaGetter(fn);
				}}
			/>
		</div>
	{/if}
	<div class="form-control">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Import file excel</legend>
			<input
				id="import-file-input"
				type="file"
				class="file-input file-input-ghost"
				accept=".xlsx,.xls"
				bind:this={fileInput}
				on:change={onFileChange}
				aria-label="Pilih file Excel"
			/>
			<p class="label">Pilih file Excel (.xlsx) sesuai format "Download Template"</p>
		</fieldset>
	</div>
	<!-- Footer actions are provided by the global modal. Do not duplicate buttons here. -->
</div>

<style>
	/* keep tiny styles inline */
</style>
