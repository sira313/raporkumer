<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- search & pagination use replaceState navigation */
	import { goto, invalidate } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/icon.svelte';
	import { searchQueryMarker } from '$lib/utils';
	import { toast } from '$lib/components/toast.svelte';
	import { onDestroy } from 'svelte';
	import { showModal } from '$lib/components/global-modal.svelte';
	import PdfPreviewModal from '$lib/components/cetak/PdfPreviewModal.svelte';
	import SppdFormModal from '$lib/components/sppd/sppd-form-modal.svelte';
	import DinasLuarDetailBody from '$lib/components/dinas-luar/dinas-luar-detail-body.svelte';
	import DinasLuarDetailDisetujuiBody from '$lib/components/dinas-luar/dinas-luar-detail-disetujui-body.svelte';
	import DinasLuarBuktiModal from '$lib/components/dinas-luar/dinas-luar-bukti-modal.svelte';
	import SvelteURLSearchParams from '$lib/svelte-helpers/url-search-params';

	import type { DinasLuarItem, DinasLuarPermohonanRow, SppdRow } from './+page.server';

	type PageState = {
		search: string | null;
		currentPage: number;
		totalPages: number;
		totalItems: number;
	};

	type GuruItem = {
		id: number;
		nama: string;
	};

	type PageData = {
		daftarItem: DinasLuarItem[];
		guruList: GuruItem[];
		page: PageState;
		sppdCount: number;
		permohonanCount: number;
	};

	let { data }: { data: PageData } = $props();

	const currentPage = $derived.by(() => data.page?.currentPage ?? 1);
	const totalPages = $derived.by(() => Math.max(1, data.page?.totalPages ?? 1));
	const pages = $derived.by(() => Array.from({ length: totalPages }, (_, index) => index + 1));

	// svelte-ignore state_referenced_locally
	let searchTerm = $state(data.page.search ?? '');
	let searchTimer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		if (searchTimer) return;
		const latestSearchTerm = data.page.search ?? '';
		if (searchTerm !== latestSearchTerm) {
			searchTerm = latestSearchTerm;
		}
	});

	function buildSearchUrl(rawValue: string) {
		const params = new SvelteURLSearchParams(page.url.search);
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
			searchTimer = undefined;
			void applySearch(value);
		}, 400);
	}

	function submitSearch(event: Event) {
		event.preventDefault();
		if (searchTimer) {
			clearTimeout(searchTimer);
		}
		searchTimer = undefined;
		void applySearch(searchTerm);
	}

	function buildPageUrl(pageNumber: number) {
		const params = new SvelteURLSearchParams(page.url.search);
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

	function formatTanggalShort(value: string | null | undefined): string {
		if (!value) return '';
		const d = new Date(`${value}T00:00:00`);
		if (Number.isNaN(d.getTime())) return value;
		return d.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function formatTanggalWaktu(value: string | null | undefined): string {
		if (!value) return '';
		const d = new Date(value);
		if (Number.isNaN(d.getTime())) return value;
		return d.toLocaleDateString('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function escapeHtml(value: string | null | undefined): string {
		if (!value) return '';
		return value
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}

	function openTambahModal() {
		showModal({
			title: 'Tambah Dinas Luar',
			body: SppdFormModal,
			bodyProps: {
				guruList: data.guruList
			},
			dismissible: true
		});
	}

	function openEditModal(sppd: SppdRow) {
		showModal({
			title: 'Edit Dinas Luar',
			body: SppdFormModal,
			bodyProps: {
				guruList: data.guruList,
				sppd
			},
			dismissible: false
		});
	}

	// PDF preview modal state
	let pdfPreviewUrl = $state('');
	let pdfPreviewTitle = $state('');
	let pdfModalOpen = $state(false);
	let downloadLoading = $state(false);

	function closePdfModal() {
		if (pdfPreviewUrl) {
			URL.revokeObjectURL(pdfPreviewUrl);
		}
		pdfPreviewUrl = '';
		pdfPreviewTitle = '';
		pdfModalOpen = false;
	}

	async function handlePrint(sppd: SppdRow) {
		downloadLoading = true;
		try {
			const res = await fetch(`/api/pdf/sppd?id=${sppd.id}`);
			if (!res.ok) {
				let message = 'Gagal membuat PDF';
				try {
					message = (await res.json())?.message ?? message;
				} catch {
					// ignore
				}
				throw new Error(message);
			}
			const blob = await res.blob();

			closePdfModal();
			if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
			pdfPreviewUrl = URL.createObjectURL(blob);
			pdfPreviewTitle = `Surat Perintah Perjalanan Dinas - ${sppd.namaLengkap}`;
			pdfModalOpen = true;
		} catch (err) {
			console.error('SPPD preview error:', err);
			toast(err instanceof Error ? err.message : 'Gagal membuat PDF', 'error');
		} finally {
			downloadLoading = false;
		}
	}

	function viewDetail(sppd: SppdRow) {
		const hasBukti = sppd.bukti.length > 0;
		showModal({
			title: `Detail Dinas Luar - ${sppd.namaLengkap}`,
			body: DinasLuarDetailDisetujuiBody,
			bodyProps: { sppd },
			dismissible: true,
			spreadActions: true,
			onPositive: {
				label: hasBukti ? 'Edit Bukti' : 'Upload Bukti',
				icon: 'download',
				class: 'btn-primary',
				action: () => openBuktiModal(sppd)
			},
			onNegative: {
				label: 'Edit',
				icon: 'edit',
				class: 'btn-warning btn-soft',
				action: () => openEditModal(sppd)
			},
			...(hasBukti
				? {
						onExtra: {
							label: 'Cetak Gabungan',
							icon: 'print',
							class: 'btn-primary btn-soft',
							href: `/api/dinas-luar/bukti/cetak?sppdId=${sppd.id}`
						}
					}
				: {}),
			onNeutral: { label: 'Tutup' }
		});
	}

	function openBuktiModal(sppd: SppdRow) {
		showModal({
			title: 'Edit Bukti Perjalanan Dinas',
			body: DinasLuarBuktiModal,
			bodyProps: { sppdId: sppd.id, existing: sppd.bukti },
			dismissible: true
		});
	}

	function viewPermohonan(permohonan: DinasLuarPermohonanRow) {
		showModal({
			title: 'Detail Pengajuan Perjalanan Dinas',
			body: DinasLuarDetailBody,
			bodyProps: { permohonan },
			dismissible: true,
			onPositive: {
				label: 'Setujui',
				class: 'btn-success',
				icon: 'check',
				action: () => {
					showModal({
						title: 'Tambah Dinas Luar',
						body: SppdFormModal,
						bodyProps: {
							guruList: data.guruList,
							prefill: {
								maksud: permohonan.maksud,
								authUserId: permohonan.authUserId,
								permohonanId: permohonan.id
							}
						},
						dismissible: false
					});
				}
			},
			onNeutral: { label: 'Tutup' }
		});
	}

	function handleDeletePermohonan(permohonan: DinasLuarPermohonanRow) {
		showModal({
			title: 'Hapus Pengajuan Perjalanan Dinas',
			body: `Hapus pengajuan perjalanan dinas <strong>${escapeHtml(
				permohonan.nama
			)}</strong> (${escapeHtml(permohonan.maksud)})? Tindakan ini tidak dapat dibatalkan.`,
			dismissible: false,
			onPositive: {
				label: 'Hapus',
				class: 'btn-error',
				action: async ({ close }) => {
					try {
						const res = await fetch(`/api/dinas-luar?id=${permohonan.id}`, {
							method: 'DELETE'
						});
						if (res.ok) {
							toast('Pengajuan perjalanan dinas berhasil dihapus', 'success');
							await invalidate('app:sppd');
						} else {
							toast('Gagal menghapus data', 'error');
						}
					} catch {
						toast('Terjadi kesalahan', 'error');
					}
					close();
				}
			},
			onNegative: { label: 'Batal' }
		});
	}

	async function handleDelete(sppd: SppdRow) {
		showModal({
			title: 'Hapus Data Dinas Luar',
			body: `Hapus data dinas luar <strong>${escapeHtml(sppd.namaLengkap)}</strong> (${escapeHtml(
				sppd.maksud
			)})? Tindakan ini tidak dapat dibatalkan.`,
			dismissible: false,
			onPositive: {
				label: 'Hapus',
				class: 'btn-error',
				action: async ({ close }) => {
					try {
						const res = await fetch(`/api/sppd?id=${sppd.id}`, { method: 'DELETE' });
						if (res.ok) {
							const toast = (await import('$lib/components/toast.svelte')).toast;
							toast('Data dinas luar berhasil dihapus', 'success');
							await invalidate('app:sppd');
						} else {
							const toast = (await import('$lib/components/toast.svelte')).toast;
							toast('Gagal menghapus data', 'error');
						}
					} catch {
						const toast = (await import('$lib/components/toast.svelte')).toast;
						toast('Terjadi kesalahan', 'error');
					}
					close();
				}
			},
			onNegative: { label: 'Batal' }
		});
	}

	onDestroy(() => {
		if (searchTimer) {
			clearTimeout(searchTimer);
		}
		searchTimer = undefined;
	});

	const hasData = $derived(data.permohonanCount > 0 || data.sppdCount > 0);
	const hasFiltered = $derived(data.page.totalItems > 0);
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<div class="mb-4 flex items-start justify-between">
		<div>
			<h2 class="text-xl font-bold">Dinas Luar</h2>
			<p class="text-base-content/80 block text-sm">
				{data.permohonanCount} pengajuan, {data.sppdCount} perjalanan dinas disetujui
			</p>
		</div>
		<button
			type="button"
			class="btn btn-primary btn-soft shadow-none"
			onclick={openTambahModal}
			title="Tambah perjalanan dinas"
		>
			<Icon name="plus" />
			Tambah
		</button>
	</div>

	<form
		class="flex flex-col gap-2 sm:flex-row"
		data-sveltekit-keepfocus
		data-sveltekit-replacestate
		autocomplete="off"
		spellcheck="false"
		onsubmit={submitSearch}
	>
		<label class="input bg-base-200 dark:bg-base-300 w-full dark:border-none">
			<Icon name="search" />
			<input
				type="search"
				name="q"
				value={searchTerm}
				placeholder="Cari keterangan/tujuan perjalanan..."
				oninput={handleSearchInput}
				autocomplete="off"
			/>
		</label>
	</form>

	{#if !hasData}
		<div class="alert alert-soft alert-warning mt-6">
			<Icon name="alert" />
			<span>Belum ada data dinas luar.</span>
		</div>
	{:else if !hasFiltered}
		<div class="alert alert-soft alert-info mt-6">
			<Icon name="info" />
			<span>Tidak ada data yang cocok dengan pencarian.</span>
		</div>
	{:else}
		<div
			class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
		>
			<table class="border-base-200 table border dark:border-none">
				<thead>
					<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
						<th style="width: 50px; min-width: 40px;">No</th>
						<th style="min-width: 110px;">Status</th>
						<th style="min-width: 110px;">Tanggal</th>
						<th style="min-width: 180px;">Nama Lengkap</th>
						<th class="text-center" style="min-width: 70px;">Jumlah</th>
						<th style="min-width: 200px;">Keterangan</th>
						<th class="text-center" style="min-width: 100px;">Aksi</th>
					</tr>
				</thead>
				<tbody>
					{#each data.daftarItem as item (item.status === 'pengajuan' ? `p-${item.permohonan.id}` : `s-${item.sppd.id}`)}
						<tr>
							<td>{item.no}</td>
							<td>
								{#if item.status === 'pengajuan'}
									<span class="badge badge-soft badge-warning">Pengajuan</span>
								{:else}
									<span class="badge badge-soft badge-success">Disetujui</span>
								{/if}
							</td>
							<td class="whitespace-nowrap">
								{item.status === 'pengajuan'
									? formatTanggalWaktu(item.tanggal)
									: formatTanggalShort(item.tanggal)}
							</td>
							<td class="whitespace-nowrap">{item.nama}</td>
							<td class="text-center">{item.jumlah}</td>
							<td class="max-w-60 truncate">
								{@html searchQueryMarker(data.page.search, item.maksud)}
							</td>
							<td class="text-center">
								<div class="flex items-center justify-center gap-1">
									{#if item.status === 'pengajuan'}
										<button
											type="button"
											class="btn btn-primary btn-soft btn-sm shadow-none"
											onclick={() => viewPermohonan(item.permohonan)}
											title="Lihat detail pengajuan"
										>
											<Icon name="eye" />
										</button>
										<button
											type="button"
											class="btn btn-error btn-soft btn-sm shadow-none"
											onclick={() => handleDeletePermohonan(item.permohonan)}
											title="Hapus pengajuan"
										>
											<Icon name="del" />
										</button>
									{:else}
										<button
											type="button"
											class="btn btn-primary btn-soft btn-sm shadow-none"
											onclick={() => viewDetail(item.sppd)}
											title="Lihat detail"
										>
											<Icon name="eye" />
										</button>
										<button
											type="button"
											class="btn btn-success btn-soft btn-sm shadow-none"
											onclick={() => handlePrint(item.sppd)}
											disabled={downloadLoading}
											title="Cetak surat perintah perjalanan dinas"
										>
											<Icon name="print" />
										</button>
										<button
											type="button"
											class="btn btn-error btn-soft btn-sm shadow-none"
											onclick={() => handleDelete(item.sppd)}
											title="Hapus"
										>
											<Icon name="del" />
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<div class="join mx-auto mt-4">
			{#each pages as pageNumber (pageNumber)}
				<button
					type="button"
					class="join-item btn pointer-events-auto"
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

<PdfPreviewModal
	bind:open={pdfModalOpen}
	pdfUrl={pdfPreviewUrl}
	pdfTitle={pdfPreviewTitle}
	loading={downloadLoading}
	onClose={closePdfModal}
/>
