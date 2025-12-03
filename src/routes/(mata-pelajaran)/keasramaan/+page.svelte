<script lang="ts">
	import { goto } from '$app/navigation';
	import Icon from '$lib/components/icon.svelte';
	import MataEvaluasiDisplay from '$lib/components/keasramaan/MataEvaluasiDisplay.svelte';

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

	// eslint-disable-next-line svelte/no-navigation-without-resolve
	const navigateToMatEval = () => goto('/keasramaan/mata-evaluasi');
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
			<button
				type="button"
				class="btn btn-soft rounded-r-none shadow-none"
				title="Kelola mata evaluasi keasramaan"
				onclick={navigateToMatEval}
			>
				<Icon name="edit" />
				Kelola Mata Evaluasi
			</button>
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
							Impor matev
						</button>
					</li>
					<li>
						<button type="button" class="w-full text-left" aria-disabled="false">
							<Icon name="export" />
							Ekspor matev
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
	<MataEvaluasiDisplay {mataEvaluasi} {tableReady} />
</div>
