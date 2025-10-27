<script lang="ts">
  import { page } from '$app/stores';
	import Icon from '$lib/components/icon.svelte';

  let required: string[] = [];

  $: {
    const raw = $page.url.searchParams.get('required') ?? '';
    required = raw ? raw.split(',').map((p) => p.trim()).filter(Boolean) : [];
  }

  function goBack() {
    if (history.length > 1) history.back();
    else (location.href = '/');
  }
</script>

<div class="flex justify-center">
  <div class="card w-full bg-base-100 shadow-md">
    <div class="card-body">
      <div class="flex items-center gap-4">
       <Icon name="lock" class="text-5xl" />
        <div>
          <h2 class="card-title">Akses Ditolak</h2>
          <p class="text-sm text-muted">Anda tidak memiliki izin yang diperlukan untuk mengakses halaman ini.</p>
        </div>
      </div>

      <div class="mt-4">
        <h3 class="font-semibold">Izin yang dibutuhkan:</h3>
        {#if required.length}
          <div class="mt-2 flex flex-wrap gap-2">
            {#each required as perm}
              <span class="badge badge-info">{perm}</span>
            {/each}
          </div>
        {:else}
          <p class="text-sm text-muted mt-2">Tidak ada informasi izin tersedia.</p>
        {/if}
      </div>

      <p class="text-muted mt-4">Butuh bantuan? Hubungi admin sekolah untuk meminta akses atau periksa kembali akun Anda.</p>
    </div>
  </div>
</div>
