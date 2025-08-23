<script>
	import Icon from '$lib/components/icon.svelte';
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<h2 class="mb-6 text-xl font-bold">Rekapitulasi Nilai Akhir</h2>
	<div class="flex flex-col gap-2 sm:flex-row">
		<!-- Export data ke excel -->
		<button class="btn shadow-none">
			<Icon name="export" />
			Export
		</button>
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
					<!-- Peringkat dari yang tertinggi -->
					<th style="width: 50px; min-width: 40px;">Peringkat</th>
					<th class="w-full" style="min-width: 100px;">Nama</th>
					<th>Nilai Rata-rata</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>1</td>
					<td>Ali</td>
					<td> 80,5 </td>
					<td>
						<a
							class="btn btn-sm btn-soft shadow-none"
							title="Edit nilai"
							href="/nilai-akhir/daftar-nilai"
						>
							<Icon name="eye" />
							Lihat
						</a>
					</td>
				</tr>
				<tr>
					<td>2</td>
					<td>Benny</td>
					<td> 80 </td>
					<td>
						<a
							class="btn btn-sm btn-soft shadow-none"
							title="Edit nilai"
							href="/nilai-akhir/daftar-nilai"
						>
							<Icon name="eye" />
							Lihat
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
