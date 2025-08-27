<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/icon.svelte';
	import { autoSubmit, modalRoute } from '$lib/utils';
	import DeleteMataPelajaran from './[id]/delete/+page.svelte';
	import FormMataPelajaran from './form/+page.svelte';

	let { data } = $props();
</script>

<!-- Data Mapel -->
<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<h2 class="mb-6 text-xl font-bold">Daftar Mata Pelajaran</h2>

	<!-- Tombol select Kelas akan dihapus dan dipindahkan ke navbar -->
	<!-- <form data-sveltekit-keepfocus data-sveltekit-replacestate use:autoSubmit>
		<select
			class="select bg-base-200 mb-2 w-full dark:border-none"
			title="Pilih kelas"
			name="kelas_id"
			value={data.kelasId || ''}
		>
			<option value="" disabled selected> Pilih Kelas </option>
			{#each data.daftarKelas as kelas (kelas)}
				<option value={kelas.id + ''}>Kelas: {kelas.nama} - Fase: {kelas.fase}</option>
			{:else}
				<option value="" disabled selected> Belum ada data kelas </option>
			{/each}
		</select>
	</form> -->

	<div class="flex flex-col gap-2 sm:flex-row">
		<!-- tombol tambah mapel -->
		<a
			class="btn mb-2 shadow-none sm:max-w-40"
			href="/intrakurikuler/form"
			use:modalRoute={'add-mapel'}
		>
			<Icon name="plus" />
			Tambah
		</a>
		<!-- tombol download template -->
		<button class="btn mb-2 shadow-none">
			<Icon name="download" />
			Download Template
		</button>
		<!-- tombol import -->
		<button class="btn mb-2 shadow-none">
			<Icon name="import" />
			Import
		</button>
		<!-- Tombol ini hanya aktif bila user centang mapel untuk hapus -->
		<button disabled class="btn btn-error mb-2 shadow-none sm:ml-auto sm:max-w-40">
			<Icon name="del" />
			Hapus
		</button>
	</div>
	<!-- Tabel Mapel Wajib -->
	<legend class="fieldset-legend"> Mata Pelajaran Wajib </legend>
	<div class="bg-base-100 dark:bg-base-200 overflow-x-auto rounded-md shadow-md dark:shadow-none">
		<table class="border-base-200 table border dark:border-none">
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th style="width: 50px; min-width: 40px;"><input type="checkbox" class="checkbox" /></th>
					<th style="width: 50px; min-width: 40px;">No</th>
					<th style="width: 50%;">Mata Pelajaran</th>
					<th>KKM</th>
					<th>Tujuan Pembelajaran</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#each data.mapel.daftarWajib as mapel, index (mapel)}
					<tr>
						<td><input type="checkbox" class="checkbox" /></td>
						<td>{index + 1}</td>
						<td>{mapel.nama}</td>
						<td>{mapel.kkm}</td>
						<td class="flex flex-row gap-2">
							<a
								href="/intrakurikuler/{mapel.id}/tp-rl"
								class="btn btn-sm btn-soft shadow-none"
								type="button"
							>
								<Icon name="edit" />
								Edit TP
							</a>
						</td>
						<td>
							<div class="flex flex-row gap-2">
								<a
									class="btn btn-sm btn-soft btn-error shadow-none"
									type="button"
									href="/intrakurikuler/{mapel.id}/delete"
									use:modalRoute={'delete-mapel'}
								>
									<Icon name="del" />
									Hapus
								</a>
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="text-center italic opacity-50" colspan="6">Belum ada data</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
	<!-- Data Muatan lokal -->
	<legend class="fieldset-legend mt-2"> Muatan Lokal </legend>
	<div class="bg-base-100 dark:bg-base-200 overflow-x-auto rounded-md shadow-md dark:shadow-none">
		<table class="border-base-200 table border dark:border-none">
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th style="width: 50px; min-width: 40px;"><input type="checkbox" class="checkbox" /></th>
					<th style="width: 50px; min-width: 40px;">No</th>
					<th style="width: 50%;">Mata Pelajaran</th>
					<th>KKM</th>
					<th>Tujuan Pembelajaran</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#each data.mapel.daftarMulok as mapel, index (mapel)}
					<tr>
						<td><input type="checkbox" class="checkbox" /></td>
						<td>{index + 1}</td>
						<td>{mapel.nama}</td>
						<td>{mapel.kkm}</td>
						<td class="flex flex-row gap-2">
							<a
								href="/intrakurikuler/{mapel.id}/tp-rl"
								class="btn btn-sm btn-soft shadow-none"
								type="button"
							>
								<Icon name="edit" />
								Edit TP
							</a>
						</td>
						<td>
							<div class="flex flex-row gap-2">
								<a
									class="btn btn-sm btn-soft btn-error shadow-none"
									type="button"
									href="/intrakurikuler/{mapel.id}/delete"
									use:modalRoute={'delete-mapel'}
								>
									<Icon name="del" />
									Hapus
								</a>
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="text-center italic opacity-50" colspan="6">Belum ada data</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Modal Tambah Data -->
{#if page.state.modal?.name == 'add-mapel'}
	<dialog class="modal" open>
		<div class="modal-box p-4">
			<FormMataPelajaran data={page.state.modal?.data} />
		</div>
	</dialog>
{/if}

<!-- Modal Hapus Data -->
{#if page.state.modal?.name == 'delete-mapel'}
	<dialog class="modal" onclose={() => history.back()} open>
		<div class="modal-box">
			<DeleteMataPelajaran data={page.state.modal?.data} />
		</div>
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>
{/if}
