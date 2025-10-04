<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import { autoSubmit } from '$lib/utils';

	type MapelOption = { value: string; nama: string };
	type MuridRow = {
		id: number;
		no: number;
		nama: string;
		nilaiAkhir: number | null;
		naLingkup: number | null;
		sas: number | null;
		nilaiHref: string | null;
	};

	type PageData = {
		mapelList: MapelOption[];
		selectedMapelValue: string | null;
		selectedMapel: { id: number | null; nama: string } | null;
		daftarMurid: MuridRow[];
	};

	let { data }: { data: PageData } = $props();

	let selectedMapelValue = $state(data.selectedMapelValue ?? '');

	$effect(() => {
		selectedMapelValue = data.selectedMapelValue ?? '';
	});

	const selectedMapelLabel = $derived.by(() => data.selectedMapel?.nama ?? null);
	const hasMapel = $derived(data.mapelList.length > 0);
	const hasMurid = $derived(data.daftarMurid.length > 0);

	function formatScore(value: number | null) {
		if (value == null || Number.isNaN(value)) return '—';
		return value.toFixed(2);
	}
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
		<h2 class="text-xl font-bold">Daftar Nilai Sumatif</h2>
		{#if selectedMapelLabel}
			<span
				class="badge badge-outline border-base-300 bg-base-200/60 text-xs font-medium tracking-wide uppercase"
			>
				{selectedMapelLabel}
			</span>
		{/if}
	</div>

	<div class="flex flex-col items-center gap-2 sm:flex-row">
		<form class="w-full md:max-w-80" method="get" use:autoSubmit>
			<select
				class="select bg-base-200 w-full dark:border-none"
				title="Pilih mata pelajaran"
				name="mapel_id"
				bind:value={selectedMapelValue}
				disabled={!hasMapel}
			>
				{#if !hasMapel}
					<option value="">Belum ada mata pelajaran</option>
				{:else}
					<option value="" disabled selected={selectedMapelValue === ''}>
						Pilih Mata Pelajaran
					</option>
					{#each data.mapelList as mapel}
						<option value={mapel.value}>{mapel.nama}</option>
					{/each}
				{/if}
			</select>
		</form>
		<!-- Cari nama murid -->
		<label class="input bg-base-200 w-full dark:border-none">
			<Icon name="search" />
			<input type="search" required placeholder="Cari nama murid..." />
		</label>
	</div>

	{#if !hasMapel}
		<div class="alert alert-soft alert-info mt-6">
			<Icon name="info" />
			<span>
				Belum ada mata pelajaran intrakurikuler untuk kelas ini. Tambahkan terlebih dahulu di menu
				<strong>Intrakurikuler</strong>.
			</span>
		</div>
	{:else if !hasMurid}
		<div class="alert alert-soft alert-warning mt-6">
			<Icon name="alert" />
			<span>
				Belum ada data murid untuk kelas ini. Silakan tambah murid di menu <strong>Murid</strong>.
			</span>
		</div>
	{:else}
		<div
			class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
		>
			<table class="border-base-200 table min-w-140 border dark:border-none">
				<thead>
					<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
						<th style="width: 50px; min-width: 40px;">No</th>
						<th class="min-w-48">Nama</th>
						<th class="min-w-40">Nilai Akhir</th>
						<th class="min-w-32">Aksi</th>
					</tr>
				</thead>
				<tbody>
					{#each data.daftarMurid as murid}
						<tr>
							<td>{murid.no}</td>
							<td>{murid.nama}</td>
							<td>
								{#if murid.nilaiAkhir != null}
									<p class="font-semibold">{formatScore(murid.nilaiAkhir)}</p>
									<div class="text-base-content/70 mt-1 text-xs">
										{#if murid.naLingkup != null}
											<p>Lingkup Materi: {formatScore(murid.naLingkup)}</p>
										{/if}
										{#if murid.sas != null}
											<p>SAS: {formatScore(murid.sas)}</p>
										{/if}
									</div>
								{:else}
									<span class="text-base-content/60 text-sm italic">Belum dinilai</span>
								{/if}
							</td>
							<td>
								{#if murid.nilaiHref}
									<a
										class="btn btn-sm btn-soft shadow-none"
										title={`Nilai ${murid.nama}`}
										href={murid.nilaiHref}
									>
										<Icon name="edit" />
										Nilai
									</a>
								{:else}
									<span class="text-base-content/60 text-xs italic">Pilih mata pelajaran</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<!-- pagination -->
		<div class="join mx-auto mt-4">
			<button class="join-item btn btn-active">1</button>
			<button class="join-item btn">2</button>
			<button class="join-item btn">3</button>
			<button class="join-item btn">4</button>
		</div>
	{/if}
</div>
