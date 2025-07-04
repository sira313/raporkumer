<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	let { data } = $props();
</script>

{#each data.daftarKelas as kelas (kelas)}
	<fieldset class="fieldset bg-base-100 mx-auto w-full max-w-4xl rounded-lg p-4 shadow-md">
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
	<div class="flex items-center justify-center h-[80vh]">
		<em class="opacity-50">Belum ada data kelas</em>
	</div>
{/each}

<div class="mx-auto mt-5 text-center">
	<a class="btn btn-primary" href="/kelas/form">
		<Icon name="plus" />
		Tambah kelas
	</a>
</div>
