<script>
	import Icon from '$lib/components/icon.svelte';
</script>

<div class="div bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<div class="mb-6 flex flex-col gap-2 sm:flex-row">
		<a href="/asesmen-formatif/" class="btn shadow-none">
			<Icon name="left" />
			Kembali
		</a>
		<button class="btn btn-primary shadow-none sm:ml-auto">
			<Icon name="save" />
			Simpan
		</button>
	</div>
	<h3 class="pb-2 text-lg font-bold">
		Apakah Ali telah memenuhi setiap tujuan pembelajaran di bawah ini?
	</h3>
	<div
		class="bg-base-100 dark:bg-base-200 border-base-200 mt-2 overflow-x-auto rounded-md shadow-md dark:shadow-none"
	>
		<table class="border-base-200 table border dark:border-none">
			<!-- head -->
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th>No</th>
					<th class="w-full" style="min-width: 100px;">Tujuan Pembelajaran</th>
					<th>Ya</th>
					<th>Tidak</th>
				</tr>
			</thead>
			<tbody>
				<!-- tambahkan class="border-l-success border-l-4" bila user centang yes -->
				<!-- tambahkan class="border-l-error border-l-4" bila user centang no -->
				<tr class="border-l-success border-l-4">
					<td>1</td>
					<!-- Semua tujuan pembelajaran dari semua lingkup materi yang di-input ditampilkan -->
					<td>
						Mengidentifikasi ciri-ciri makhluk hidup dan memahami pentingnya pelestarian lingkungan
						tempat hidup makhluk hidup.
					</td>
					<td>
						<input type="checkbox" checked class="checkbox" />
					</td>
					<td>
						<input type="checkbox" class="checkbox" />
					</td>
				</tr>
				<tr class="border-l-error border-l-4">
					<td>1</td>
					<!-- Semua tujuan pembelajaran dari semua lingkup materi yang di-input ditampilkan -->
					<td> Menjelaskan cara mitigasi terhadap bencana alam. </td>
					<td>
						<input type="checkbox" class="checkbox" />
					</td>
					<td>
						<input type="checkbox" checked class="checkbox" />
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</div>
