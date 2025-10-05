<script lang="ts">
	let { data, children } = $props();
</script>

<svelte:head>
	<title>{data.meta?.title ?? 'Rapor Murid'}</title>
</svelte:head>

{@render children()}
