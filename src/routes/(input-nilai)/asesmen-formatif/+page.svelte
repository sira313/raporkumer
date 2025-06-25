<script>
	import Icon from '$lib/components/icon.svelte';
	let showModal = false;
</script>

<div role="alert" class="alert alert-info mx-auto mb-4 max-w-4xl">
	<Icon name="info" />
	<span
		>Isian Asesmen Formatif ini tidak berpengaruh pada nilai rapor, hanya berfungsi untuk memantau
		kemajuan belajar siswa dan memberikan umpan balik yang membantu perbaikan pembelajaran</span
	>
</div>

<fieldset
	class="fieldset bg-base-100 mx-auto w-full max-w-4xl rounded-lg border border-none p-4 shadow-md"
>
	<legend class="fieldset-legend">Formulir Asesmen Formatif</legend>

	<div class="flex flex-col items-center gap-2 sm:flex-row">
		<!-- Cari nama murid -->
		<label class="input bg-base-200 dark:border-none">
			<input type="search" required placeholder="Cari nama murid..." />
		</label>

		<select class="select bg-base-200 dark:border-none" title="Pilih kelas">
			<option value="" disabled selected> Pilih Mata Pelajaran </option>
			<option value=""> IPAS </option>
		</select>

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
					<th>Aksi</th>
					<th class="w-full" style="min-width: 100px;">Progres</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>1</td>
					<td>Ali</td>
					<td>
						<button class="btn btn-sm btn-soft shadow-none" title="Edit nilai">
							<Icon name="edit" />
							Nilai
						</button>
					</td>
					<td
						>Baik dalam lingkup materi 1. Perlu pendalaman dalam lingkup materi 2. Perlu bimbingan
						dalam lingkup materi 3. Sangat baik dalam lingkup materi 4</td
					>
				</tr>
			</tbody>
		</table>
	</div>
</fieldset>
