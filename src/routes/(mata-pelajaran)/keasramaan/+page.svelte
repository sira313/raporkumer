<script>
	import Icon from '$lib/components/icon.svelte';
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<!-- Judul dan tombol -->
	<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
		<!-- Judul -->
		<div>
			<h2 class="text-xl font-bold">Daftar Nilai Keasramaan</h2>
			<p class="text-base-content/70 text-sm">Kelas aktif: Kelas I - Fase A</p>
		</div>
		<!-- Tombol Tambah -->
		<div class="flex flex-row">
			<!-- Tombol untuk menambahkan mata evaluasi mengarah ke /keasramaan/mata-evaluasi -->
			<button class="btn btn-soft rounded-r-none shadow-none">
				<Icon name="plus" />
				Tambah
			</button>
			<div class="dropdown dropdown-end">
				<button
					title="Export dan Import ekstrakurikuler"
					type="button"
					tabindex="0"
					class="btn btn-soft rounded-l-none shadow-none"
					aria-disabled="false"
				>
					<Icon name="down" />
				</button>
				<ul
					tabindex="-1"
					class="border-base-300 dropdown-content menu bg-base-100 z-50 mt-2 w-48 rounded-md border p-2 shadow-lg"
				>
					<li>
						<button type="button" class="w-full text-left" aria-disabled="false">
							<Icon name="import" />
							Impor Keasramaan
						</button>
					</li>
					<li>
						<button type="button" class="w-full text-left" aria-disabled="false">
							<Icon name="export" />
							Ekspor Keasramaan
						</button>
					</li>
				</ul>
			</div>
		</div>
	</div>

	<!-- Tabel Mata evaluasi 1 -->
	<div class="fieldset mt-4">
		<!-- Judul Mata evaluasi -->
		<legend class="fieldset-legend text-xl">Kepemimpinan</legend>
		<div class="bg-base-100 dark:bg-base-200 overflow-x-auto rounded-md shadow-md dark:shadow-none">
			<table class="border-base-200 table border dark:border-none">
				<thead>
					<tr class="bg-base-200 dark:bg-base-300 text-left font-bold">
						<th class="w-10">
							<!-- Check semua -->
							<input type="checkbox" class="checkbox" />
						</th>
						<th class="w-full" style="min-width: 240px;">Indikator</th>
						<th>Deskripsi</th>
						<th>Aksi</th>
					</tr></thead
				>
				<tbody>
					<tr>
						<td><input type="checkbox" class="checkbox" /></td>
						<td>Kemampuan menjalin relasi dengan baik</td>
						<td>
							<button class="btn btn-soft btn-sm shadow-none" title="Edit deskripsi">
								<Icon name="book" />
								Edit
							</button>
						</td>
						<td>
							<div class="flex flex-row">
								<button
									class="btn btn-soft btn-sm rounded-r-none shadow-none"
									title="Edit Indikator"
								>
									<Icon name="edit" />
								</button>
								<button
									class="btn btn-soft btn-sm btn-error rounded-l-none shadow-none"
									title="Hapus Indikator"
								>
									<Icon name="del" />
								</button>
							</div>
						</td>
					</tr>
					<tr>
						<td><input type="checkbox" class="checkbox" /></td>
						<td>Kemampuan memberikan instruksi</td>
						<td>
							<button class="btn btn-soft btn-sm shadow-none" title="Edit deskripsi">
								<Icon name="book" />
								Edit
							</button>
						</td>
						<td>
							<div class="flex flex-row">
								<button
									class="btn btn-soft btn-sm rounded-r-none shadow-none"
									title="Edit Indikator"
								>
									<Icon name="edit" />
								</button>
								<button
									class="btn btn-soft btn-sm btn-error rounded-l-none shadow-none"
									title="Hapus Indikator"
								>
									<Icon name="del" />
								</button>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>

	<!-- Tabel Mata evaluasi 2 -->
	<div class="fieldset mt-4">
		<!-- Judul Mata evaluasi -->
		<legend class="fieldset-legend text-xl">Ketaatan Ibadah</legend>
		<div class="bg-base-100 dark:bg-base-200 overflow-x-auto rounded-md shadow-md dark:shadow-none">
			<table class="border-base-200 table border dark:border-none">
				<thead>
					<tr class="bg-base-200 dark:bg-base-300 text-left font-bold">
						<th class="w-10">
							<!-- Check semua -->
							<input type="checkbox" class="checkbox" />
						</th>
						<th class="w-full" style="min-width: 250px;">Indikator</th>
						<th>Deskripsi</th>
						<th>Aksi</th>
					</tr></thead
				>
				<tbody>
					<tr>
						<td><input type="checkbox" class="checkbox" /></td>
						<td>Etika Beribadah</td>
						<td>
							<button class="btn btn-soft btn-sm shadow-none" title="Edit deskripsi">
								<Icon name="book" />
								Edit
							</button>
						</td>
						<td>
							<div class="flex flex-row">
								<button
									class="btn btn-soft btn-sm rounded-r-none shadow-none"
									title="Edit Indikator"
								>
									<Icon name="edit" />
								</button>
								<button
									class="btn btn-soft btn-sm btn-error rounded-l-none shadow-none"
									title="Hapus Indikator"
								>
									<Icon name="del" />
								</button>
							</div>
						</td>
					</tr>
					<tr>
						<td><input type="checkbox" class="checkbox" /></td>
						<td>Konsistensi Beribadah</td>
						<td>
							<button class="btn btn-soft btn-sm shadow-none" title="Edit deskripsi">
								<Icon name="book" />
								Edit
							</button>
						</td>
						<td>
							<div class="flex flex-row">
								<button
									class="btn btn-soft btn-sm rounded-r-none shadow-none"
									title="Edit Indikator"
								>
									<Icon name="edit" />
								</button>
								<button
									class="btn btn-soft btn-sm btn-error rounded-l-none shadow-none"
									title="Hapus Indikator"
								>
									<Icon name="del" />
								</button>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</div>
