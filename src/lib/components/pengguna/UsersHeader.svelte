<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	// receive editingId so header can disable actions while a row is being edited
	let { selectedIds, onDelete, onAdd, editingId = null } = $props();
</script>

{#if selectedIds.length > 0}
	<button
		class="btn btn-error shadow-none sm:self-start"
		type="button"
		onclick={() => onDelete?.()}
	>
		<Icon name="del" />
		Hapus Pengguna ({selectedIds.length})
	</button>
{:else}
	<button
		class="btn btn-outline btn-primary shadow-none sm:self-start"
		type="button"
		onclick={() => onAdd?.()}
		disabled={editingId !== null}
		title={editingId !== null ? 'Selesaikan pengeditan terlebih dahulu' : 'Tambah Pengguna'}
	>
		<Icon name="plus" />
		Tambah Pengguna
	</button>
{/if}
