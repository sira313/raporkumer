<script lang="ts">
	import iconDel from '$lib/icons/del.svg?raw';
	import IconPlus from '$lib/icons/plus.svg?raw';
	import IconEdit from '$lib/icons/edit.svg?raw';
</script>

<div class="mx-auto grid max-w-4xl gap-4">
	<!-- Data Mapel -->
	<fieldset
		class="fieldset bg-base-100 rounded-box mx-auto w-full border border-none p-4 shadow-md"
	>
		<legend class="fieldset-legend">Daftar Mata Pelajaran</legend>
		<!-- tombol tambah mapel -->
		<div class="flex flex-col sm:flex-row">
			<button
				class="btn mb-2 shadow-none sm:max-w-40"
				type="button"
				on:click={() =>
					(document.getElementById('modal-tambah-mapel') as HTMLDialogElement)?.showModal()}
			>
				<span>{@html IconPlus}</span>
				Tambah Mapel
			</button>
			<!-- Tombol ini hanya aktif bila user centang mapel untuk hapus -->
			<button disabled class="btn btn-error mb-2 shadow-none sm:ml-auto sm:max-w-40">
				<span>{@html iconDel}</span>
				Hapus Mapel
			</button>
		</div>
		<!-- Tabel Mapel Wajib -->
		<legend class="fieldset-legend"> Mata Pelajaran Wajib </legend>
		<div class="bg-base-100 dark:bg-base-200 overflow-x-auto rounded-md shadow-md dark:shadow-none">
			<table class="border-base-200 table border dark:border-none">
				<thead>
					<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
						<th style="width: 50px; min-width: 40px;"><input type="checkbox" class="checkbox" /></th
						>
						<th style="width: 50px; min-width: 40px;">No</th>
						<th style="width: 50%;">Mata Pelajaran</th>
						<th>KKM</th>
						<th>Tujuan Pembelajaran</th>
						<th>Aksi</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><input type="checkbox" class="checkbox" /></td>
						<td>1</td>
						<td>IPAS</td>
						<td>76</td>
						<td class="flex flex-row gap-2">
							<a href="/mata-pelajaran/tp-rl" class="btn btn-sm btn-soft shadow-none" type="button">
								<span>{@html IconEdit}</span>
								Edit TP
							</a>
						</td>
						<td>
							<div class="flex flex-row gap-2">
								<button class="btn btn-sm btn-soft btn-error shadow-none" type="button">
									<span>{@html iconDel}</span>
									Hapus
								</button>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
		<!-- Data Muatan lokal -->
		<legend class="fieldset-legend mt-2"> Muatan Lokal </legend>
		<div class="bg-base-100 dark:bg-base-200 overflow-x-auto rounded-md shadow-md dark:shadow-none">
			<table class="border-base-200 table border dark:border-none">
				<thead>
					<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
						<th style="width: 50px; min-width: 40px;"><input type="checkbox" class="checkbox" /></th
						>
						<th style="width: 50px; min-width: 40px;">No</th>
						<th style="width: 50%;">Mata Pelajaran</th>
						<th>KKM</th>
						<th>Tujuan Pembelajaran</th>
						<th>Aksi</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><input type="checkbox" class="checkbox" /></td>
						<td>1</td>
						<td>Budidaya Pertanian</td>
						<td>76</td>
						<td class="flex flex-row gap-2">
							<button class="btn btn-sm btn-soft shadow-none" type="button">
								<span>{@html IconEdit}</span>
								Edit TP
							</button>
						</td>
						<td>
							<div class="flex flex-row gap-2">
								<button class="btn btn-sm btn-soft btn-error shadow-none" type="button">
									<span>{@html iconDel}</span>
									Hapus
								</button>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</fieldset>
</div>

<!-- Modal Tambah Data -->
<dialog id="modal-tambah-mapel" class="modal">
	<fieldset class="modal-box fieldset p-4">
		<legend class="fieldset-legend">
			<code class="bg-base-200 rounded-xl px-2">Tambah Mata Pelajaran</code>
		</legend>
		<legend class="fieldset-legend">Nama Mata Pelajaran</legend>
		<input
			type="text"
			class="input validator bg-base-200 w-full dark:border-none"
			placeholder="Contoh: IPAS"
		/>
		<legend class="fieldset-legend">KKM</legend>
		<input
			type="text"
			class="input validator bg-base-200 w-full dark:border-none"
			placeholder="Contoh: 76"
		/>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Jenis Mata Pelajaran</legend>
			<select class="select bg-base-200 w-full dark:border-none">
				<option disabled selected>Pilih Jenis Mata Pelajaran</option>
				<option>Mata Pelajaran Wajib</option>
				<option>Muatan Lokal</option>
			</select>
		</fieldset>
		<div class="mt-4 flex justify-end gap-2">
			<button
				type="button"
				class="btn shadow-none"
				on:click={() =>
					(document.getElementById('modal-tambah-mapel') as HTMLDialogElement)?.close()}
			>
				Batal
			</button>
			<button type="submit" class="btn btn-primary shadow-none">Simpan</button>
		</div>
	</fieldset>
</dialog>
