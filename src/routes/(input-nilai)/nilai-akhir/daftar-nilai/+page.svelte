<script>
	import Icon from '$lib/components/icon.svelte';
</script>

<fieldset
	class="fieldset bg-base-100 mx-auto w-full max-w-4xl rounded-lg border border-none p-4 shadow-md"
>
	<!-- Nama berganti dinamis sesuai pilihan -->
	<legend class="fieldset-legend">Rekapitulasi Nilai Ananda Ali</legend>
	<div class="mb-2 flex flex-col gap-2 sm:flex-row">
		<a href="/nilai-akhir/" class="btn shadow-none">
			<!-- download template excel -->
			<Icon name="left" />
			Kembali
		</a>
		<button class="btn shadow-none sm:ml-auto">
			<!-- download template excel -->
			<Icon name="export" />
			Export
		</button>
	</div>

	<!-- Info rata-rata -->
	<div role="alert" class="alert alert-info">
		<Icon name="info" />
		<span>Nilai rata-rata semua mata pelajaran <b>71.25</b> dari 100</span>
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
					<th class="w-full" style="min-width: 100px;">Mata Pelajaran</th>
					<th>Nilai</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>1</td>
					<td>IPAS</td>
					<td> 78,5 </td>
				</tr>
				<tr>
					<td>1</td>
					<td>Bahasa Indonesia</td>
					<td> 80 </td>
				</tr>
			</tbody>
		</table>
	</div>
</fieldset>
