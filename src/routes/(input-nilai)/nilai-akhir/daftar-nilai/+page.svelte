<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import { page } from '$app/state';

	let { data } = $props();
	const status = $derived(data.status ?? 'empty');
	const murid = $derived(data.murid ?? null);
	const daftarNilai = $derived(status === 'ready' ? data.daftarNilai ?? [] : []);
	const ringkasan = $derived(status === 'ready'
		? data.ringkasan ?? { rataRata: null, mapelDinilai: 0, totalMapel: 0 }
		: { rataRata: null, mapelDinilai: 0, totalMapel: 0 });
	const hasNilai = $derived(status === 'ready' && ringkasan.totalMapel > 0);
	const kelasAktif = $derived(page.data.kelasAktif ?? null);
	const kelasAktifLabel = $derived.by(() => {
		if (!kelasAktif) return null;
		return kelasAktif.fase ? `${kelasAktif.nama} - ${kelasAktif.fase}` : kelasAktif.nama;
	});

	function formatScore(value: number | null) {
		if (value == null) return '&mdash;';
		return value.toLocaleString('id-ID', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
	}

	const rataRataDisplay = $derived.by(() => formatScore(ringkasan.rataRata));
	const coverageDisplay = $derived.by(() => {
		if (!ringkasan.totalMapel) return '0/0 Mata Pelajaran';
		return `${ringkasan.mapelDinilai}/${ringkasan.totalMapel} Mata Pelajaran`;
	});
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<div class="mb-2 flex flex-col gap-2 sm:flex-row">
		<a href="/nilai-akhir/" class="btn shadow-none">
			<Icon name="left" />
			Kembali
		</a>
		<button
			class="btn shadow-none sm:ml-auto"
			disabled={!hasNilai}
			title={hasNilai ? 'Unduh nilai murid' : 'Belum ada nilai untuk diexport'}
		>
			<Icon name="export" />
			Export
		</button>
	</div>

	{#if status === 'ready' && murid}
		<div class="flex flex-col gap-2 border-b border-base-200 pb-4 sm:flex-row sm:items-center">
			<div>
				<h2 class="text-xl font-bold">Rekap Nilai Akhir Murid</h2>
				<p class="text-base-content/80">{murid.nama}</p>
				{#if kelasAktifLabel}
					<p class="text-sm text-base-content/60">Kelas {kelasAktifLabel}</p>
				{/if}
			</div>
			<div class="divider sm:divider-horizontal"></div>
			<div class="flex flex-wrap gap-4">
				<div>
					<p class="text-sm uppercase tracking-wide text-base-content/60">Rata-rata</p>
					<p class="text-3xl font-semibold">{@html rataRataDisplay}</p>
				</div>
				<div>
					<p class="text-sm uppercase tracking-wide text-base-content/60">Mapel Dinilai</p>
					<p class="text-xl font-semibold">{coverageDisplay}</p>
				</div>
			</div>
		</div>

		<div role="alert" class="alert rounded-box alert-soft alert-info mt-4">
			<span class="text-2xl">
				<Icon name="info" />
			</span>
			<span>
				<p class="text-lg">
					Nilai rata-rata ananda <b>{murid.nama}</b>
				</p>
				<p class="text-2xl font-bold">{@html rataRataDisplay}</p>
				<p class="text-sm text-base-content/70">
					Menggunakan nilai akhir seluruh mata pelajaran yang tersedia.
				</p>
			</span>
		</div>

		<div class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none">
			<table class="border-base-200 table border dark:border-none">
				<thead>
					<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
						<th style="width: 50px; min-width: 40px;">No</th>
						<th class="w-full" style="min-width: 150px;">Mata Pelajaran</th>
						<th style="min-width: 120px;">Nilai Akhir</th>
					</tr>
				</thead>
				<tbody>
					{#if hasNilai}
						{#each daftarNilai as nilai}
							<tr>
								<td>{nilai.no}</td>
								<td>{nilai.mataPelajaran}</td>
								<td class={`font-semibold${nilai.sudahDinilai ? '' : ' text-base-content/60 italic'}`}>
									{@html formatScore(nilai.nilaiAkhir)}
								</td>
							</tr>
						{/each}
					{:else}
						<tr>
							<td colspan="3" class="p-8 text-center">
								<em class="opacity-60">Belum ada nilai akhir yang terinput untuk murid ini.</em>
							</td>
						</tr>
					{/if}
				</tbody>
			</table>
		</div>
	{:else}
		<div class="alert alert-soft alert-warning mt-4 flex items-start gap-3">
			<Icon name="warning" class="text-xl" />
			<span>
				{#if status === 'not-found'}
					<p class="font-semibold">Murid tidak ditemukan.</p>
					<p class="text-sm text-base-content/70">Pastikan Anda memilih murid dari daftar rekap yang sama.</p>
				{:else}
					<p class="font-semibold">Pilih murid terlebih dahulu.</p>
					<p class="text-sm text-base-content/70">Gunakan tombol "Lihat" pada halaman Rekap Nilai Akhir untuk membuka rincian.</p>
				{/if}
			</span>
		</div>
	{/if}
</div>
