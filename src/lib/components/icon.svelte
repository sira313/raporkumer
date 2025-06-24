<script lang="ts">
	const { name }: { name: string } = $props();
</script>

{#await import(`$lib/icons/${name}.svg?raw`) then { default: Icon }}
	{@html Icon}
{/await}
