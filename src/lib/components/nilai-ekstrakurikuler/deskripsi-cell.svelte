<script lang="ts">
	let { text }: { text: string | null } = $props();
	const content = $derived.by(() => text?.trim() ?? '');
</script>

{#if content}
	<span class="text-sm text-base-content">{content}</span>
{:else}
	<span class="text-sm italic text-base-content/70">Belum ada nilai</span>
{/if}
