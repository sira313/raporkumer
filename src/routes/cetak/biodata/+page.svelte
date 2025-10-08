<script lang="ts">
	import BiodataPreview from '$lib/components/cetak/preview/BiodataPreview.svelte';

	let { data } = $props();
</script>

<BiodataPreview {data} />
