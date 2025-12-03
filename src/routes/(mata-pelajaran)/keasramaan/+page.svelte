<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	interface MataEvaluasi {
		id: number;
		nama: string;
		indikator: Array<{
			id: number;
			deskripsi: string;
		}>;
	}

	let { data } = $props<{ data: Record<string, unknown> }>();

	const mataEvaluasi = $derived((data.mataEvaluasi as MataEvaluasi[]) ?? []);
	const tableReady = $derived((data.tableReady as boolean) ?? true);
	const kelasAktif = $derived(
		data.kelasAktif as { id: number; nama: string; fase?: string } | null
	);

	const kelasLabel = $derived(
		kelasAktif
			? kelasAktif.fase
				? `${kelasAktif.nama} - ${kelasAktif.fase}`
				: kelasAktif.nama
			: '-'
	);
</script>

<div class="alert alert-info alert-soft mb-4 flex items-center gap-2 text-sm">
	<Icon name="info" />
	<span> Halaman ini khusus sekolah yang memiliki program keasramaan. </span>
</div>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<!-- Judul dan tombol -->
	<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
		<!-- Judul -->
		<div>
			<h2 class="text-xl font-bold">Daftar Nilai Keasramaan</h2>
			<p class="text-base-content/70 text-sm">Kelas aktif: {kelasLabel}</p>
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

	{#if !tableReady}
		<div class="alert border-error/60 bg-error/10 text-error-content mt-4 border border-dashed">
			<Icon name="warning" />
			<span>
				Database keasramaan belum siap. Jalankan <code>pnpm db:push</code> untuk menerapkan migrasi terbaru.
			</span>
		</div>
	{/if}

	<!-- Daftar Mata Evaluasi dengan Tabel Individual -->
	{#if mataEvaluasi.length > 0}
		<div class="mt-6 space-y-6">
			{#each mataEvaluasi as matev (matev.id)}
				<div class="space-y-3">
					<h3 class="text-lg font-semibold">{matev.nama}</h3>
					<div
						class="bg-base-100 dark:bg-base-200 overflow-x-auto rounded-md shadow-md dark:shadow-none"
					>
						<table class="border-base-200 table min-w-full border dark:border-none">
							<thead>
								<tr class="bg-base-200 dark:bg-base-300 text-left font-bold">
									<th style="width: 60px;">No</th>
									<th class="w-full" style="min-width: 260px;">Indikator</th>
									<th style="width: 140px; min-width: 120px;">Aksi</th>
								</tr>
							</thead>
							<tbody>
								{#if matev.indikator.length > 0}
									{#each matev.indikator as indicator, idx (indicator.id)}
										<tr class="hover:bg-base-200/50 dark:hover:bg-base-700/50">
											<td class="align-top">{idx + 1}</td>
											<td class="align-top">{indicator.deskripsi}</td>
											<td class="align-top">
												<div class="flex items-center">
													<button
														type="button"
														class="btn btn-xs btn-soft shadow-none"
														title="Edit indikator"
													>
														<Icon name="book" />
														Edit TP
													</button>
												</div>
											</td>
										</tr>
									{/each}
								{:else}
									<tr>
										<td class="py-4 text-center italic opacity-50" colspan="3"
											>Tidak ada indikator</td
										>
									</tr>
								{/if}
							</tbody>
						</table>
					</div>
				</div>
			{/each}
		</div>
	{:else if tableReady}
		<div class="border-base-300 bg-base-200 mt-6 rounded-lg border border-dashed p-4 text-center">
			<p class="text-base-content/60 text-sm">
				Belum ada mata evaluasi keasramaan. Gunakan tombol <strong>Kelola Mata Evaluasi</strong> untuk
				menambahkan.
			</p>
		</div>
	{/if}
</div>
