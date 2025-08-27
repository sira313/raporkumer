<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
</script>

<div class="card bg-base-100 rounded-box mx-auto w-full max-w-4xl border border-none p-4 shadow-md">
	<!-- Mata ekstrakurikuler berubah dinamis sesuai ekstrakurikuler yang dipilih -->
	<h2 class="mb-6 text-xl font-bold">
		<span class="opacity-50">Ekstrakurikuler:</span>
		Sepak Bola
	</h2>

	<!-- tombol tambah Tujuan Pembelajaran -->
	<div class="flex flex-col gap-2 sm:flex-row">
		<button class="btn shadow-none" type="button" onclick={() => history.back()}>
			<Icon name="left" />
			Kembali
		</button>
		<button class="btn mb-2 shadow-none sm:max-w-40" type="button">
			<Icon name="plus" />
			Tambah TP
		</button>
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
					<th class="w-full flex-1">Tujuan Pemelajaran</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="align-top"><input type="checkbox" class="checkbox" /></td>
					<td class="align-top">1</td>
					<td class="align-top">Menggiring bola</td>
					<td>
						<div class="flex gap-2">
							<button class="btn btn-sm btn-soft shadow-none" type="button" title="Edit">
								<Icon name="edit" />
							</button>
							<button class="btn btn-sm btn-soft btn-error shadow-none" type="button" title="Hapus">
								<Icon name="del" />
							</button>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</div>
