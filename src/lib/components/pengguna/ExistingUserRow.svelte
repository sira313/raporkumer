<script lang="ts">
  import Icon from '$lib/components/icon.svelte';
  let { u, editingId, editValues, onToggleEdit, onSaveEdit, onOpenUser } = $props();
</script>

<td>{u.pegawaiName ?? u.username}</td>
<td>
  {#if u.type === 'wali_kelas'}
    Wali {u.kelasName ?? (u.kelasId ? `Kelas ${u.kelasId}` : '-')}
  {:else if u.type === 'admin'}
    Admin
  {:else}
    {u.type}
  {/if}
</td>
<td>
  {#if editingId === u.id}
    <input class="input input-sm w-full" bind:value={editValues[u.id].username} />
  {:else}
    {u.username ? u.username : '-'}
  {/if}
</td>
<td>
  {#if editingId === u.id}
    <input type="password" class="input input-sm w-full" placeholder="Buat Password" bind:value={editValues[u.id].password} />
  {:else}
    {u.passwordUpdatedAt ? '*****' : '-'}
  {/if}
</td>
<td>
  <div class="flex flex-row">
    <button
      class="btn btn-sm btn-soft rounded-r-none shadow-none"
      title={editingId === u.id ? 'Batal' : 'Ubah username dan password'}
      onclick={() => onToggleEdit?.(u)}
      disabled={editingId !== null && editingId !== u.id}
    >
      {#if editingId === u.id}
        <Icon name="close" />
      {:else}
        <Icon name="edit" />
      {/if}
    </button>

    {#if editingId === u.id}
  <button class="btn btn-primary btn-sm btn-soft rounded-l-none shadow-none" title="Simpan perubahan" onclick={() => onSaveEdit?.(u)}>
        <Icon name="save" />
      </button>
    {:else}
      <button
        class="btn btn-primary btn-sm btn-soft rounded-l-none shadow-none"
        title={editingId !== null ? 'Disabled while mengubah pengguna lain' : 'Atur hak akses'}
        type="button"
        onclick={(e) => { e.preventDefault(); if (!(editingId !== null && editingId !== u.id)) onOpenUser?.(u); }}
        disabled={editingId !== null && editingId !== u.id}
      >
        <Icon name="key" />
      </button>
    {/if}
  </div>
</td>
