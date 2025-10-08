<script lang="ts">
	import RaporPreview from '$lib/components/cetak/preview/RaporPreview.svelte';

	let { data } = $props();
</script>

<RaporPreview {data} />
