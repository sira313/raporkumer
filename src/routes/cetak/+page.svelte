<script>
	import Icon from '$lib/components/icon.svelte';
</script>

<fieldset
	class="fieldset bg-base-100 mx-auto w-full max-w-4xl rounded-lg border border-none p-4 shadow-md"
>
	<legend class="fieldset-legend">Formulir Asesmen Sumatif</legend>
	<div class="mb-2 flex flex-col gap-2 sm:flex-row">
		<!-- pilih kelas, wajib -->
		<select class="select bg-base-200 w-full dark:border-none" title="Pilih kelas">
			<option value="" disabled selected> Pilih Kelas</option>
			<option value=""> Kelas VI </option>
		</select>
		<!-- pilih dokumen yang ingin dicetak -->
		<select class="select bg-base-200 w-full dark:border-none" title="Pilih kelas">
			<option value="" disabled selected> Pilih Dokumen</option>
			<option value=""> Cover </option>
			<option value=""> Biodata </option>
			<option value=""> Rapor </option>
			<option value=""> Piagam </option>
		</select>
		<button class="btn shadow-none sm:ml-auto">
			<Icon name="print" />
			Cetak semua
		</button>
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
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>1</td>
					<td>Ali</td>
					<td>
						<button class="btn btn-sm btn-soft shadow-none" title="cetak nilai">
							<Icon name="print" />
							Cetak
						</button>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</fieldset>
