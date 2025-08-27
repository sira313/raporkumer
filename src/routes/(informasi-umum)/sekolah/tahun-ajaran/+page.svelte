<script>
	import Icon from '$lib/components/icon.svelte';
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<h2 class="mb-4 text-xl font-bold">Daftar tahun ajaran</h2>

	<div class="flex flex-col gap-2 sm:flex-row">
		<button class="btn shadow-none" type="button" onclick={() => history.back()}>
			<Icon name="left" />
			Kembali
		</button>
		<button class="btn mb-2 shadow-none sm:max-w-40" type="button">
			<Icon name="plus" />
			Tambah TA
		</button>
		<button disabled class="btn btn-error mb-2 shadow-none sm:ml-auto sm:max-w-40">
			<Icon name="del" />
			Hapus TA
		</button>
	</div>

	<!-- Tabel daftar TA -->
	<div
		class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
	>
		<table class="border-base-200 table border dark:border-none">
			<!-- head -->
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th><input type="checkbox" class="checkbox" /></th>
					<th style="width: 50px; min-width: 40px;">No</th>
					<th class="w-full" style="min-width: 100px;">Tahun Ajaran</th>
					<!-- kolom rombel otomatis disesuaikan dengan input data dari rombel per tahun ajaran -->
					<th>Rombel</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td><input type="checkbox" class="checkbox" /></td>
					<td>1</td>
					<td>2024/2025</td>
					<td> 6 </td>
					<td>
						<!-- Ketika tombol ini di-klik maka hanya isian cell tahun ajaran yang berubah menjadi input -->
						<!-- Request fitur: tombol berubah menjadi tombol save ketika user sedang melakukan input -->
						<button class="btn btn-sm btn-soft shadow-none">
							<Icon name="edit" />
							Edit
						</button>
					</td>
				</tr>
				<tr>
					<td><input type="checkbox" class="checkbox" /></td>
					<td>2</td>
					<td>2025/2026</td>
					<td> 0 </td>
					<td>
						<!-- Ketika tombol ini di-klik maka hanya isian cell tahun ajaran yang berubah menjadi input -->
						<!-- Request fitur: tombol berubah menjadi tombol save ketika user sedang melakukan input -->
						<button class="btn btn-sm btn-soft shadow-none">
							<Icon name="edit" />
							Edit
						</button>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</div>
