<script lang="ts">
	import CoverPreview from '$lib/components/cetak/preview/CoverPreview.svelte';

	let { data } = $props();
</script>

<CoverPreview {data} />
