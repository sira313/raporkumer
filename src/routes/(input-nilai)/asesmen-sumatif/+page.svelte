<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/icon.svelte';
	import { autoSubmit, searchQueryMarker } from '$lib/utils';
	import { onDestroy } from 'svelte';

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

	type PageState = {
		search: string | null;
		currentPage: number;
		totalPages: number;
		totalItems: number;
		perPage: number;
	};

	type PageData = {
		mapelList: MapelOption[];
		selectedMapelValue: string | null;
		selectedMapel: { id: number | null; nama: string } | null;
		kelasAktif?: { nama?: string; fase?: string } | null;
		daftarMurid: MuridRow[];
		page: PageState;
	};

	let { data }: { data: PageData } = $props();

	let selectedMapelValue = $state(data.selectedMapelValue ?? '');
	let searchTerm = $state(data.page.search ?? '');
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		const latestSelected = data.selectedMapelValue ?? '';
		if (selectedMapelValue !== latestSelected) {
			selectedMapelValue = latestSelected;
		}
	});

	$effect(() => {
		if (searchTimer) return;
		const latestSearch = data.page.search ?? '';
		if (searchTerm !== latestSearch) {
			searchTerm = latestSearch;
		}
	});

	const selectedMapelLabel = $derived.by(() => data.selectedMapel?.nama ?? null);
	const kelasAktifLabel = $derived.by(() => data.kelasAktif?.nama ?? null);
	const hasMapel = $derived(data.mapelList.length > 0);
	const currentPage = $derived.by(() => data.page.currentPage ?? 1);
	const totalPages = $derived.by(() => Math.max(1, data.page.totalPages ?? 1));
	const pages = $derived.by(() => Array.from({ length: totalPages }, (_, index) => index + 1));
	const searchActive = $derived(Boolean(data.page.search));
	const hasResults = $derived(data.daftarMurid.length > 0);

	function formatScore(value: number | null) {
		if (value == null || Number.isNaN(value)) return '—';
		return value.toFixed(2);
	}

	function buildSearchUrl(rawValue: string) {
		const params = new URLSearchParams(page.url.search);
		const cleaned = rawValue.trim();
		const current = params.get('q') ?? '';
		const searchChanged = cleaned !== current;
		if (cleaned) {
			params.set('q', cleaned);
		} else {
			params.delete('q');
		}
		if (searchChanged) {
			params.delete('page');
		}
		const nextQuery = params.toString();
		const nextUrl = `${page.url.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
		const currentUrl = `${page.url.pathname}${page.url.search}`;
		if (nextUrl === currentUrl) {
			return null;
		}
		return nextUrl;
	}

	async function applySearch(rawValue: string) {
		const target = buildSearchUrl(rawValue);
		if (!target) return;
		searchTimer = undefined;
		await goto(target, { replaceState: true, keepFocus: true });
	}

	function buildPageUrl(pageNumber: number) {
		const params = new URLSearchParams(page.url.search);
		const sanitized = pageNumber < 1 ? 1 : pageNumber;
		if (sanitized <= 1) {
			params.delete('page');
		} else {
			params.set('page', String(sanitized));
		}
		const nextQuery = params.toString();
		const nextUrl = `${page.url.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
		const currentUrl = `${page.url.pathname}${page.url.search}`;
		if (nextUrl === currentUrl) {
			return null;
		}
		return nextUrl;
	}

	async function gotoPageNumber(pageNumber: number) {
		const target = buildPageUrl(pageNumber);
		if (!target) return;
		await goto(target, { replaceState: true, keepFocus: true });
	}

	function handlePageClick(pageNumber: number) {
		if (pageNumber === currentPage) return;
		void gotoPageNumber(pageNumber);
	}

	function handleSearchInput(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		searchTerm = value;
		if (searchTimer) {
			clearTimeout(searchTimer);
		}
		searchTimer = setTimeout(() => {
			searchTimer = undefined;
			void applySearch(value);
		}, 400);
	}

	function submitSearch(event: Event) {
		event.preventDefault();
		if (searchTimer) {
			clearTimeout(searchTimer);
			searchTimer = undefined;
		}
		void applySearch(searchTerm);
	}

	onDestroy(() => {
		if (searchTimer) {
			clearTimeout(searchTimer);
			searchTimer = undefined;
		}
	});
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<div>
			<h2 class="text-xl font-bold">
				Daftar Nilai Sumatif
				{#if selectedMapelLabel}
					- {selectedMapelLabel}
				{/if}
			</h2>

			{#if kelasAktifLabel}
				<p class="text-base-content/70 text-sm">Kelas aktif: {kelasAktifLabel}</p>
			{:else}
				<p class="text-base-content/60 text-sm">
					Pilih kelas di navbar untuk melihat mata pelajaran intrakurikuler.
				</p>
			{/if}
		</div>
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
					{#each data.mapelList as mapel (mapel.value)}
						<option value={mapel.value}>{mapel.nama}</option>
					{/each}
				{/if}
			</select>
			{#if searchTerm.trim().length}
				<input type="hidden" name="q" value={searchTerm.trim()} />
			{/if}
		</form>
		<form
			class="w-full"
			data-sveltekit-keepfocus
			data-sveltekit-replacestate
			onsubmit={submitSearch}
		>
			<label class="input bg-base-200 w-full dark:border-none">
				<Icon name="search" />
				<input
					type="search"
					name="q"
					value={searchTerm}
					spellcheck="false"
					autocomplete="name"
					placeholder="Cari nama murid..."
					oninput={handleSearchInput}
				/>
			</label>
		</form>
	</div>

	{#if !hasMapel}
		<div class="alert alert-soft alert-info mt-6">
			<Icon name="info" />
			<span>
				Belum ada mata pelajaran intrakurikuler untuk kelas ini. Tambahkan terlebih dahulu di menu
				<strong>Intrakurikuler</strong>.
			</span>
		</div>
	{:else if !hasResults}
		{#if searchActive}
			<div class="alert alert-soft alert-warning mt-6">
				<Icon name="alert" />
				<span>
					Tidak ditemukan murid dengan kata kunci
					<strong>"{data.page.search}"</strong>. Coba gunakan nama lain atau hapus pencarian.
				</span>
			</div>
		{:else}
			<div class="alert alert-soft alert-warning mt-6">
				<Icon name="alert" />
				<span>
					Belum ada data murid untuk kelas ini. Silakan tambah murid di menu <strong>Murid</strong>.
				</span>
			</div>
		{/if}
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
					{#each data.daftarMurid as murid (murid.id)}
						<tr>
							<td>{murid.no}</td>
							<td>{@html searchQueryMarker(data.page.search, murid.nama)}</td>
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
		<div class="join mt-4 sm:mx-auto">
			{#each pages as pageNumber (pageNumber)}
				<button
					type="button"
					class="join-item btn"
					class:btn-active={pageNumber === currentPage}
					onclick={() => handlePageClick(pageNumber)}
					aria-current={pageNumber === currentPage ? 'page' : undefined}
				>
					{pageNumber}
				</button>
			{/each}
		</div>
	{/if}
</div>
