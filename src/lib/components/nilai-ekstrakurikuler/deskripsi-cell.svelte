<script lang="ts">
	let { text }: { text: string | null } = $props();
	const content = $derived.by(() => text?.trim() ?? '');
</script>

{#if content}
	<span class="text-base-content text-sm">{content}</span>
{:else}
	<span class="text-base-content/70 text-sm italic">Belum ada nilai</span>
{/if}
