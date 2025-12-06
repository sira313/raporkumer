<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- file-level: intentional prebuilt hrefs and small navigation helpers */
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/icon.svelte';
	import DeskripsiCell from '$lib/components/nilai-ekstrakurikuler/deskripsi-cell.svelte';
	import { searchQueryMarker } from '$lib/utils';
	import type { EkstrakurikulerNilaiKategori } from '$lib/ekstrakurikuler';
	import { onDestroy } from 'svelte';

	type KeasramaanOption = {
		id: number;
		nama: string;
		tujuanCount: number;
	};

	type KeasramaanDetail = {
		id: number;
		nama: string;
		tujuan: Array<{ id: number; deskripsi: string }>;
	};

	type NilaiEntry = {
		tujuanId: number;
		tujuan: string;
		kategori: EkstrakurikulerNilaiKategori | null;
		kategoriLabel: string | null;
		timestamp: string | null;
	};

	type MuridRow = {
		id: number;
		nama: string;
		no: number;
		nilai: NilaiEntry[];
		deskripsi: string | null;
		hasNilai: boolean;
		lastUpdated: string | null;
	};

	type PaginationState = {
		currentPage: number;
		totalPages: number;
		// totalItems, perPage and search omitted when not used in this view
	};

	type PageData = {
		keasramaanList: KeasramaanOption[];
		selectedKeasramaanId: number | null;
		selectedKeasramaan: KeasramaanDetail | null;
		daftarMurid: MuridRow[];
		totalMurid: number;
		muridCount: number;
		search?: string | null;
		page: PaginationState;
	};

	let { data }: { data: PageData } = $props();

	const hasKeasramaan = $derived.by(() => data.keasramaanList.length > 0);
	const selectedKeasraam = $derived.by(() => data.selectedKeasramaan);
	const selectedKeasraamHasTujuan = $derived.by(() =>
		selectedKeasraam ? selectedKeasraam.tujuan.length > 0 : false
	);
	const currentPage = $derived.by(() => data.page?.currentPage ?? 1);
	const totalPages = $derived.by(() => Math.max(1, data.page?.totalPages ?? 1));
	const pages = $derived.by(() => Array.from({ length: totalPages }, (_, index) => index + 1));

	let selectedKeasramaanValue = $state(
		data.selectedKeasramaanId ? String(data.selectedKeasramaanId) : ''
	);
	let searchTerm = $state(data.search ?? '');
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	const kelasAktif = $derived(page.data.kelasAktif ?? null);
	const kelasAktifLabel = $derived.by(() => {
		if (!kelasAktif) return null;
		return kelasAktif.fase ? `${kelasAktif.nama} - ${kelasAktif.fase}` : kelasAktif.nama;
	});

	$effect(() => {
		selectedKeasramaanValue = data.selectedKeasramaanId ? String(data.selectedKeasramaanId) : '';
		searchTerm = data.search ?? '';
	});

	$effect(() => {
		if (!hasKeasramaan) return;
		if (data.keasramaanList.length !== 1) return;
		const onlyId = String(data.keasramaanList[0].id);
		if (selectedKeasramaanValue === onlyId) return;
		selectedKeasramaanValue = onlyId;
		handleKeasramaanChange(onlyId);
	});

	import SvelteURLSearchParams from '$lib/svelte-helpers/url-search-params';

	function buildUrl(updateParams: (params: SvelteURLSearchParams) => void) {
		const params = new SvelteURLSearchParams(page.url.search);
		updateParams(params);
		const nextQuery = params.toString();
		const nextUrl = `${page.url.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
		const currentUrl = `${page.url.pathname}${page.url.search}`;
		return nextUrl === currentUrl ? null : nextUrl;
	}

	async function applyNavigation(updateParams: (params: SvelteURLSearchParams) => void) {
		const target = buildUrl(updateParams);
		if (!target) return;
		await goto(target, { replaceState: true, keepFocus: true });
	}

	function handleKeasramaanChange(value: string) {
		void applyNavigation((params) => {
			if (value) {
				params.set('keasramaan_id', value);
			} else {
				params.delete('keasramaan_id');
			}
			params.delete('page');
		});
	}

	async function applySearch(value: string) {
		await applyNavigation((params) => {
			const cleaned = value.trim();
			if (cleaned) {
				params.set('q', cleaned);
			} else {
				params.delete('q');
			}
			params.delete('page');
		});
	}

	function handleSearchInput(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		searchTerm = value;
		if (searchTimer) {
			clearTimeout(searchTimer);
		}
		searchTimer = setTimeout(() => {
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
		}
	});

	function gotoPage(pageNumber: number) {
		const sanitized = pageNumber < 1 ? 1 : pageNumber;
		void applyNavigation((params) => {
			if (sanitized <= 1) {
				params.delete('page');
			} else {
				params.set('page', String(sanitized));
			}
		});
	}

	function handlePageClick(pageNumber: number) {
		if (pageNumber === currentPage) return;
		gotoPage(pageNumber);
	}

	function buildNilaiLink(muridId: number) {
		if (!selectedKeasraam) return '#';
		const redirectTarget = encodeURIComponent(`${page.url.pathname}${page.url.search}`);
		return `/asesmen-keasramaan/form-asesmen?murid_id=${muridId}&keasramaan_id=${selectedKeasraam.id}&redirect=${redirectTarget}`;
	}

	function capitalizeSentence(value: string | null | undefined) {
		if (!value) return '';
		const trimmed = value.trimStart();
		if (!trimmed) return '';
		return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
	}
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<h2 class="text-xl font-bold">
				Daftar Asesmen Keasramaan
				{#if selectedKeasraam}
					- {capitalizeSentence(selectedKeasraam.nama)}
				{/if}
			</h2>
			{#if kelasAktifLabel}
				<p class="text-base-content/80 block text-sm">{kelasAktifLabel}</p>
			{/if}
		</div>
	</div>

	<div class="mb-4 flex flex-col justify-between gap-2 sm:flex-row">
		<button class="btn btn-soft shadow-none">
			<Icon name="download" />
			Download template
		</button>
		<button class="btn btn-soft shadow-none">
			<Icon name="import" />
			Import nilai
		</button>
	</div>

	<div class="flex flex-col items-center gap-2 sm:flex-row">
		<label class="w-full md:max-w-80">
			<span class="sr-only">Pilih Matev Keasramaan</span>
			<select
				class="select bg-base-200 w-full truncate dark:border-none"
				title="Pilih Matev Keasramaan"
				bind:value={selectedKeasramaanValue}
				onchange={(event) =>
					handleKeasramaanChange((event.currentTarget as HTMLSelectElement).value)}
				disabled={!hasKeasramaan}
			>
				{#if !hasKeasramaan}
					<option value="">Belum ada Matev Keasramaan</option>
				{:else}
					<option value="" disabled selected={selectedKeasramaanValue === ''}> Pilih Matev </option>
					{#each data.keasramaanList as item (item.id)}
						<option value={String(item.id)}>{capitalizeSentence(item.nama)}</option>
					{/each}
				{/if}
			</select>
		</label>
		<form
			class="w-full"
			autocomplete="off"
			data-sveltekit-keepfocus
			data-sveltekit-replacestate
			onsubmit={submitSearch}
		>
			<label class="input bg-base-200 dark:bg-base-300 w-full dark:border-none">
				<Icon name="search" />
				<input
					type="search"
					name="q"
					value={searchTerm}
					autocomplete="off"
					placeholder="Cari nama murid..."
					oninput={handleSearchInput}
				/>
			</label>
		</form>
	</div>

	{#if !hasKeasramaan}
		<div class="alert alert-soft alert-info mt-6">
			<Icon name="info" />
			<span>
				Belum ada data Matev Keasramaan untuk kelas ini. Tambahkan terlebih dahulu di menu
				<strong>Keasramaan</strong>.
			</span>
		</div>
	{:else if !selectedKeasraam}
		<div class="alert alert-soft alert-warning mt-6">
			<Icon name="alert" />
			<span>Pilih Matev untuk mulai menilai.</span>
		</div>
	{:else if !selectedKeasraamHasTujuan}
		<div class="alert alert-soft alert-warning mt-6">
			<Icon name="alert" />
			<span>
				Matev ini belum memiliki tujuan pembelajaran. Tambahkan tujuan terlebih dahulu melalui menu
				<strong>Keasramaan &gt; Tujuan</strong>.
			</span>
		</div>
	{:else if data.muridCount === 0}
		<div class="alert alert-soft alert-warning mt-6">
			<Icon name="alert" />
			<span>
				Belum ada data murid di kelas ini. Tambahkan murid terlebih dahulu melalui menu
				<strong>Murid</strong>.
			</span>
		</div>
	{:else if data.totalMurid === 0}
		<div class="alert alert-soft alert-info mt-6">
			<Icon name="info" />
			<span>Tidak ada murid yang cocok dengan pencarian.</span>
		</div>
	{:else}
		<div
			class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
		>
			<table class="border-base-200 table min-w-150 border dark:border-none">
				<thead>
					<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
						<th style="width: 50px; min-width: 40px;">No</th>
						<th class="min-w-48">Nama</th>
						<th class="min-w-32">Aksi</th>
						<th class="w-full" style="min-width: 240px;">Deskripsi Nilai</th>
					</tr>
				</thead>
				<tbody>
					{#each data.daftarMurid as murid (murid.id)}
						<tr>
							<td class="align-top">{murid.no}</td>
							<td class="align-top">
								{@html searchQueryMarker(data.search, murid.nama)}
							</td>
							<td class="align-top">
								<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- intentional prebuilt href -->
								<a
									class="btn btn-sm btn-soft shadow-none"
									href={buildNilaiLink(murid.id)}
									class:btn-disabled={!selectedKeasraamHasTujuan}
									aria-disabled={!selectedKeasraamHasTujuan}
								>
									<Icon name="edit" />
									Nilai
								</a>
							</td>
							<td class="align-top">
								<DeskripsiCell text={murid.deskripsi} />
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
