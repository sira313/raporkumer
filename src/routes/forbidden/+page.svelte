<script lang="ts">
	import { page } from '$app/stores';
	import Icon from '$lib/components/icon.svelte';

	let required: string[] = [];

	$: {
		const raw = $page.url.searchParams.get('required') ?? '';
		required = raw
			? raw
					.split(',')
					.map((p) => p.trim())
					.filter(Boolean)
			: [];
	}

	function goBack() {
		if (history.length > 1) history.back();
		else location.href = '/';
	}

	// Build request access URL: go to settings with requested perms as query
	$: requestUrl = '/pengaturan?request=' + encodeURIComponent(required.join(','));
</script>

<div class="flex items-center justify-center">
	<div class="w-full">
		<div class="overflow-hidden rounded-lg shadow-md">
			<div class="from-primary to-secondary bg-gradient-to-r p-8 text-white">
				<div class="flex items-center gap-6">
					<div class="flex h-24 w-24 items-center justify-center rounded-lg bg-white/10">
						<Icon name="lock" class="text-4xl text-white" />
					</div>
					<div>
						<h1 class="text-2xl font-semibold">Akses Ditolak</h1>
						<p class="mt-1 text-sm opacity-90">
							Anda tidak memiliki izin yang diperlukan untuk membuka halaman ini.
						</p>
					</div>
				</div>
			</div>

			<div class="bg-base-100 p-6">
				<div class="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
					<div class="flex-1">
						<h3 class="text-lg font-medium">Izin yang dibutuhkan</h3>
						{#if required.length}
							<div class="mt-3 flex flex-wrap gap-2">
								{#each required as perm (perm)}
									<span class="badge badge-error">{perm}</span>
								{/each}
							</div>
						{:else}
							<p class="text-muted mt-2 text-sm">Tidak ada informasi izin tersedia.</p>
						{/if}
					</div>

					<div class="flex flex-shrink-0 flex-col items-stretch gap-2 md:items-end">
						<div class="flex gap-2">
							<button class="btn btn-soft shadow-none" on:click={goBack} aria-label="Kembali"
								>Kembali</button
							>
						</div>
					</div>
				</div>

				<p class="text-muted mt-6 text-sm">
					Butuh bantuan lebih lanjut? Buka halaman <a class="link" href={requestUrl}>Pengaturan</a>
					untuk menghubungi administrator sekolah atau periksa akun Anda.
				</p>
			</div>
		</div>
	</div>
</div>
