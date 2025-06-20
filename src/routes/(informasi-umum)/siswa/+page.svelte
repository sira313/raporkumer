<script lang="ts">
	import IconSearch from '$lib/icons/search.svg?raw';
</script>

<fieldset class="fieldset bg-base-100 w-full rounded-lg border border-none p-4 shadow-md">
	<legend class="fieldset-legend">Formulir Dan Tabel Isian Data Siswa</legend>
	<div class="mb-4 flex flex-col gap-2 sm:flex-row">
		<!-- Tombol Tambah Manual -->
		<button class="btn btn-primary flex items-center shadow-none">Tambah Siswa</button>
		<!-- Tombol Download template excel -->
		<button class="btn btn-success shadow-none sm:ml-auto">Download Template</button>
		<!-- Tombol Import file template yang sudah diisi -->
		<button class="btn btn-warning shadow-none">Import</button>
		<!-- Tombol Export daftar siswa dalam bentuk excel -->
		<button class="btn btn-accent shadow-none">Export</button>
	</div>

	<div class="flex flex-col gap-2 sm:flex-row">
		<!-- Cari nama siswa -->
		<label class="input bg-base-200 border-none">
			<span>{@html IconSearch}</span>
			<input type="search" required placeholder="Cari nama siswa..." />
		</label>
		<!-- pagination -->
		<div class="join sm:ml-auto">
			<button class="join-item btn">1</button>
			<button class="join-item btn btn-active">2</button>
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
					<th style="width: 50px; min-width: 40px;">No</th>
					<th style="width: 80%;">Nama</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				<!-- row 1 -->
				<tr>
					<td>1</td>
					<td>Donald Trump</td>
					<td>
						<div class="flex flex-col gap-2 sm:flex-row">
							<button class="btn btn-info btn-sm shadow-none"> Lihat </button>
							<button class="btn btn-accent btn-sm shadow-none"> Hapus </button>
						</div>
					</td>
				</tr>
				<!-- row 2 -->
				<tr>
					<td>2</td>
					<td>Benyamin Netanyahu</td>
					<td>
						<div class="flex flex-col gap-2 sm:flex-row">
							<button class="btn btn-info btn-sm shadow-none"> Lihat </button>
							<button class="btn btn-accent btn-sm shadow-none"> Hapus </button>
						</div>
					</td>
				</tr>
				<!-- row 3 -->
				<tr>
					<td>3</td>
					<td>Vladimir Putin</td>
					<td>
						<div class="flex flex-col gap-2 sm:flex-row">
							<button class="btn btn-info btn-sm shadow-none"> Lihat </button>
							<button class="btn btn-accent btn-sm shadow-none"> Hapus </button>
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</fieldset>
