<script>
	import Icon from '$lib/components/icon.svelte';
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<h2 class="mb-6 text-xl font-bold">Rekapitulasi Catatan Wali Kelas</h2>

	<!-- Cari nama murid -->
	<label class="input bg-base-200 w-full dark:border-none">
		<Icon name="search" />
		<input type="search" required placeholder="Cari nama murid..." />
	</label>

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
					<th class="w-full flex-1">Catatan</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>1</td>
					<td>Ali</td>
					<td> Giatlah belajar, raih cita-citamu. </td>
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
					<td>
						Teruslah menjadi teladan bagi teman-temanmu dengan sikap disiplin dan rajin belajar.
					</td>
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
	<!-- pagination -->
	<div class="join mx-auto mt-4">
		<button class="join-item btn btn-active">1</button>
		<button class="join-item btn">2</button>
		<button class="join-item btn">3</button>
		<button class="join-item btn">4</button>
	</div>
</div>
