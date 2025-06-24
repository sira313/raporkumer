<script lang="ts">
	const { name }: { name: IconName } = $props();
</script>

<!-- this will even better when Svelte Async Component released -->
{#await import(`$lib/icons/${name}.svg?raw`) then { default: Icon }}
	{@html Icon}
{/await}
