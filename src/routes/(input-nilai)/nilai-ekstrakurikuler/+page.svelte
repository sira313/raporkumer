<script>
	import Icon from '$lib/components/icon.svelte';
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<h2 class="mb-6 text-xl font-bold">Daftar Nilai Extrakurikuler</h2>

	<div class="flex flex-col items-center gap-2 sm:flex-row">
		<select class="select bg-base-200 w-full md:max-w-80 dark:border-none" title="Pilih kelas">
			<option value="" disabled selected> Pilih Ekstrakurikuler</option>
			<option value=""> Pramuka </option>
		</select>

		<!-- Cari nama murid -->
		<label class="input bg-base-200 w-full dark:border-none">
			<Icon name="search" />
			<input type="search" required placeholder="Cari nama murid..." />
		</label>
	</div>

	<!-- Tabel daftar murid -->
	<div
		class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
	>
		<table class="border-base-200 table min-w-150 border dark:border-none">
			<!-- head -->
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th style="width: 50px; min-width: 40px;">No</th>
					<th>Nama</th>
					<th class="w-full flex-1">Deskripsi Nilai</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>1</td>
					<td>Ali</td>
					<td> Perlu bimbingan dalam mempelajari teknik simpul. </td>
					<td>
						<a
							class="btn btn-sm btn-soft shadow-none"
							title="Edit nilai"
							href="/nilai-ekstrakurikuler/form-asesmen"
						>
							<Icon name="edit" />
							Nilai
						</a>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
	<!-- pagination -->
	<div class="join mx-auto mt-4">
		<button class="join-item btn btn-active">1</button>
		<button class="join-item btn">2</button>
		<button class="join-item btn">3</button>
		<button class="join-item btn">4</button>
	</div>
</div>

<!-- Modal Input Ekstrakurikuler -->
<input type="checkbox" id="input-extrakurikuler" class="modal-toggle" />
<div class="modal" role="dialog">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Input Nilai Ekstrakurikuler</h3>
		<p class="mb-4 text-lg">ananda <b>Ali</b></p>
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
					<option>Sangat baik</option>
					<option>Baik</option>
					<option>Cukup</option>
					<option>Perlu bimbingan</option>
				</select>
			</div>
			<label class="floating-label">
				<span class="label-text">Deskripsi</span>
				<textarea
					class="textarea dark:bg-base-300 w-full dark:border-none"
					placeholder="Isi deskripsi nilai ekstrakurikuler di sini"
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
