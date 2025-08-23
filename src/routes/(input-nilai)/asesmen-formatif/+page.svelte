<script>
	import Icon from '$lib/components/icon.svelte';
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<h2 class="mb-6 text-xl font-bold">Daftar Nilai Formatif</h2>

	<div class="flex flex-col items-center gap-2 sm:flex-row">
		<select class="select bg-base-200 w-full md:max-w-80 dark:border-none" title="Pilih kelas">
			<option value="" disabled selected> Pilih Mata Pelajaran</option>
			<option value=""> IPAS </option>
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
						<a
							class="btn btn-sm btn-soft shadow-none"
							title="Edit nilai"
							href="/asesmen-formatif/formulir-asesmen"
						>
							<Icon name="edit" />
							Nilai
						</a>
					</td>
					<td
						>Baik dalam lingkup materi 1, perlu pendalaman dalam lingkup materi 2, perlu bimbingan
						dalam lingkup materi 3, dan sangat baik dalam lingkup materi 4</td
					>
				</tr>
				<tr>
					<td>2</td>
					<td>Beni</td>
					<td>
						<a
							class="btn btn-sm btn-soft shadow-none"
							title="Edit nilai"
							href="/asesmen-formatif/formulir-asesmen"
						>
							<Icon name="edit" />
							Nilai
						</a>
					</td>
					<td>Belum ada nilai.</td>
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
