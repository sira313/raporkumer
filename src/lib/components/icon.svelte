<script lang="ts">
	const { name }: { name: IconName } = $props();

	const icons = import.meta.glob('/src/lib/icons/*.svg', { query: '?raw', eager: true });
	const icon = icons[`/src/lib/icons/${name}.svg`] as { default: string } | undefined;
</script>

{#if icon}
	{@html icon.default}
{:else}
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5"> </svg>
{/if}
