<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/icon.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import { searchQueryMarker } from '$lib/utils';
	import { onDestroy } from 'svelte';

	let { data } = $props();

	type DocumentType = 'cover' | 'biodata' | 'rapor' | 'piagam';

	const documentOptions: Array<{ value: DocumentType; label: string }> = [
		{ value: 'cover', label: 'Cover' },
		{ value: 'biodata', label: 'Biodata' },
		{ value: 'rapor', label: 'Rapor' },
		{ value: 'piagam', label: 'Piagam' }
	];

	const documentPaths: Record<Exclude<DocumentType, 'piagam'>, string> = {
		cover: '/cetak/cover',
		biodata: '/cetak/biodata',
		rapor: '/cetak/rapor'
	};

	let selectedDocument = $state<DocumentType | ''>('');
	let searchTerm = $state(data.page.search ?? '');
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	const currentPage = $derived.by(() => data.page.currentPage ?? 1);
	const totalPages = $derived.by(() => Math.max(1, data.page.totalPages ?? 1));
	const pages = $derived.by(() => Array.from({ length: totalPages }, (_, index) => index + 1));
	const perPage = $derived.by(() => data.page.perPage ?? 20);
	const startNumber = $derived.by(() => (currentPage - 1) * perPage);

	const academicContext = $derived(data.academicContext ?? null);
	const activeSemester = $derived.by(() => {
		const context = academicContext;
		if (!context?.activeSemesterId) return null;
		for (const tahun of context.tahunAjaranList ?? []) {
			const match = tahun.semester.find((item) => item.id === context.activeSemesterId);
			if (match) {
				return {
					...match,
					tahunAjaranNama: tahun.nama
				};
			}
		}
		return null;
	});

	const kelasAktif = $derived(page.data.kelasAktif ?? null);
	const kelasAktifLabel = $derived.by(() => {
		if (!kelasAktif) return null;
		return kelasAktif.fase ? `${kelasAktif.nama} - ${kelasAktif.fase}` : kelasAktif.nama;
	});

	const selectedDocumentEntry = $derived.by(
		() => documentOptions.find((option) => option.value === selectedDocument) ?? null
	);
	const printDisabled = $derived.by(() => !selectedDocument || selectedDocument === 'piagam');
	const printButtonTitle = $derived.by(() => {
		if (!selectedDocument) return 'Pilih dokumen yang ingin dicetak terlebih dahulu';
		if (selectedDocument === 'piagam') return 'Cetak piagam belum tersedia';
		return `Cetak ${selectedDocumentEntry?.label ?? 'dokumen'} untuk murid ini`;
	});

	$effect(() => {
		if (searchTimer) return;
		const latest = data.page.search ?? '';
		if (latest !== searchTerm) {
			searchTerm = latest;
		}
	});

	function buildUrl(updateParams: (params: URLSearchParams) => void) {
		const params = new URLSearchParams(page.url.search);
		updateParams(params);
		const nextQuery = params.toString();
		const nextUrl = `${page.url.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
		const currentUrl = `${page.url.pathname}${page.url.search}`;
		return nextUrl === currentUrl ? null : nextUrl;
	}

	async function applyNavigation(updateParams: (params: URLSearchParams) => void) {
		const target = buildUrl(updateParams);
		if (!target) return;
		await goto(target, { replaceState: true, keepFocus: true });
	}

	function handleSearchInput(event: Event) {
		const value = (event.currentTarget as HTMLInputElement).value;
		searchTerm = value;
		if (searchTimer) {
			clearTimeout(searchTimer);
		}
		searchTimer = setTimeout(() => {
			searchTimer = undefined;
			void applyNavigation((params) => {
				const cleaned = value.trim();
				if (cleaned) {
					params.set('q', cleaned);
				} else {
					params.delete('q');
				}
				params.delete('page');
			});
		}, 400);
	}

	function submitSearch(event: Event) {
		event.preventDefault();
		if (searchTimer) {
			clearTimeout(searchTimer);
			searchTimer = undefined;
		}
		void applyNavigation((params) => {
			const cleaned = searchTerm.trim();
			if (cleaned) {
				params.set('q', cleaned);
			} else {
				params.delete('q');
			}
			params.delete('page');
		});
	}

	async function gotoPage(pageNumber: number) {
		await applyNavigation((params) => {
			if (pageNumber <= 1) {
				params.delete('page');
			} else {
				params.set('page', String(pageNumber));
			}
		});
	}

	function handlePageClick(pageNumber: number) {
		if (pageNumber === currentPage) return;
		void gotoPage(pageNumber);
	}

	onDestroy(() => {
		if (searchTimer) {
			clearTimeout(searchTimer);
			searchTimer = undefined;
		}
	});

	function handlePrint(murid: (typeof data.daftarMurid)[number]) {
		const documentType = selectedDocument;
		if (!documentType) {
			toast('Pilih dokumen yang ingin dicetak terlebih dahulu.', 'warning');
			return;
		}

		if (documentType === 'piagam') {
			toast('Cetak piagam akan tersedia setelah tampilan piagam selesai dibuat.', 'info');
			return;
		}

		const basePath = documentPaths[documentType];
		const params = new URLSearchParams({ murid_id: String(murid.id) });
		if (data.page.kelasId) {
			params.set('kelas_id', data.page.kelasId);
		}
		const target = `${basePath}?${params.toString()}`;

		void goto(target, { replaceState: false, keepFocus: true });
	}
</script>

{#if academicContext}
	{#if academicContext.activeSemesterId}
		<div class="alert alert-info alert-soft mb-6 flex items-center gap-3">
			<Icon name="info" />
			<span>
				Menampilkan daftar murid untuk
				{#if activeSemester}
					<strong>{activeSemester.nama}</strong>
					({activeSemester.tahunAjaranNama})
				{:else}
					semester aktif
				{/if}.
			</span>
		</div>
	{:else}
		<div class="alert alert-warning mb-6 flex items-center gap-3">
			<Icon name="warning" />
			<span>Setel semester aktif di menu Rapor untuk mulai mencetak dokumen per periode.</span>
		</div>
	{/if}
{/if}

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<h2 class="mb-6 text-xl font-bold">
		Cetak Dokumen Rapor
		{#if kelasAktifLabel}
			<span class="mt-2 block text-lg font-semibold">{kelasAktifLabel}</span>
		{/if}
	</h2>
	<div class="mb-2 flex flex-col gap-2 sm:flex-row">
		<select
			class="select bg-base-200 w-full dark:border-none"
			bind:value={selectedDocument}
			title="Pilih dokumen yang ingin dicetak"
		>
			<option value="">Pilih dokumen…</option>
			{#each documentOptions as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
		<button class="btn shadow-none sm:ml-auto" type="button">
			<Icon name="print" />
			Cetak semua
		</button>
	</div>
	{#if selectedDocument === 'piagam'}
		<p class="text-warning text-sm">
			Cetak piagam akan tersedia setelah tampilan piagam selesai dibuat.
		</p>
	{/if}

	<form
		class="flex flex-col items-center gap-2 sm:flex-row"
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
				placeholder="Cari nama murid..."
				autocomplete="name"
				oninput={handleSearchInput}
			/>
		</label>
	</form>

	<div
		class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
	>
		<table class="border-base-200 table border dark:border-none">
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th style="width: 60px; min-width: 50px;">No</th>
					<th style="min-width: 200px;">Nama</th>
					<th style="min-width: 120px;">NISN</th>
					<th style="min-width: 120px;">NIS</th>
					<th style="width: 140px;">Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#each data.daftarMurid as murid, index (murid.id)}
					<tr>
						<td>{startNumber + index + 1}</td>
						<td>{@html searchQueryMarker(data.page.search, murid.nama)}</td>
						<td>{murid.nisn}</td>
						<td>{murid.nis}</td>
						<td>
							<button
								type="button"
								class="btn btn-sm btn-soft shadow-none"
								title={printButtonTitle}
								disabled={printDisabled}
								onclick={() => handlePrint(murid)}
							>
								<Icon name="print" />
								Cetak
							</button>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="p-7 text-center" colspan="5">
							<em class="opacity-60">Belum ada data murid untuk dicetak.</em>
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
</div>
