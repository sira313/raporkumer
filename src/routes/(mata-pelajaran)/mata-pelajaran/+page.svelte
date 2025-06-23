<script lang="ts">
	import iconDel from '$lib/icons/del.svg?raw';
	import IconPlus from '$lib/icons/plus.svg?raw';
</script>

<div class="grid auto-rows-min grid-cols-1 items-start gap-4 md:grid-cols-2">
	<fieldset
		class="fieldset bg-base-100 rounded-box mx-auto w-full border border-none p-4 shadow-md"
	>
		<legend class="fieldset-legend">Daftar Mata Pelajaran Wajib</legend>
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
		<div class="bg-base-100 dark:bg-base-200 overflow-x-auto rounded-md shadow-md dark:shadow-none">
			<table class="border-base-200 table border dark:border-none">
				<thead>
					<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
						<th style="width: 50px; min-width: 40px;"><input type="checkbox" class="checkbox" /></th
						>
						<th style="width: 50px; min-width: 40px;">No</th>
						<th style="width: 70%;">Mata Pelajaran</th>
						<th>Aksi</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><input type="checkbox" class="checkbox" /></td>
						<td>1</td>
						<td>IPAS</td>
						<td>
							<div class="flex flex-row gap-2">
								<button class="btn btn-sm btn-ghost btn-circle" type="button">
									<span class="text-error">{@html iconDel}</span>
								</button>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</fieldset>
	<fieldset
		class="fieldset bg-base-100 rounded-box mx-auto w-full border border-none p-4 shadow-md"
	>
		<legend class="fieldset-legend">Daftar Muatan Lokal</legend>
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
		<div class="bg-base-100 dark:bg-base-200 overflow-x-auto rounded-md shadow-md dark:shadow-none">
			<!-- tabel data mapel -->
			<table class="border-base-200 table border dark:border-none">
				<thead>
					<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
						<th style="width: 50px; min-width: 40px;"><input type="checkbox" class="checkbox" /></th
						>
						<th style="width: 50px; min-width: 40px;">No</th>
						<th style="width: 70%;">Mata Pelajaran</th>
						<th>Aksi</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td><input type="checkbox" class="checkbox" /></td>
						<td>1</td>
						<td>Budi Daya Pertanian</td>
						<td>
							<div class="flex flex-row gap-2">
								<button class="btn btn-sm btn-ghost btn-circle" type="button">
									<span class="text-error">{@html iconDel}</span>
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
		<legend class="fieldset-legend">Jenis Mata Pelajaran</legend>
		<select class="select bg-base-200 w-full dark:border-none">
			<option disabled selected>Pilih jenis mata pelajaran</option>
			<option>Wajib</option>
			<option>Muatan Lokal</option>
		</select>
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
