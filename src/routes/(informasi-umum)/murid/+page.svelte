<script lang="ts">
	import { goto, invalidate, pushState } from '$app/navigation';
	import { page } from '$app/state';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { modalRoute, searchQueryMarker } from '$lib/utils';
	import { onDestroy } from 'svelte';
	import DetailMurid from './[id]/+page.svelte';
	import DeleteMurid from './[id]/delete/+page.svelte';
	import FormMurid from './form/[[id]]/+page.svelte';

	type BulkModalData = {
		type: 'bulk';
		selectedMurids: {
			id: number;
			nama: string;
			nis: string;
			nisn: string;
		}[];
	};

	let { data } = $props();
	let searchTerm = $state(data.page.search ?? '');
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	const currentPage = $derived.by(() => data.page.currentPage ?? 1);
	const totalPages = $derived.by(() => Math.max(1, data.page.totalPages ?? 1));
	const pages = $derived.by(() => Array.from({ length: totalPages }, (_, index) => index + 1));

	let selectedIds = $state<Set<number>>(new Set());
	const hasSelection = $derived.by(() => selectedIds.size > 0);
	const semuaDipilih = $derived.by(
		() => data.daftarMurid.length > 0 && selectedIds.size === data.daftarMurid.length
	);
	const selectedMurids = $derived.by(() =>
		data.daftarMurid.filter((murid) => selectedIds.has(murid.id))
	);
	const bulkModalData = $derived.by(() => {
		const modal = page.state.modal;
		if (modal?.name === 'delete-murid' && modal.data?.type === 'bulk') {
			return modal.data as BulkModalData;
		}
		return null;
	});

	$effect(() => {
		searchTerm = data.page.search ?? '';
	});

	let selectAllCheckbox: HTMLInputElement | null = null;
	let formSubmitting = $state(false);

	function handleSubmittingChange(value: boolean) {
		formSubmitting = value;
	}

	function toggleSelect(id: number, checked: boolean) {
		const next = new Set(selectedIds);
		if (checked) {
			next.add(id);
		} else {
			next.delete(id);
		}
		selectedIds = next;
	}

	function toggleSelectAll(checked: boolean) {
		if (!data.daftarMurid.length) {
			selectedIds = new Set();
			return;
		}
		selectedIds = checked ? new Set(data.daftarMurid.map((murid) => murid.id)) : new Set<number>();
	}

	function openBulkDeleteModal() {
		if (!hasSelection) return;
		const modalData: BulkModalData = {
			type: 'bulk',
			selectedMurids: selectedMurids.map((murid) => ({
				id: murid.id,
				nama: murid.nama,
				nis: murid.nis,
				nisn: murid.nisn
			}))
		};
		pushState(`${page.url.pathname}${page.url.search}`, {
			modal: {
				name: 'delete-murid',
				data: modalData
			}
		});
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

	async function gotoPage(pageNumber: number) {
		const target = buildPageUrl(pageNumber);
		if (!target) return;
		await goto(target, { replaceState: true, keepFocus: true });
	}

	function handlePageClick(pageNumber: number) {
		if (pageNumber === currentPage) return;
		void gotoPage(pageNumber);
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

	function submitBulkDelete(event: Event) {
		event.preventDefault();
		const form = document.getElementById('form-bulk-delete') as HTMLFormElement | null;
		if (!form || formSubmitting) return;
		form.requestSubmit();
	}

	async function handleBulkDeleteSuccess() {
		await invalidate('app:murid');
		selectedIds = new Set();
		if (page.state.modal?.name === 'delete-murid') {
			history.back();
		}
	}

	$effect(() => {
		const validIds = new Set(data.daftarMurid.map((murid) => murid.id));
		if (!validIds.size && selectedIds.size) {
			selectedIds = new Set();
			return;
		}
		let changed = false;
		for (const id of selectedIds) {
			if (!validIds.has(id)) {
				changed = true;
				break;
			}
		}
		if (changed) {
			selectedIds = new Set([...selectedIds].filter((id) => validIds.has(id)));
		}
	});

	$effect(() => {
		if (selectAllCheckbox) {
			selectAllCheckbox.indeterminate =
				selectedIds.size > 0 && selectedIds.size < data.daftarMurid.length;
		}
	});

	const kelasAktif = $derived(page.data.kelasAktif ?? null);
	const kelasAktifLabel = $derived.by(() => {
		if (!kelasAktif) return null;
		return kelasAktif.fase ? `${kelasAktif.nama} - ${kelasAktif.fase}` : kelasAktif.nama;
	});
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<h2 class="mb-6 text-xl font-bold">
		Formulir Dan Tabel Isian Data Murid
		{#if kelasAktifLabel}
			<span class="block mt-2 text-lg font-semibold">{kelasAktifLabel}</span>
		{/if}
	</h2>
	<div class="mb-4 flex flex-col gap-2 sm:flex-row">
		<!-- Tombol Tambah Manual -->
		<a class="btn flex items-center shadow-none" href="/murid/form" use:modalRoute={'add-murid'}>
			<Icon name="plus" />
			Tambah Murid
		</a>

		<button
			class="btn shadow-none sm:ml-auto btn-soft btn-error"
			type="button"
			disabled={!hasSelection || formSubmitting}
			onclick={openBulkDeleteModal}
			title={hasSelection ? 'Hapus murid terpilih' : 'Pilih murid terlebih dahulu'}
		>
			<Icon name="del" />
			Hapus
		</button>
	</div>

	<form
		class="flex flex-col items-center gap-2 sm:flex-row"
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

	<FormEnhance
		id="form-bulk-delete"
		action="?/deleteSelected"
		submitStateChange={handleSubmittingChange}
		onsuccess={handleBulkDeleteSuccess}
	>
		{#snippet children({ submitting })}
			<div
				class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
			>
				<table class="border-base-200 table border dark:border-none">
					<!-- head -->
					<thead>
						<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
							<th>
								<input
									type="checkbox"
									class="checkbox"
									bind:this={selectAllCheckbox}
									checked={semuaDipilih}
									onchange={(event) => toggleSelectAll(event.currentTarget.checked)}
									aria-label="Pilih semua murid"
									disabled={submitting}
								/>
							</th>
							<th style="width: 50px; min-width: 40px;">No</th>
							<th style="width: 60%;">Nama</th>
							<th>Tempat Lahir</th>
							<th>Tanggal Lahir</th>
							<th>Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each data.daftarMurid as murid, index (murid)}
							<tr>
								<td>
									<input
										type="checkbox"
										class="checkbox"
										name="muridIds"
										value={murid.id}
										checked={selectedIds.has(murid.id)}
										onchange={(event) => toggleSelect(murid.id, event.currentTarget.checked)}
										aria-label={`Pilih ${murid.nama}`}
										disabled={submitting}
									/>
								</td>
								<td>{index + 1}</td>
								<td>{@html searchQueryMarker(data.page.search, murid.nama)}</td>
								<td>{murid.tempatLahir}</td>
								<td>{murid.tanggalLahir}</td>
								<td>
									<div class="flex flex-row gap-2">
										<a
											class="btn btn-sm btn-soft shadow-none"
											href="/murid/{murid.id}"
											use:modalRoute={'detail-murid'}
											title="Lihat detail murid"
										>
											<Icon name="eye" />
										</a>

										<a
											class="btn btn-sm btn-error btn-soft shadow-none"
											href="/murid/{murid.id}/delete"
											use:modalRoute={'delete-murid'}
											title="Hapus data murid"
										>
											<Icon name="del" />
										</a>
									</div>
								</td>
							</tr>
						{:else}
							<tr>
								<td class="text-center p-7" colspan="6">
									<em class="opacity-50">Belum ada data murid</em>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/snippet}
	</FormEnhance>
	<!-- pagination -->
	<div class="join mt-4 sm:mx-auto">
		{#each pages as pageNumber}
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

{#if ['add-murid', 'edit-murid'].includes(page.state.modal?.name)}
	<dialog class="modal" open>
		<div class="modal-box p-4 sm:w-full sm:max-w-2xl">
			<FormMurid data={page.state.modal?.data} />
		</div>
	</dialog>
{/if}

{#if page.state.modal?.name == 'detail-murid'}
	<dialog class="modal" onclose={() => history.back()} open>
		<div class="modal-box p-4 sm:w-full sm:max-w-2xl">
			<DetailMurid data={page.state.modal?.data} />
		</div>
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>
{/if}

{#if page.state.modal?.name == 'delete-murid'}
	{#if bulkModalData}
		<dialog class="modal" onclose={() => history.back()} open>
			<div class="modal-box">
				<h3 class="mb-4 text-xl font-bold">Hapus data murid terpilih?</h3>
				<p class="mb-2">
					Anda akan menghapus <b>{bulkModalData.selectedMurids.length}</b> murid secara permanen.
				</p>
				<ul class="list-disc space-y-1 pl-5 text-sm">
					{#each bulkModalData.selectedMurids.slice(0, 5) as murid}
						<li>{murid.nama}</li>
					{/each}
				</ul>
				{#if bulkModalData.selectedMurids.length > 5}
					<p class="mt-2 text-sm opacity-70">
						dan {bulkModalData.selectedMurids.length - 5} murid lainnya
					</p>
				{/if}
				<p class="mt-4 text-sm opacity-70">Tindakan ini tidak bisa dibatalkan.</p>
				<div class="mt-6 flex justify-end gap-2">
					<button class="btn shadow-none" type="button" onclick={() => history.back()}>
						<Icon name="close" />
						Batal
					</button>
					<button
						class="btn btn-error btn-soft shadow-none"
						type="button"
						onclick={submitBulkDelete}
						disabled={formSubmitting}
					>
						{#if formSubmitting}
							<div class="loading loading-spinner"></div>
						{:else}
							<Icon name="del" />
						{/if}
						Hapus
					</button>
				</div>
			</div>
			<form method="dialog" class="modal-backdrop">
				<button>close</button>
			</form>
		</dialog>
	{:else}
		<dialog class="modal" onclose={() => history.back()} open>
			<div class="modal-box">
				<DeleteMurid data={page.state.modal?.data} />
			</div>
			<form method="dialog" class="modal-backdrop">
				<button>close</button>
			</form>
		</dialog>
	{/if}
{/if}
