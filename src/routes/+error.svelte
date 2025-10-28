<script lang="ts">
import { page } from '$app/state';
// `runes` attribute removed to avoid svelte-check warning about
// unrecognized script attributes. The component reads both the props
// provided by SvelteKit when server-rendering (`status`, `error`) and
// the client-side `page` store which is populated when the client
// starts with an error (see embedded kit.start calls in dev server).
let { status, error } = $props();

function reload() {
  location.reload();
}
</script>

  <div class="w-full card shadow-md bg-base-100">
    <div class="card-body text-center">
      <h1 class="text-4xl font-extrabold">Ups — Terjadi kesalahan</h1>
      <p class="text-sm text-neutral mt-1">Status: <span class="text-lg font-mono">{page?.status ?? status}</span></p>

      {#if page?.error ?? error}
        <div class="mt-4 text-left w-full">
          <p class="text-xs text-neutral">Pesan teknis</p>
          <pre class="whitespace-pre-wrap bg-base-200 p-3 rounded text-sm mt-1 overflow-auto" aria-live="polite">{String(page?.error?.message ?? error?.message ?? error)}</pre>
        </div>
      {/if}

      <div class="card-actions justify-center gap-3 mt-6">
        <a href="/" class="btn btn-primary shadow-none" aria-label="Kembali ke beranda">Kembali ke Beranda</a>
        <button type="button" class="btn btn-ghost shadow-none" onclick={reload} aria-label="Muat ulang halaman">Muat ulang</button>
      </div>

      <p class="text-xs text-neutral mt-4">Jika masalah berlanjut, hubungi admin sekolah dan sertakan nomor status di atas serta pesan teknis.</p>
    </div>
  </div>
