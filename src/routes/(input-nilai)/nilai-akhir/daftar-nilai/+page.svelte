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

	<!-- info rata-rata -->
	<div role="alert" class="alert rounded-box alert-soft alert-info mt-4">
		<span class="text-2xl">
			<Icon name="info" />
		</span>
		<span>
			<p class="text-lg">Nilai rata-rata</p>
			<p class="text-2xl font-bold">80,5</p>
			<p class="text-sm">dari semua mata pelajaran</p>
		</span>
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
