<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import Icon from '$lib/components/icon.svelte';
  import { toast } from '$lib/components/toast.svelte';

  export let open: boolean = false;
  export let mataPelajaran: { id: number; nama: string }[] = [];

  const dispatch = createEventDispatcher();

  let nama = '';
  let username = '';
  let password = '';
  let type = 'user';
  let mataPelajaranId: number | null = null;

  $: if (open) {
    // initialize defaults when opening
    nama = '';
    username = '';
    password = '';
    type = 'user';
    mataPelajaranId = mataPelajaran[0]?.id ?? null;
  }

  function close() {
    open = false;
    dispatch('cancel');
  }

  async function save() {
    const form = new FormData();
    form.set('username', username || '');
    form.set('password', password || '');
    form.set('nama', nama || '');
    form.set('type', type || 'user');
    form.set('mataPelajaranId', String(mataPelajaranId ?? ''));
    try {
      const res = await fetch('?/create_user', { method: 'POST', body: form });
      if (res.ok) {
        const body = await res.json().catch(() => ({}));
        toast({ message: 'Pengguna dibuat', type: 'success' });
        dispatch('saved', { body });
        open = false;
      } else {
        const text = await res.text().catch(() => 'Gagal');
        toast({ message: `Gagal membuat: ${text}`, type: 'error' });
      }
    } catch (e) {
      toast({ message: 'Gagal membuat pengguna', type: 'error' });
    }
  }
</script>

{#if open}
  <div class="modal modal-open">
    <div class="modal-box max-w-lg">
      <h3 class="font-bold text-lg">Tambah Pengguna</h3>
      <div class="py-4 space-y-3">
        <fieldset class="fieldset">
          <legend class="fieldset-legend">Nama</legend>
          <input id="add-user-nama" class="input w-full dark:bg-base-200 dark:border-none" bind:value={nama} placeholder="Nama" />
          <p class="label">Nama lengkap pengguna dan gelar (tampil pada daftar)</p>
        </fieldset>



        <fieldset class="fieldset">
          <legend class="fieldset-legend">Mata Pelajaran (opsional)</legend>
          <select id="add-user-mapel" class="select w-full dark:bg-base-200 dark:border-none" bind:value={mataPelajaranId}>
            {#each mataPelajaran as m}
              <option value={m.id}>{m.nama}</option>
            {/each}
            {#if mataPelajaran.length === 0}
              <option disabled>- tidak ada mata pelajaran -</option>
            {/if}
          </select>
          <p class="label">Hubungkan pengguna ke mata pelajaran (jika ada)</p>
        </fieldset>

        <fieldset class="fieldset">
          <legend class="fieldset-legend">Akun</legend>
          <input id="add-user-username" class="input w-full mb- dark:bg-base-200 dark:border-none" bind:value={username} placeholder="Username" />
          <input id="add-user-password" type="password" class="input w-full dark:bg-base-200 dark:border-none" bind:value={password} placeholder="Password" />
          <p class="label">Username dan password untuk login</p>
        </fieldset>
      </div>

      <div class="modal-action">
        <button class="btn btn-soft" type="button" on:click={close}><Icon name="close" /> Batal</button>
        <button class="btn btn-primary shadow-none" type="button" on:click={save}><Icon name="save" /> Simpan</button>
      </div>
    </div>
  </div>
{/if}
