<script lang="ts">
	import PiagamPreview from '$lib/components/cetak/preview/PiagamPreview.svelte';
	import PiagamPreview2 from '$lib/components/cetak/preview/PiagamPreview2.svelte';

	let { data } = $props();

	let selectedTemplate = $state<'1' | '2'>('1');

	function getComponent() {
		return selectedTemplate === '2' ? PiagamPreview2 : PiagamPreview;
	}
</script>

<div class="card p-4">
	<label class="label" for="select-template">
		<span class="label-text">Pilih Template</span>
	</label>
	<select id="select-template" class="select w-full mb-4" bind:value={selectedTemplate}>
		<option value="1">Template 1</option>
		<option value="2">Template 2</option>
	</select>

	{#if selectedTemplate === '2'}
		<PiagamPreview2 {data} />
	{:else}
		<PiagamPreview {data} />
	{/if}
</div>
