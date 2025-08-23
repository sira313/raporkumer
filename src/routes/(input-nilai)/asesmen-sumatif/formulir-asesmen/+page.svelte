<script>
	import Icon from '$lib/components/icon.svelte';
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<div class="flex flex-col gap-2 sm:flex-row">
		<a href="/asesmen-sumatif/" class="btn shadow-none">
			<Icon name="left" />
			Kembali
		</a>
		<button class="btn btn-primary shadow-none sm:ml-auto">
			<Icon name="save" />
			Simpan
		</button>
	</div>
	<h3 class="mt-4 pb-2 text-lg font-bold">
		Isi nilai sumatif tiap tujuan pembelajaran di bawah ini untuk Ananda Ali.
	</h3>
	<div
		class="bg-base-100 dark:bg-base-200 border-base-200 mt-2 overflow-x-auto rounded-md shadow-md dark:shadow-none"
	>
		<table class="border-base-200 table border dark:border-none">
			<!-- head -->
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th>No</th>
					<th class="w-full" style="min-width: 100px"> Tujuan Pembelajaran </th>
					<th class="min-w-30">Nilai</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>1</td>
					<!-- Semua tujuan pembelajaran dari semua lingkup materi yang di-input ditampilkan -->
					<td>
						Mengidentifikasi ciri-ciri makhluk hidup dan memahami pentingnya pelestarian lingkungan
						tempat hidup makhluk hidup.
					</td>
					<td>
						<!-- Limit rentang 1-100, 2 angka belakang koma. Munculkan toast error jika user melakukan kesalahan -->
						<input
							type="number"
							class="input dark:bg-base-300 validator dark:border-none"
							required
							placeholder="Isi nilai"
							min="1"
							max="100"
							title="Rentang 1-100, 2 angka belakang koma"
						/>
					</td>
				</tr>
				<tr>
					<td>1</td>
					<!-- Semua tujuan pembelajaran dari semua lingkup materi yang di-input ditampilkan -->
					<td>Menjelaskan cara mitigasi terhadap bencana alam.</td>
					<td>
						<!-- Limit rentang 1-100, 2 angka belakang koma. Munculkan toast error jika user melakukan kesalahan -->
						<input
							type="number"
							class="input dark:bg-base-300 validator dark:border-none"
							required
							placeholder="Isi nilai"
							min="1"
							max="100"
							title="Rentang 1-100, 2 angka belakang koma"
						/>
					</td>
				</tr>
			</tbody>
		</table>
	</div>

	<!-- info rata-rata -->
	<div role="alert" class="alert rounded-box alert-soft alert-info mt-4">
		<span class="text-2xl">
			<Icon name="info" />
		</span>
		<span>
			<p class="text-lg">NA Sumatif Lingkup Materi</p>
			<p class="text-2xl font-bold">78,5</p>
			<p class="text-sm">Rata-rata dari seluruh lingkup materi</p>
		</span>
	</div>

	<!-- tabel SAS -->
	<h3 class="mt-6 pb-2 text-lg font-bold">
		Isi Sumatif Akhir Semester di bawah ini untuk Ananda Ali.
	</h3>
	<div
		class="bg-base-100 dark:bg-base-200 border-base-200 mt-2 overflow-x-auto rounded-md shadow-md dark:shadow-none"
	>
		<table class="border-base-200 table border dark:border-none">
			<!-- head -->
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th>No</th>
					<th class="w-full" style="min-width: 100px">Jenis Tes</th>
					<th class="min-w-30">Nilai</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>1</td>
					<td>Nilai Tes Akhir Semester (SAS)</td>
					<td>
						<!-- Limit rentang 1-100, 2 angka belakang koma. Munculkan toast error jika user melakukan kesalahan -->
						<input
							type="number"
							class="input dark:bg-base-300 validator dark:border-none"
							required
							placeholder="Isi nilai"
							min="1"
							max="100"
							title="Rentang 1-100, 2 angka belakang koma"
						/>
					</td>
				</tr>
				<tr>
					<td>1</td>
					<!-- Semua tujuan pembelajaran dari semua lingkup materi yang di-input ditampilkan -->
					<td>Nilai Non Tes Akhir Semester (SAS)</td>
					<td>
						<!-- Limit rentang 1-100, 2 angka belakang koma. Munculkan toast error jika user melakukan kesalahan -->
						<input
							type="number"
							class="input dark:bg-base-300 validator dark:border-none"
							required
							placeholder="Isi nilai"
							min="1"
							max="100"
							title="Rentang 1-100, 2 angka belakang koma"
						/>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
	<!-- info rata-rata SAS -->
	<div role="alert" class="alert rounded-box alert-soft alert-info mt-4">
		<span class="text-2xl">
			<Icon name="info" />
		</span>
		<span>
			<p class="text-lg">NA Sumatif Akhir Semester</p>
			<p class="text-2xl font-bold">80,5</p>
			<p class="text-sm">Rata-rata dari Non Tes dan Tes</p>
		</span>
	</div>

	<!-- info rata-rata lingkup materi dan sas -->
	<div role="alert" class="alert rounded-box alert-success mt-6">
		<span class="text-2xl">
			<Icon name="check" />
		</span>
		<span>
			<p class="text-lg">Nilai Akhir</p>
			<p class="text-2xl font-bold">78,5</p>
			<p class="text-sm">Rata-rata dari NA Sumatif Lingkup Materi dan NA Sumatif Akhir Semester</p>
			<p class="text-sm font-bold">Sudah mencapai KKM</p>
		</span>
	</div>
</div>
