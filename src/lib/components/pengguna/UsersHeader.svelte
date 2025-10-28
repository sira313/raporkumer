<script lang="ts">
  import Icon from '$lib/components/icon.svelte';
  let { selectedIds, onDelete, onAdd } = $props();
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
  <button class="btn btn-outline btn-primary shadow-none sm:self-start" type="button" onclick={() => onAdd?.()}>
    <Icon name="plus" />
    Tambah Pengguna
  </button>
{/if}
