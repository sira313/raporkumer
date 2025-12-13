<script lang="ts">
	import RaporPreviewFixed from '$lib/components/cetak/preview/RaporPreviewFixed.svelte';

	let { data } = $props();
</script>

<RaporPreviewFixed {data} />
