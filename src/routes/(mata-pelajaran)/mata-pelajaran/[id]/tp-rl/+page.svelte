<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/icon.svelte';
	import { modalRoute } from '$lib/utils';
	import FormTpRl from './form/+page.svelte';

	let { data } = $props();
</script>

<!-- Data Mapel Wajib -->
<fieldset
	class="fieldset bg-base-100 rounded-box mx-auto w-full max-w-4xl border border-none p-4 shadow-md"
>
	<!-- Judul IPAS bisa berubah dinamis sesuai mata pelajaran yang dipilih -->
	<legend class="fieldset-legend"
		>Daftar Tujuan Pembelajaran Mata Pelajaran {data.mapel.nama}</legend
	>
	<!-- tombol tambah Tujuan Pembelajaran -->
	<div class="flex flex-col gap-2 sm:flex-row">
		<button class="btn shadow-none" type="button" onclick={() => history.back()}>
			<Icon name="left" />
			Kembali
		</button>
		<a
			class="btn mb-2 shadow-none sm:max-w-40"
			href="/mata-pelajaran/{data.mapel.id}/tp-rl/form"
			type="button"
			use:modalRoute={'add-tp-rl'}
		>
			<Icon name="plus" />
			Tambah TP
		</a>
		<!-- Tombol ini hanya aktif bila user centang mapel untuk hapus -->
		<button disabled class="btn btn-error mb-2 shadow-none sm:ml-auto sm:max-w-40">
			<Icon name="del" />
			Hapus TP
		</button>
	</div>
	<div class="bg-base-100 dark:bg-base-200 overflow-x-auto rounded-md shadow-md dark:shadow-none">
		<table class="border-base-200 table border dark:border-none">
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th style="width: 50px; min-width: 40px;"><input type="checkbox" class="checkbox" /></th>
					<th style="width: 50px; min-width: 40px;">No</th>
					<th style="width: 50%;">Tujuan Pembelajaran</th>
					<th style="width: 50%">Lingkup Materi</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#each data.mapel.tujuanPembelajaran as tp, index (tp)}
					<tr>
						<td><input type="checkbox" class="checkbox" /></td>
						<td>{index + 1}</td>
						<td>{tp.deskripsi}</td>
						<td class="flex flex-row gap-2"> {tp.lingkupMateri} </td>
						<td>
							<div class="flex flex-row gap-2">
								<button class="btn btn-sm btn-soft btn-error shadow-none" type="button">
									<Icon name="del" />
									Hapus
								</button>
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="italic text-center opacity-50" colspan="5">Belum ada data</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</fieldset>

<!-- Modal Tambah Data -->
{#if page.state.modal?.name == 'add-tp-rl'}
	<dialog id="modal-tambah-mapel" class="modal" open>
		<div class="modal-box p-4">
			<FormTpRl data={page.state.modal?.data} />
		</div>
	</dialog>
{/if}
