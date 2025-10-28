<script lang="ts">
	import { page } from '$app/state';
	// `runes` attribute removed to avoid svelte-check warning about
	// unrecognized script attributes. The component reads the client-side
	// `page` store which is populated when the client starts with an error.

	function reload() {
		location.reload();
	}
</script>

<div class="card bg-base-100 w-full shadow-md">
	<div class="card-body text-center">
		<h1 class="text-4xl font-extrabold">Ups — Terjadi kesalahan</h1>
		<p class="text-neutral mt-1 text-sm">
			Status: <span class="font-mono text-lg">{page?.status ?? 500}</span>
		</p>

		{#if page?.error}
			<div class="mt-4 w-full text-left">
				<p class="text-neutral text-xs">Pesan teknis</p>
				<pre
					class="bg-base-200 mt-1 overflow-auto rounded p-3 text-sm whitespace-pre-wrap"
					aria-live="polite">{String(page?.error?.message ?? page?.error)}</pre>
			</div>
		{/if}

		<div class="card-actions mt-6 justify-center gap-3">
			<a href="/" class="btn btn-primary shadow-none" aria-label="Kembali ke beranda"
				>Kembali ke Beranda</a
			>
			<button
				type="button"
				class="btn btn-ghost shadow-none"
				onclick={reload}
				aria-label="Muat ulang halaman">Muat ulang</button
			>
		</div>

		<p class="text-neutral mt-4 text-xs">
			Jika masalah berlanjut, hubungi admin sekolah dan sertakan nomor status di atas serta pesan
			teknis.
		</p>
	</div>
</div>
