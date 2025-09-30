<script lang="ts">
	let { name, class: classes }: { name: IconName; class?: string } = $props();

	const icons = import.meta.glob('/src/lib/icons/*.svg', { query: '?raw', eager: true });
	const icon = $derived(icons[`/src/lib/icons/${name}.svg`] as { default: string } | undefined);
</script>

{#if icon}
	{@html classes ? icon.default.replace('<svg', `<svg class="${classes}" `) : icon.default}
{:else}
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5"> </svg>
{/if}
