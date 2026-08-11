<script lang="ts">
	import FormMataPelajaran from '../../form/+page.svelte';

	let { data } = $props();
	const editData = $derived.by(() => ({ ...data, mode: 'edit' as const }));
</script>

{#key editData.mapel?.id}
	<FormMataPelajaran data={editData} />
{/key}
