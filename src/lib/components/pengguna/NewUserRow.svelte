<script lang="ts">
  import Icon from '$lib/components/icon.svelte';
  let { id, mataPelajaran, newValues, onCancel, onSave } = $props();
</script>

<td>
  <input class="input input-sm w-full" bind:value={newValues[id].nama} placeholder="Nama" />
</td>
<td>
  <select class="select select-sm w-full" bind:value={newValues[id].type}>
    <option value="admin">Admin</option>
    <option value="wali_kelas">Wali Kelas</option>
    <option value="user">User</option>
  </select>
</td>
<td>
  <select class="select select-sm w-full" bind:value={newValues[id].mataPelajaranId}>
    {#each mataPelajaran as m}
      <option value={m.id}>{m.nama}</option>
    {/each}
    {#if mataPelajaran.length === 0}
      <option disabled>- tidak ada mata pelajaran -</option>
    {/if}
  </select>
</td>
<td>
  <input class="input input-sm w-full" bind:value={newValues[id].username} placeholder="Username" />
</td>
<td>
  <input type="password" class="input input-sm w-full" bind:value={newValues[id].password} placeholder="Password" />
</td>
<td>
  <div class="flex flex-row">
    <button class="btn btn-sm btn-soft rounded-r-none shadow-none" title="Batal" onclick={() => onCancel?.(id)}>
      <Icon name="close" />
    </button>
  <button class="btn btn-primary btn-sm btn-soft rounded-l-none shadow-none" title="Simpan pengguna" onclick={() => onSave?.(id)}>
      <Icon name="save" />
    </button>
  </div>
</td>
