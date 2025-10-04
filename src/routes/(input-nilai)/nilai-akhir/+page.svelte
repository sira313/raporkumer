<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/icon.svelte';
	import { searchQueryMarker } from '$lib/utils';
	import { onDestroy } from 'svelte';

	let { data } = $props();
	let searchTerm = $state(data.page.search ?? '');
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	const daftarNilai = $derived(data.daftarNilai ?? []);
	const hasRows = $derived(daftarNilai.length > 0);
	const currentPage = $derived(data.page.currentPage ?? 1);
	const totalPages = $derived(Math.max(1, data.page.totalPages ?? 1));
	const pages = $derived.by(() => Array.from({ length: totalPages }, (_, index) => index + 1));
	const summary = $derived(data.summary ?? { totalMurid: 0, totalMuridDinilai: 0, totalMapel: 0 });
	const kelasAktif = $derived(page.data.kelasAktif ?? null);
	const kelasAktifLabel = $derived.by(() => {
		if (!kelasAktif) return null;
		return kelasAktif.fase ? `${kelasAktif.nama} - ${kelasAktif.fase}` : kelasAktif.nama;
	});

	$effect(() => {
		searchTerm = data.page.search ?? '';
	});

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

	async function gotoPage(pageNumber: number) {
		const target = buildPageUrl(pageNumber);
		if (!target) return;
		await goto(target, { replaceState: true, keepFocus: true });
	}

	function handlePageClick(pageNumber: number) {
		if (pageNumber === currentPage) return;
		void gotoPage(pageNumber);
	}

	function formatScore(value: number | null) {
		if (value == null) return '&mdash;';
		return value.toLocaleString('id-ID', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2
		});
	}

	onDestroy(() => {
		if (searchTimer) {
			clearTimeout(searchTimer);
		}
	});
</script>

{#if !kelasAktif}
	<div class="alert alert-warning alert-soft mb-6 flex items-center gap-3">
		<Icon name="warning" />
		<span>Pilih kelas aktif di bagian atas sebelum melihat rekapitulasi nilai akhir.</span>
	</div>
{/if}

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<h2 class="mb-2 text-xl font-bold">
		Rekapitulasi Nilai Akhir
		{#if kelasAktifLabel}
			<span class="block mt-1 text-base font-semibold text-base-content/80">{kelasAktifLabel}</span>
		{/if}
	</h2>

	<div class="grid gap-3 sm:grid-cols-2">
		<div class="stats shadow-none">
			<div class="stat">
				<div class="stat-title">Jumlah Murid</div>
				<div class="stat-value text-lg">{summary.totalMurid}</div>
				<div class="stat-desc">{summary.totalMuridDinilai} sudah dinilai</div>
			</div>
		</div>
		<div class="stats shadow-none">
			<div class="stat">
				<div class="stat-title">Mapel Per Kelas</div>
				<div class="stat-value text-lg">{summary.totalMapel}</div>
				<div class="stat-desc">Menghitung rata-rata per murid</div>
			</div>
		</div>
	</div>

	<form
		class="mt-4 flex flex-col gap-2 sm:flex-row"
		data-sveltekit-keepfocus
		data-sveltekit-replacestate
		onsubmit={submitSearch}
	>
		<!-- Cari nama murid -->
		<label class="input bg-base-200 w-full dark:border-none">
			<Icon name="search" />
			<input
				type="search"
				name="q"
				value={searchTerm}
				spellcheck="false"
				placeholder="Cari nama murid..."
				autocomplete="name"
				oninput={handleSearchInput}
		/>
		</label>
	</form>

	<div class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none">
		<table class="border-base-200 table border dark:border-none">
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th style="width: 50px; min-width: 40px;">Peringkat</th>
					<th class="w-full" style="min-width: 140px;">Nama</th>
					<th style="min-width: 140px;">Nilai Rata-rata</th>
					<th style="width: 120px;">Mapel Dinilai</th>
					<th style="width: 120px;">Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#if hasRows}
					{#each daftarNilai as murid}
						<tr>
							<td>{murid.peringkat}</td>
							<td>{@html searchQueryMarker(data.page.search, murid.nama)}</td>
							<td>{@html formatScore(murid.nilaiRataRata)}</td>
							<td>
								{murid.jumlahMapelDinilai}
								{#if murid.totalMapelRelevan}
									<span class="text-sm text-base-content/70">
										/&nbsp;{murid.totalMapelRelevan}
									</span>
								{/if}
							</td>
							<td>
								<a
									class="btn btn-sm btn-soft shadow-none"
									title={`Lihat nilai akhir ${murid.nama}`}
									href={murid.detailHref}
								>
									<Icon name="eye" />
									Lihat
								</a>
							</td>
						</tr>
					{/each}
				{:else}
					<tr>
						<td class="p-8 text-center" colspan="5">
							<em class="opacity-60">Belum ada data nilai akhir untuk ditampilkan.</em>
						</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<div class="join mx-auto mt-4">
		{#each pages as pageNumber}
			<button
				type="button"
				class="join-item btn"
				class:btn-active={pageNumber === currentPage}
				disabled={pageNumber === currentPage && totalPages === 1}
				onclick={() => handlePageClick(pageNumber)}
			>
				{pageNumber}
			</button>
		{/each}
	</div>
</div>
