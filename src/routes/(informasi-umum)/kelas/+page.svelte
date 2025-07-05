<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	let { data } = $props();
</script>

<div class="mx-auto w-full max-w-4xl">
	{#each data.daftarKelas as kelas (kelas)}
		<fieldset class="fieldset bg-base-100 mb-6 rounded-lg p-4 shadow-md">
			<legend class="fieldset-legend">Data Kelas</legend>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<div class="card bg-base-200">
					<div class="card-body p-4">
						<h2 class="card-title text-base-content/70 text-sm">Nama Kelas</h2>
						<p class="text-lg font-semibold">{kelas.nama}</p>
					</div>
				</div>
				<div class="card bg-base-200">
					<div class="card-body p-4">
						<h2 class="card-title text-base-content/70 text-sm">Fase</h2>
						<p class="text-lg font-semibold">{kelas.fase}</p>
					</div>
				</div>

				<div class="card bg-base-200 col-span-full lg:col-span-1">
					<div class="card-body p-4">
						<h2 class="card-title text-base-content/70 text-sm">Wali Kelas</h2>
						<p class="text-lg font-semibold">{kelas.waliKelas?.nama}</p>
						<p class="text-base-content/70 text-sm">NIP {kelas.waliKelas?.nip}</p>
					</div>
				</div>
			</div>

			<div class="mt-6 text-right">
				<a href="/kelas/form/{kelas.id}" class="btn btn-primary shadow-md">
					<Icon name="edit" />
					Edit
				</a>
			</div>
		</fieldset>
	{:else}
		<div class="card bg-base-100 rounded-box flex items-center justify-center mb-6">
			<div class="card-body text-center">
				<em class="opacity-50">Belum ada data kelas</em>
			</div>
		</div>
	{/each}

	<a
		href="/kelas/form"
		class="card bg-base-100 rounded-box border-base-300 hover:bg-base-200 flex items-center justify-center border-2 border-dashed transition-colors duration-300"
	>
		<div class="card-body text-center">
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
