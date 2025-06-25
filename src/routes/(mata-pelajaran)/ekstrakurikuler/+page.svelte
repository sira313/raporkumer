<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
</script>

<fieldset
	class="fieldset bg-base-100 rounded-box mx-auto w-full max-w-4xl border border-none p-4 shadow-md"
>
	<legend class="fieldset-legend">Daftar Extrakurikuler</legend>
	<!-- tombol tambah mapel -->
	<div class="flex flex-col gap-2 sm:flex-row">
		<select class="select bg-base-200 dark:border-none" title="Pilih kelas">
			<option value="" disabled selected> Pilih Kelas</option>
			<option value=""> Kelas VI </option>
		</select>
		<div class="flex w-full flex-row gap-2">
			<input
				class="input bg-base-200 validator flex-1 dark:border-none"
				placeholder="Ketik nama ekstrakurikuler"
			/>
			<button class="btn shadow-none">
				<Icon name="plus" />
				Tambah
			</button>
		</div>
		<!-- Tombol ini hanya aktif bila user centang mapel untuk hapus -->
		<button disabled class="btn btn-error mb-2 shadow-none sm:ml-auto sm:max-w-40">
			<Icon name="del" />
			Hapus
		</button>
	</div>
	<div class="bg-base-100 dark:bg-base-200 overflow-x-auto rounded-md shadow-md dark:shadow-none">
		<!-- Tabel data -->
		<table class="border-base-200 table border dark:border-none">
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th style="width: 50px; min-width: 40px;"><input type="checkbox" class="checkbox" /></th>
					<th style="width: 50px; min-width: 40px;">No</th>
					<th class="w-full" style="min-width: 150px;">Mata Pelajaran</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td><input type="checkbox" class="checkbox" /></td>
					<td>1</td>
					<td>Sepak bola</td>
					<td>
						<div class="flex flex-row gap-2">
							<button class="btn btn-sm btn-ghost btn-circle" type="button">
								<span class="text-error"><Icon name="del" /></span>
							</button>
						</div>
					</td>
				</tr>
				<tr>
					<td><input type="checkbox" class="checkbox" /></td>
					<td>1</td>
					<td>Pramuka</td>
					<td>
						<div class="flex flex-row gap-2">
							<button class="btn btn-sm btn-ghost btn-circle" type="button">
								<span class="text-error"><Icon name="del" /></span>
							</button>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</fieldset>
