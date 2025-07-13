<script>
	import Icon from '$lib/components/icon.svelte';
</script>

<div class="card bg-base-100 mx-auto w-full max-w-4xl rounded-lg border border-none p-4 shadow-md">
	<h2 class="mb-6 text-xl font-bold">Rekapitulasi Kehadiran Murid</h2>
	<div class="flex flex-col items-center gap-2 sm:flex-row">
		<!-- pilih kelas, wajib -->
		<select class="select bg-base-200 w-full dark:border-none" title="Pilih kelas">
			<option value="" disabled selected> Pilih Kelas</option>
			<option value=""> Kelas VI </option>
		</select>
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
					<th>Sakit</th>
					<th>Izin</th>
					<th>Alpa</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>1</td>
					<td>Ali</td>
					<td> 2 </td>
					<td> 1 </td>
					<td> 0 </td>
					<td>
						<!-- Ketika tombol ini di-klik maka isian cell berubah menjadi input -->
						<!-- Request fitur: tombol berubah menjadi tombol save ketika user sedang melakukan input -->
						<button class="btn btn-sm btn-soft shadow-none">
							<Icon name="edit" />
							Edit
						</button>
					</td>
				</tr>
				<tr>
					<td>1</td>
					<td>Benny</td>
					<td> 0 </td>
					<td> 0 </td>
					<td> 0 </td>
					<td>
						<!-- Ketika tombol ini di-klik maka isian cell berubah menjadi input -->
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
