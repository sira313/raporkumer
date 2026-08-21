<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- search & pagination use replaceState navigation */
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/icon.svelte';
	import { onDestroy } from 'svelte';
	import { showModal } from '$lib/components/global-modal.svelte';
	import SvelteURLSearchParams from '$lib/svelte-helpers/url-search-params';
	import PresensiGuruEditModal from '$lib/components/presensi-guru/presensi-guru-edit-modal.svelte';
	import PresensiGuruDetailBody from '$lib/components/presensi-guru/presensi-guru-detail-body.svelte';
	import TablePresensiGuruBulanan from '$lib/components/presensi-guru/table-presensi-guru-bulanan.svelte';
	import { searchQueryMarker, signatureDisplaySrc } from '$lib/utils';

	type RecapRow = {
		no: number;
		userId: number;
		nama: string;
		status: string | null;
		waktu: string | null;
		tandaTangan: string | null;
		keterangan: string | null;
	};

	type BulananRow = {
		no: number;
		userId: number;
		nama: string;
		statusPerDay: Array<'hadir' | 'izin' | 'sakit' | 'dinas_luar' | 'cuti' | 'belum' | ''>;
		countHadir: number;
		countIzin: number;
		countSakit: number;
		countDinasLuar: number;
		countCuti: number;
		countBelum: number;
	};

	type PageState = {
		search: string | null;
		currentPage: number;
		totalPages: number;
	};

	type PageData = {
		mode: 'harian' | 'bulanan';
		rows: RecapRow[] | BulananRow[];
		page: PageState;
		guruCount: number;
		tanggal: string;
		bulan: number;
		tahun: number;
		daysInMonth: number;
		redDays: number[];
		totalHariBelajar: number;
		jamMasuk: string | null;
		jamPulang: string | null;
		isLibur: boolean;
		disabled?: boolean;
	};

	let { data }: { data: PageData } = $props();

	const STATUS_META: Record<string, { label: string; class: string }> = {
		hadir: { label: 'Hadir', class: 'badge-success' },
		izin: { label: 'Izin', class: 'badge-info' },
		sakit: { label: 'Sakit', class: 'badge-warning' },
		dinas_luar: { label: 'Dinas Luar', class: 'badge-primary' },
		cuti: { label: 'Cuti', class: 'badge-secondary' }
	};

	const hariList = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
	const bulanList = [
		'Januari',
		'Februari',
		'Maret',
		'April',
		'Mei',
		'Juni',
		'Juli',
		'Agustus',
		'September',
		'Oktober',
		'November',
		'Desember'
	];

	function formatTanggal(dateStr: string) {
		const d = new Date(dateStr + 'T00:00:00');
		return `${hariList[d.getDay()]}, ${d.getDate()} ${bulanList[d.getMonth()]} ${d.getFullYear()}`;
	}

	function localDateString() {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
			d.getDate()
		).padStart(2, '0')}`;
	}

	// svelte-ignore state_referenced_locally
	let selectedMode = $state<'harian' | 'bulanan'>(data.mode);
	// svelte-ignore state_referenced_locally
	let selectedTanggal = $state(data.tanggal);
	// svelte-ignore state_referenced_locally
	let selectedBulan = $state(data.mode === 'bulanan' ? data.bulan : new Date().getMonth() + 1);
	// svelte-ignore state_referenced_locally
	let selectedTahun = $state(data.mode === 'bulanan' ? data.tahun : new Date().getFullYear());

	$effect(() => {
		if (data.tanggal) {
			selectedTanggal = data.tanggal;
		}
	});

	$effect(() => {
		if (data.mode === 'bulanan') {
			selectedBulan = data.bulan;
			selectedTahun = data.tahun;
		}
	});

	async function applyNavigation(mutate: (params: SvelteURLSearchParams) => void) {
		const params = new SvelteURLSearchParams(page.url.search);
		mutate(params);
		const query = params.toString();
		const nextUrl = `${page.url.pathname}${query ? `?${query}` : ''}`;
		await goto(nextUrl, { replaceState: true, keepFocus: true });
	}

	function handleModeChange() {
		void applyNavigation((params) => {
			if (selectedMode === 'bulanan') {
				params.set('mode', 'bulanan');
				params.set('bulan', String(selectedBulan));
				params.set('tahun', String(selectedTahun));
				params.delete('tanggal');
			} else {
				params.set('mode', 'harian');
				params.delete('bulan');
				params.delete('tahun');
			}
			params.delete('page');
			const cleaned = searchTerm.trim();
			if (cleaned) {
				params.set('q', cleaned);
			} else {
				params.delete('q');
			}
		});
	}

	function viewDate() {
		if (data.mode === 'bulanan') {
			void applyNavigation((params) => {
				params.set('mode', 'bulanan');
				params.set('bulan', String(selectedBulan));
				params.set('tahun', String(selectedTahun));
				params.delete('page');
				params.delete('q');
			});
		} else {
			void applyNavigation((params) => {
				params.set('tanggal', selectedTanggal);
				params.delete('page');
				params.delete('q');
			});
		}
	}

	function resetToToday() {
		void applyNavigation((params) => {
			params.delete('tanggal');
			params.delete('page');
			params.delete('q');
		});
	}

	function resetToCurrentBulan() {
		void applyNavigation((params) => {
			params.set('mode', 'bulanan');
			params.set('bulan', String(new Date().getMonth() + 1));
			params.set('tahun', String(new Date().getFullYear()));
			params.delete('page');
			params.delete('tanggal');
			params.delete('q');
		});
	}

	const isToday = $derived(data.tanggal === localDateString());

	const isCurrentBulan = $derived.by(() => {
		if (data.mode !== 'bulanan') return false;
		return data.bulan === new Date().getMonth() + 1 && data.tahun === new Date().getFullYear();
	});

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

	const currentPage = $derived.by(() => data.page?.currentPage ?? 1);
	const totalPages = $derived.by(() => Math.max(1, data.page?.totalPages ?? 1));
	const pages = $derived.by(() => Array.from({ length: totalPages }, (_, index) => index + 1));

	function openEdit(row: RecapRow) {
		showModal({
			title: `Ubah Presensi - ${row.nama}`,
			body: PresensiGuruEditModal,
			bodyProps: {
				userId: row.userId,
				nama: row.nama,
				tanggal: data.tanggal,
				tanggalJam: page.url.searchParams.get('tanggal-jam'),
				initialStatus: row.status,
				initialTandaTangan: signatureDisplaySrc(row.tandaTangan),
				initialKeterangan: row.keterangan
			},
			dismissible: true
		});
	}

	function viewDetail(row: RecapRow) {
		const statusMeta = row.status
			? (STATUS_META[row.status] ?? { label: row.status, class: '' })
			: null;

		showModal({
			title: `Detail Presensi - ${row.nama}`,
			body: PresensiGuruDetailBody,
			bodyProps: {
				nama: row.nama,
				tanggal: data.tanggal,
				status: row.status,
				statusLabel: statusMeta?.label ?? null,
				statusClass: statusMeta?.class ?? '',
				waktu: row.waktu,
				keterangan: row.keterangan,
				tandaTangan: signatureDisplaySrc(row.tandaTangan)
			},
			dismissible: true,
			onNeutral: { label: 'Tutup' }
		});
	}

	onDestroy(() => {
		if (searchTimer) {
			clearTimeout(searchTimer);
		}
		searchTimer = undefined;
	});
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	{#if data.disabled}
		<div class="alert alert-soft alert-warning flex items-center gap-3">
			<Icon name="warning" class="h-5 w-5 shrink-0" />
			<span>
				Fitur presensi guru sedang dinonaktifkan. Aktifkan kembali melalui
				<strong>Akademik &gt; Pengaturan Presensi</strong> untuk menggunakan halaman ini.
			</span>
		</div>
	{:else}
		<div class="mb-4 flex items-start justify-between gap-2 max-sm:flex-col sm:flex-row">
			<div>
				<h2 class="text-xl font-bold">
					Presensi guru -
					<span class="text-primary">
						{#if data.mode === 'bulanan'}
							{bulanList[data.bulan - 1]} {data.tahun}
						{:else}
							{formatTanggal(data.tanggal)}
						{/if}
					</span>
				</h2>
				<p class="text-base-content/80 block text-sm">
					{#if data.mode === 'bulanan'}
						{data.guruCount} guru
						{#if data.totalHariBelajar > 0}
							· {data.totalHariBelajar} hari belajar
						{/if}
					{:else}
						{data.guruCount} guru
						{#if data.jamMasuk && data.jamPulang}
							· jam presensi {data.jamMasuk} - {data.jamPulang}
						{/if}
						· {data.isLibur ? 'Libur' : 'Masuk'}
					{/if}
				</p>
			</div>
		</div>

		<div class="mb-4 flex items-start justify-between gap-2 max-sm:flex-col sm:flex-row">
			<div class="flex flex-wrap items-center gap-2 max-sm:w-full">
				<div class="join flex max-sm:w-full">
					{#if data.mode === 'bulanan'}
						<div class="min-w-0 flex-1">
							<select
								class="select bg-base-200 dark:bg-base-300 w-full truncate rounded-r-none max-sm:w-full border-base-300 dark:border-none"
								bind:value={selectedBulan}
							>
								{#each bulanList as nama, i (nama)}
									<option value={i + 1}>{nama}</option>
								{/each}
							</select>
						</div>
						<input
							type="number"
							class="input bg-base-200 dark:bg-base-300 w-24 rounded-none max-sm:flex-1 border-base-300 dark:border-none"
							bind:value={selectedTahun}
							min="2000"
							max="2099"
						/>
					{:else}
						<input
							type="date"
							class="input bg-base-200 dark:bg-base-300 w-full rounded-r-none max-sm:w-full border-base-300 dark:border-none"
							bind:value={selectedTanggal}
						/>
					{/if}
					<button
						type="button"
						class="btn btn-soft rounded-none shadow-none"
						aria-label="Lihat presensi"
						title="Lihat presensi"
						onclick={viewDate}
					>
						<Icon name="eye" />
					</button>
					<button
						type="button"
						class="btn btn-soft rounded-l-none shadow-none"
						aria-label={data.mode === 'bulanan' ? 'Kembali ke bulan ini' : 'Kembali ke hari ini'}
						title={data.mode === 'bulanan' ? 'Kembali ke bulan ini' : 'Kembali ke hari ini'}
						onclick={data.mode === 'bulanan' ? resetToCurrentBulan : resetToToday}
						disabled={data.mode === 'bulanan' ? isCurrentBulan : isToday}
					>
						<Icon name="repeat" />
					</button>
				</div>
			</div>

			<form
				class="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row max-sm:w-full"
				data-sveltekit-keepfocus
				data-sveltekit-replacestate
				autocomplete="off"
				spellcheck="false"
				onsubmit={submitSearch}
			>
				<div class="join w-full min-w-0">
					<label
						class="input bg-base-200 dark:bg-base-300 join-item min-w-0 grow border-base-300 dark:border-none"
					>
						<Icon name="search" />
						<input
							type="search"
							name="q"
							value={searchTerm}
							placeholder="Cari nama guru..."
							oninput={handleSearchInput}
							autocomplete="off"
						/>
					</label>
					<select
						class="select bg-base-200 dark:bg-base-300 join-item w-auto shrink truncate border-base-300 dark:border-none"
						value={selectedMode}
						title="Pilih mode presensi"
						onchange={(e) => {
							selectedMode = (e.currentTarget as HTMLSelectElement).value as 'harian' | 'bulanan';
							handleModeChange();
						}}
					>
						<option value="harian">Harian</option>
						<option value="bulanan">Bulanan</option>
					</select>
				</div>
			</form>
		</div>

		{#if data.guruCount === 0}
			<div class="alert alert-soft alert-warning mt-6">
				<Icon name="alert" />
				<span>Belum ada guru terdaftar di sekolah ini.</span>
			</div>
		{:else if !data.rows.length}
			<div class="alert alert-soft alert-info mt-6">
				<Icon name="info" />
				<span>Tidak ada guru yang cocok dengan pencarian.</span>
			</div>
		{:else if data.mode === 'bulanan'}
			<TablePresensiGuruBulanan
				rows={data.rows as BulananRow[]}
				daysInMonth={data.daysInMonth}
				redDays={data.redDays}
				search={data.page.search}
			/>
		{:else}
			{@const harianRows = data.rows as RecapRow[]}
			<div
				class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
			>
				<table class="border-base-200 table border dark:border-none">
					<thead>
						<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
							<th style="width: 50px; min-width: 40px;">No</th>
							<th style="min-width: 180px;">Nama Guru</th>
							<th style="min-width: 120px;">Status</th>
							<th style="min-width: 80px;">Jam</th>
							<th class="text-center" style="min-width: 110px;">Aksi</th>
						</tr>
					</thead>
					<tbody>
						{#each harianRows as row (row.userId)}
							{@const statusMeta = row.status
								? (STATUS_META[row.status] ?? { label: row.status, class: '' })
								: null}
							<tr>
								<td>{row.no}</td>
								<td>{@html searchQueryMarker(data.page.search, row.nama)}</td>
								<td>
									{#if statusMeta}
										<span class="badge whitespace-nowrap {statusMeta.class}"
											>{statusMeta.label}</span
										>
									{:else}
										<span class="badge badge-soft whitespace-nowrap">Belum presensi</span>
									{/if}
								</td>
								<td class="whitespace-nowrap">
									{#if row.waktu}
										{new Date(row.waktu).toLocaleTimeString('id-ID', {
											hour: '2-digit',
											minute: '2-digit'
										})}
									{:else}
										<span class="text-base-content/50">—</span>
									{/if}
								</td>
								<td class="whitespace-nowrap text-center">
									<div class="flex justify-center gap-1">
										<button
											type="button"
											class="btn btn-primary btn-soft btn-sm shadow-none"
											title="Ubah presensi"
											onclick={() => openEdit(row)}
										>
											<Icon name="edit" />
										</button>
										<button
											type="button"
											class="btn btn-soft btn-sm shadow-none"
											title="Lihat detail"
											onclick={() => viewDetail(row)}
										>
											<Icon name="eye" />
										</button>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}

		{#if totalPages > 1}
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
	{/if}
</div>
