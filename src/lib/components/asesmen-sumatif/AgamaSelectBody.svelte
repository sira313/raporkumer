<script lang="ts">
	import { onMount } from 'svelte';
	import { agamaVariantOptions } from '$lib/statics';

	interface Props {
		// callback supplied by caller to retrieve current selection
		setGetter?: (fn: () => string) => void;
		options?: { key: string; label: string; name: string }[];
	}

	let { setGetter, options = agamaVariantOptions }: Props = $props();

	// svelte-ignore state_referenced_locally
	let selectedKey = $state(options?.[0]?.key ?? 'islam');
	// unique id for label association
	let selectId = $state('agama-select-' + Math.random().toString(36).slice(2, 9));

	onMount(() => {
		if (typeof setGetter === 'function') {
			// expose a getter closure that reads the reactive selectedKey
			setGetter(() => selectedKey);
		}
	});
</script>

<fieldset class="fieldset w-full">
	<legend class="fieldset-legend">Pilih Agama</legend>

	<select
		id={selectId}
		class="select bg-base-200 dark:bg-base-300 w-full truncate dark:border-none"
		bind:value={selectedKey}
		aria-label="Pilih agama"
	>
		{#each options as opt (opt.key)}
			<option class="text-wrap" value={opt.key}>{opt.label}</option>
		{/each}
	</select>

	<p class="label text-wrap">
		Contoh nama mapel di file: <strong>{options.find((o) => o.key === selectedKey)?.name}</strong>
	</p>
</fieldset>
