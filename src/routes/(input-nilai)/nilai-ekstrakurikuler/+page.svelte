<script>
	import Icon from '$lib/components/icon.svelte';
</script>

<fieldset
	class="fieldset bg-base-100 mx-auto w-full max-w-4xl rounded-lg border border-none p-4 shadow-md"
>
	<legend class="fieldset-legend">Formulir Asesmen Sumatif</legend>
	<div class="mb-2 flex flex-col gap-2 sm:flex-row">
		<button class="btn shadow-none">
			<!-- download template excel -->
			<Icon name="download" />
			Download template
		</button>
		<button class="btn shadow-none sm:ml-auto">
			<Icon name="import" />
			Import
		</button>
	</div>

	<div class="mb-2 flex flex-col items-center gap-2 sm:flex-row">
		<!-- pilih Kelas dan mapel dulu, wajib! -->
		<select class="select bg-base-200 w-full dark:border-none" title="Pilih kelas">
			<option value="" disabled selected> Pilih Kelas</option>
			<option value=""> Kelas VI </option>
		</select>
		<select class="select bg-base-200 w-full dark:border-none" title="Pilih kelas">
			<option value="" disabled selected> Pilih Ekstrakurikuler</option>
			<option value=""> Pramuka </option>
		</select>
	</div>

	<div class="flex flex-col items-center gap-2 sm:flex-row">
		<!-- Cari nama murid -->
		<label class="input bg-base-200 w-full dark:border-none">
			<Icon name="search" />
			<input type="search" required placeholder="Cari nama murid..." />
		</label>

		<!-- pagination -->
		<div class="join sm:ml-auto">
			<button class="join-item btn btn-active">1</button>
			<button class="join-item btn">2</button>
			<button class="join-item btn">3</button>
			<button class="join-item btn">4</button>
		</div>
	</div>

	<!-- Tabel daftar murid -->
	<div
		class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
	>
		<table class="border-base-200 table border dark:border-none">
			<!-- head -->
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th style="width: 50px; min-width: 40px;">No</th>
					<th class="w-full" style="min-width: 100px;">Nama</th>
					<th>Nilai Akhir</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>1</td>
					<td>Ali</td>
					<td> C </td>
					<td>
						<label
							for="input-extrakurikuler"
							class="btn btn-sm btn-soft shadow-none"
							title="Edit nilai"
						>
							<Icon name="edit" />
							Nilai
						</label>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</fieldset>

<!-- Modal Input Ekstrakurikuler -->
<input type="checkbox" id="input-extrakurikuler" class="modal-toggle" />
<div class="modal" role="dialog">
	<div class="modal-box">
		<h3 class="mb-4 text-lg font-bold">Input Nilai Ekstrakurikuler</h3>
		<form>
			<div class="form-control mb-3">
				<label class="label" for="nilai-ekstrakurikuler">
					<span class="label-text">Nilai</span>
				</label>
				<select
					id="nilai-ekstrakurikuler"
					class="select dark:bg-base-300 w-full dark:border-none"
					required
				>
					<option value="" disabled selected>Pilih Nilai</option>
					<option>A</option>
					<option>B</option>
					<option>C</option>
				</select>
			</div>
			<label class="floating-label">
				<span class="label-text">Deskripsi</span>
				<textarea
					class="textarea dark:bg-base-300 w-full dark:border-none"
					placeholder="Isi deskripsi nilai ekstrakurikuler di sini validator"
					rows="4"
					required
				></textarea>
			</label>
			<div class="modal-action">
				<label for="input-extrakurikuler" class="btn shadow-none">
					<Icon name="close-sm" />
					Batal
				</label>
				<button type="submit" class="btn btn-primary shadow-none">
					<Icon name="save" />
					Simpan
				</button>
			</div>
		</form>
	</div>
	<label class="modal-backdrop" for="input-extrakurikuler"></label>
</div>
