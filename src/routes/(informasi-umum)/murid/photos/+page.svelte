<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	let { data } = $props();

	const getPhotoSrc = (murid: { id: number; foto: string | null }) => {
		if (!murid.foto) return null;
		if (typeof murid.foto === 'string') {
			if (
				murid.foto.startsWith('http') ||
				murid.foto.startsWith('data:') ||
				murid.foto.startsWith('/')
			) {
				return murid.foto;
			}
			return `/api/murid-photo/${murid.id}?v=${encodeURIComponent(murid.foto)}`;
		}
		return null;
	};
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<div class="mb-6 flex flex-col sm:flex-row sm:justify-between">
		<div>
			<h2 class="text-xl font-bold">Foto Murid</h2>
			<p class="text-base-content/80 block text-sm">
				{data.kelas.nama} - Fase {data.kelas.fase ?? '-'}
			</p>
		</div>
		<form action="/murid" method="get">
			<button type="submit" class="btn btn-soft mt-4 flex items-center shadow-none sm:mt-0">
				<Icon name="left" />
				Kembali
			</button>
		</form>
	</div>

	{#if data.daftarMurid.length === 0}
		<div class="text-base-content/60 py-8 text-center">
			<p>Tidak ada murid di kelas ini</p>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4">
			{#each data.daftarMurid as murid (murid.id)}
				<div class="flex flex-col items-center gap-2">
					{#if murid.foto}
						<img
							src={getPhotoSrc(murid)}
							alt={murid.nama}
							class="aspect-3/4 w-full rounded-lg object-cover"
						/>
					{:else}
						<div
							class="bg-base-200 flex aspect-3/4 w-full items-center justify-center overflow-hidden rounded-lg"
						>
							<div class="p-4 opacity-60">
								<Icon name="user" class="mx-auto text-5xl" />
								<p class="mt-2 text-xs">Foto belum tersedia</p>
							</div>
						</div>
					{/if}
					<div class="w-full">
						<p class="truncate text-center text-sm font-semibold" title={murid.nama}>
							{murid.nama}
						</p>
						<p class="text-base-content/60 text-center text-xs">NISN: {murid.nisn}</p>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
