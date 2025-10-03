<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import { autoSubmit } from '$lib/utils';

	type ProgressCategory = 'sangat-baik' | 'baik' | 'perlu-pendalaman' | 'perlu-bimbingan';
	type PageData = {
		mapelList: Array<{ id: number; nama: string }>;
		selectedMapelId: number | null;
		daftarMurid: Array<{
			id: number;
			nama: string;
			no: number;
			progressText: string | null;
			progressSummaryParts: Array<{
				kategori: ProgressCategory;
				kategoriLabel: string;
				lingkupMateri: string;
				tuntas: number;
				totalTujuan: number;
			}>;
			hasPenilaian: boolean;
			nilaiHref: string | null;
		}>;
		jumlahTujuan: number;
		selectedMapel?: { id: number; nama: string } | null;
	};

	let { data }: { data: PageData } = $props();

	const CATEGORY_TEXT_CLASS: Record<ProgressCategory, string> = {
		'sangat-baik': 'text-info',
		baik: 'text-primary',
		'perlu-pendalaman': 'text-warning',
		'perlu-bimbingan': 'text-error'
	};

	let selectedMapelValue = $state(
		data.selectedMapelId == null ? '' : String(data.selectedMapelId)
	);

	$effect(() => {
		selectedMapelValue = data.selectedMapelId == null ? '' : String(data.selectedMapelId);
	});

	function escapeHtml(value: string) {
		return value
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
	}

	function summaryWithHighlights(murid: (typeof data.daftarMurid)[number]) {
		if (!murid.progressSummaryParts.length || !murid.progressText) {
			return murid.progressText ?? '';
		}

		const source = escapeHtml(murid.progressText);
		let cursor = 0;
		let html = '';
		for (const part of murid.progressSummaryParts) {
			const token = `${part.tuntas}/${part.totalTujuan} TP`;
			const nextIndex = source.indexOf(token, cursor);
			if (nextIndex === -1) {
				continue;
			}
			html += source.slice(cursor, nextIndex);
			html += `<span class="${CATEGORY_TEXT_CLASS[part.kategori]} font-semibold">${token}</span>`;
			cursor = nextIndex + token.length;
		}
		html += source.slice(cursor);
		return html;
	}
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<div class="mb-2 flex flex-wrap items-center justify-between gap-2">
		<h2 class="text-xl font-bold">Daftar Nilai Formatif</h2>
		{#if data.selectedMapel}
			<span class="badge badge-outline border-base-300 bg-base-200/60 text-xs font-medium uppercase tracking-wide">
				{data.selectedMapel.nama}
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
				disabled={data.mapelList.length === 0}
			>
				{#if data.mapelList.length === 0}
					<option value="">Belum ada mata pelajaran</option>
				{:else}
					<option value="" disabled selected={selectedMapelValue === ''}>
						Pilih Mata Pelajaran
					</option>
					{#each data.mapelList as mapel}
						{@const optionValue = String(mapel.id)}
						<option value={optionValue} selected={selectedMapelValue === optionValue}>
							{mapel.nama}
						</option>
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

	{#if data.mapelList.length === 0}
		<div class="alert alert-soft alert-info mt-6">
			<Icon name="info" />
			<span>
				Belum ada mata pelajaran intrakurikuler di kelas ini. Tambahkan terlebih dahulu di menu
				<strong>Intrakurikuler</strong>.
			</span>
		</div>
	{:else if data.daftarMurid.length === 0}
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
			<table class="border-base-200 table min-w-150 border dark:border-none">
				<thead>
					<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
						<th style="width: 50px; min-width: 40px;">No</th>
						<th class="min-w-40">Nama</th>
						<th>Aksi</th>
						<th class="w-full" style="min-width: 220px;">Progres</th>
					</tr>
				</thead>
				<tbody>
					{#each data.daftarMurid as murid}
						<tr>
							<td class="align-top">{murid.no}</td>
							<td class="align-top">{murid.nama}</td>
							<td class="align-top">
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
									<span class="text-xs italic text-base-content/60">Pilih mata pelajaran</span>
								{/if}
							</td>
							<td class="align-top">
								{#if murid.progressText}
									<p class={murid.progressSummaryParts.length ? 'text-sm text-base-content' : 'text-sm italic text-base-content/70'}>
										{@html summaryWithHighlights(murid)}
									</p>
								{:else}
									<span class="text-sm italic text-base-content/70"
										>Pilih mata pelajaran untuk melihat progres</span
									>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
