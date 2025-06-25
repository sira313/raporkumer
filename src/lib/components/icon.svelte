<script lang="ts">
	const { name }: { name: IconName } = $props();
</script>

<!-- this will even better when Svelte Async Component released -->
{#await import(`$lib/icons/${name}.svg?raw`)}
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-3.5 w-3.5"> </svg>
{:then { default: Icon }}
	{@html Icon}
{/await}
