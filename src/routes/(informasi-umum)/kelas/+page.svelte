<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	let { data } = $props();
</script>

<div class="mx-auto w-full max-w-4xl">
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		{#each data.daftarKelas as kelas (kelas)}
			<div class="card bg-base-100 shadow-sm">
				<div class="card-body">
					<div class="flex items-start justify-between">
						<h2 class="card-title text-xl font-bold">{kelas.nama}</h2>
						<div class="badge badge-accent">{kelas.fase}</div>
					</div>
					<div
						class="card-actions border-base-200 mt-auto items-center justify-start border-t pt-4"
					>
						<div class="avatar">
							<Icon name="user" class="text-4xl" />
						</div>
						<div class="ml-3">
							<div class="text-base-content/60 text-sm">Wali Kelas</div>
							<div class="text-xl font-semibold">{kelas.waliKelas?.nama}</div>
							<p class="text-base-content/70 text-sm">NIP {kelas.waliKelas?.nip}</p>
						</div>
					</div>
					<div class="mt-6 text-right">
						<button class="btn btn-error shadow-none">
							<Icon name="del" />
							Hapus
						</button>
						<a href="/kelas/form/{kelas.id}" class="btn shadow-none">
							<Icon name="edit" />
							Edit
						</a>
					</div>
				</div>
			</div>
		{:else}
			<div class="card bg-base-100 rounded-box flex items-center justify-center min-h-40">
				<div class="p-6 text-center items-center justify-center">
					<em class="opacity-50">Belum ada data kelas</em>
				</div>
			</div>
		{/each}
		<a
			href="/kelas/form"
			class="card bg-base-100 rounded-box border-base-300 hover:bg-base-200 flex min-h-40 border-2 border-dashed transition-colors duration-300"
		>
			<div class="my-auto items-center justify-center text-center">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="text-base-content/30 mx-auto h-12 w-12"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="1"
				>
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
				</svg>
				<p class="text-base-content/50 mt-2">Tambah Kelas Baru</p>
			</div>
		</a>
	</div>
</div>
