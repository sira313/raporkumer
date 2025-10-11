<script lang="ts">
	import PiagamPreview from '$lib/components/cetak/preview/PiagamPreview.svelte';

	let { data } = $props();
</script>

<PiagamPreview {data} />
