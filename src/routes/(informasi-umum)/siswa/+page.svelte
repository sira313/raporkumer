<script lang="ts">
	import IconSearch from '$lib/icons/search.svg?raw';
	import IconDownload from '$lib/icons/download.svg?raw';
	import IconPlus from '$lib/icons/plus.svg?raw';
	import iconImport from '$lib/icons/import.svg?raw';
	import iconExport from '$lib/icons/export.svg?raw';
	import iconDel from '$lib/icons/del.svg?raw';
	import iconEye from '$lib/icons/eye.svg?raw';
	import TambahSiswa from '$lib/components/modal/tambah-murid.svelte';
	import DetilSiswa from '$lib/components/modal/detil-murid.svelte';
	import HapusData from '$lib/components/modal/hapus-data.svelte';
	let showTambahMurid = false;
	let showDetilMurid = false;
	let showHapusData = false;
</script>

<fieldset class="fieldset bg-base-100 w-full rounded-lg border border-none p-4 shadow-md">
	<legend class="fieldset-legend">Formulir Dan Tabel Isian Data Siswa</legend>
	<div class="mb-4 flex flex-col gap-2 sm:flex-row">
		<!-- Tombol Tambah Manual -->
		<button class="btn flex items-center shadow-none" on:click={() => (showTambahMurid = true)}>
			<span>{@html IconPlus}</span>
			Tambah Murid
		</button>
		<TambahSiswa open={showTambahMurid} onClose={() => (showTambahMurid = false)} />
		<!-- Tombol Download template excel -->
		<button class="btn shadow-none sm:ml-auto">
			<span>{@html IconDownload}</span>
			Download Template
		</button>
		<!-- Tombol Import file template yang sudah diisi -->
		<button class="btn shadow-none">
			<span>{@html iconImport}</span>
			Import
		</button>
		<!-- Tombol Export daftar siswa dalam bentuk excel -->
		<button class="btn shadow-none">
			<span>{@html iconExport}</span>
			Export
		</button>
	</div>

	<div class="flex flex-col gap-2 sm:flex-row">
		<!-- Cari nama siswa -->
		<label class="input bg-base-200 dark:border-none">
			<span>{@html IconSearch}</span>
			<input type="search" required placeholder="Cari nama siswa..." />
		</label>
		<!-- pagination -->
		<div class="join sm:ml-auto">
			<button class="join-item btn btn-active">1</button>
			<button class="join-item btn">2</button>
			<button class="join-item btn">3</button>
			<button class="join-item btn">4</button>
		</div>
	</div>

	<!-- Tabel daftar siswa -->
	<div
		class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
	>
		<table class="border-base-200 table border dark:border-none">
			<!-- head -->
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th><input type="checkbox" checked={false} class="checkbox" /></th>
					<th style="width: 50px; min-width: 40px;">No</th>
					<th style="width: 60%;">Nama</th>
					<th>Tempat Lahir</th>
					<th>Tanggal Lahir</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				<!-- row 1 -->
				<tr>
					<td><input type="checkbox" checked={false} class="checkbox" /></td>
					<td>1</td>
					<td>Donald Trump</td>
					<td>New York</td>
					<td>14 Juni 2009</td>
					<td>
						<div class="flex flex-row gap-2">
							<button
								class="btn btn-sm btn-ghost btn-circle"
								on:click={() => (showDetilMurid = true)}
							>
								<span>{@html iconEye}</span>
							</button>
							<DetilSiswa open={showDetilMurid} onClose={() => (showDetilMurid = false)} />
							<button
								class="btn btn-sm btn-ghost btn-circle"
								on:click={() => (showHapusData = true)}
							>
								<span class="text-error">{@html iconDel}</span>
							</button>
							<HapusData open={showHapusData} onClose={() => (showHapusData = false)} />
						</div>
					</td>
				</tr>
				<!-- row 2 -->
				<tr>
					<td><input type="checkbox" checked={false} class="checkbox" /></td>
					<td>2</td>
					<td>Benyamin Netanyahu</td>
					<td>Jos Santos</td>
					<td>14 Agustus 2010</td>
					<td>
						<div class="flex flex-row gap-2">
							<button class="btn btn-sm btn-ghost btn-circle">
								<span>{@html iconEye}</span>
							</button>
							<button class="btn btn-sm btn-ghost btn-circle">
								<span class="text-error">{@html iconDel}</span>
							</button>
						</div>
					</td>
				</tr>
				<!-- row 3 -->
				<tr>
					<td><input type="checkbox" checked={true} class="checkbox" /></td>
					<td>3</td>
					<td>Vladimir Putin</td>
					<td>Las Adios</td>
					<td>14 April 2009</td>
					<td>
						<div class="flex flex-row gap-2">
							<button class="btn btn-sm btn-ghost btn-circle">
								<span>{@html iconEye}</span>
							</button>
							<button class="btn btn-sm btn-ghost btn-circle">
								<span class="text-error">{@html iconDel}</span>
							</button>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</fieldset>
