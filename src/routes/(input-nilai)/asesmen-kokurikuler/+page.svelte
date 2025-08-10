<script>
	import Icon from '$lib/components/icon.svelte';
</script>

<div class="card bg-base-100 mx-auto w-full max-w-4xl rounded-lg border border-none p-4 shadow-md">
	<h2 class="mb-6 text-xl font-bold">Daftar Nilai Kokurikuler</h2>
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

	<select class="select bg-base-200 mb-2 w-full dark:border-none" title="Pilih kelas">
		<option value="" disabled selected> Pilih Kokurikuler</option>
		<option value="">
			<!-- Need styling for this long option like wrap text -->
			bekerja sama dengan sesama teman pada beberapa projek pembelajaran interdisipliner
		</option>
		<option value="">
			kemampuan menemukan dan mengembangkan alternatif solusi yang efektif pada pada tema konservasi
			energi
		</option>
	</select>

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
					<th>Nama</th>
					<th class="w-full flex-1">Deskripsi</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>1</td>
					<td>Ali</td>
					<td> Perlu bimbingan dalam mempelajari teknik simpul. </td>
					<td>
						<label
							for="input-kokurikuler"
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
</div>

<!-- Modal Input Kokurikuler -->
<input type="checkbox" id="input-kokurikuler" class="modal-toggle" />
<div class="modal" role="dialog">
	<div class="modal-box">
		<h3 class="text-lg font-bold">Input Nilai Kokurikuler</h3>
		<p class="mb-4 text-lg">ananda <b>Ali</b></p>
		<p class="mb-2 text-lg">Pilih nilai berdasarkan 8 DPL yang dimunculkan</p>
		<!-- 8 DPL muncul yang muncul saat input kokurikuler di menu mapel -->
		<fieldset class="fieldset">
			<legend class="fieldset-legend text-lg">Kolaborasi</legend>
			<select class="select w-full">
				<option disabled selected>Pilih nilai</option>
				<option>Kurang</option>
				<option>Cukup</option>
				<option>Baik</option>
				<option>Sangat Baik</option>
			</select>
		</fieldset>
		<fieldset class="fieldset">
			<legend class="fieldset-legend text-lg">Kreativitas</legend>
			<select class="select w-full">
				<option disabled selected>Pilih nilai</option>
				<option>Kurang</option>
				<option>Cukup</option>
				<option>Baik</option>
				<option>Sangat Baik</option>
			</select>
		</fieldset>
		<div class="modal-action">
			<label for="input-kokurikuler" class="btn cursor-pointer shadow-none">
				<Icon name="close" />
				Batal
			</label>
			<button class="btn shadow-none">
				<Icon name="save" />
				Simpan
			</button>
		</div>
	</div>
</div>
