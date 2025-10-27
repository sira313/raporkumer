<script lang="ts">
  import { page } from '$app/stores';
  import Icon from '$lib/components/icon.svelte';
  import { onDestroy } from 'svelte';

  let required: string[] = [];
  let copied = false;
  let copyTimeout: number | undefined;

  $: {
    const raw = $page.url.searchParams.get('required') ?? '';
    required = raw ? raw.split(',').map((p) => p.trim()).filter(Boolean) : [];
  }

  function goBack() {
    if (history.length > 1) history.back();
    else (location.href = '/');
  }

  function copyPermissions() {
    const text = required.join(', ');
    if (!text) return;
    navigator.clipboard?.writeText(text).then(() => {
      copied = true;
      clearTimeout(copyTimeout);
      // Hide message after 2s
      // @ts-ignore setTimeout returns number in browser
      copyTimeout = setTimeout(() => (copied = false), 2000);
    });
  }

  // Build request access URL: go to settings with requested perms as query
  $: requestUrl = '/pengaturan?request=' + encodeURIComponent(required.join(','));

  onDestroy(() => clearTimeout(copyTimeout));
</script>

<div class="flex items-center justify-center">
  <div class="w-full">
    <div class="rounded-lg overflow-hidden shadow-md">
      <div class="p-8 bg-gradient-to-r from-primary to-secondary text-white">
        <div class="flex items-center gap-6">
          <div class="flex items-center justify-center w-24 h-24 bg-white/10 rounded-lg">
            <Icon name="lock" class="text-4xl text-white" />
          </div>
          <div>
            <h1 class="text-2xl font-semibold">Akses Ditolak</h1>
            <p class="mt-1 text-sm opacity-90">Anda tidak memiliki izin yang diperlukan untuk membuka halaman ini.</p>
          </div>
        </div>
      </div>

      <div class="p-6 bg-base-100">
        <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div class="flex-1">
            <h3 class="text-lg font-medium">Izin yang dibutuhkan</h3>
            {#if required.length}
              <div class="mt-3 flex flex-wrap gap-2">
                {#each required as perm}
                  <span class="badge badge-error">{perm}</span>
                {/each}
              </div>
            {:else}
              <p class="mt-2 text-sm text-muted">Tidak ada informasi izin tersedia.</p>
            {/if}
          </div>

          <div class="flex-shrink-0 flex flex-col items-stretch gap-2 md:items-end">
            <div class="flex gap-2">
              <button class="btn btn-soft shadow-none" on:click={goBack} aria-label="Kembali">Kembali</button>
            </div>
          </div>
        </div>

        <p class="text-sm text-muted mt-6">Butuh bantuan lebih lanjut? Buka halaman <a class="link" href="/pengaturan">Pengaturan</a> untuk menghubungi administrator sekolah atau periksa akun Anda.</p>
      </div>
    </div>
  </div>
</div>
