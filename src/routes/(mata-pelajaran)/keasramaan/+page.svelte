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
		<!-- Tombol untuk mengelola mata evaluasi -->
		<div class="flex flex-row">
			<a 
				href="/keasramaan/mata-evaluasi" 
				class="btn btn-soft rounded-r-none shadow-none"
				title="Kelola mata evaluasi keasramaan"
			>
				<Icon name="edit" />
				Kelola Mata Evaluasi
			</a>
			<div class="dropdown dropdown-end">
				<button
					title="Export dan Import keasramaan"
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

	<div class="alert alert-info alert-soft mt-4 flex items-center gap-2 text-sm">
		<Icon name="info" />
		<span>Gunakan tombol <strong>Kelola Mata Evaluasi</strong> untuk menambah, mengubah, atau menghapus mata evaluasi beserta indikatornya.</span>
	</div>
</div>

