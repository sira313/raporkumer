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
		Isi nilai untuk tiap tujuan pembelajaran ekstrakurikuler di bawah ini untuk Ananda Ali.
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
					<th class="min-w-40">Pilih Nilai</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>1</td>
					<!-- Semua tujuan pembelajaran dari semua lingkup materi yang di-input ditampilkan -->
					<td> menjelaskan Dasa Darma Pramuka </td>
					<td>
						<select class="select dark:bg-base-300 w-full dark:border-none" required>
							<option value="" disabled selected>Pilih Nilai</option>
							<option>Sangat baik</option>
							<option>Baik</option>
							<option>Cukup</option>
							<option>Perlu bimbingan</option>
						</select>
					</td>
				</tr>
				<tr>
					<td>2</td>
					<!-- Semua tujuan pembelajaran dari semua lingkup materi yang di-input ditampilkan -->
					<td>menerapkan Dasa Darma Pramuka</td>
					<td>
						<select class="select dark:bg-base-300 w-full dark:border-none" required>
							<option value="" disabled selected>Pilih Nilai</option>
							<option>Sangat baik</option>
							<option>Baik</option>
							<option>Cukup</option>
							<option>Perlu bimbingan</option>
						</select>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</div>
