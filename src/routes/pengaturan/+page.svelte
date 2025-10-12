<script lang="ts">
	import { browser } from '$app/environment';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import { onDestroy, onMount } from 'svelte';
	import type { PageData } from './$types';

	const { data } = $props<{ data: PageData }>();

	const detectedAddresses = data.appAddresses ?? [];
	const protocol = data.protocol ?? 'http:';
	const currentVersion = $derived(data.appVersion ?? '0.0.0');

	let appAddress = $state(detectedAddresses[0] ?? '');
	let copying = $state(false);

	type DownloadPhase = UpdateDownloadState | 'idle';

	interface DownloadUiState {
		id: string | null;
		version: string;
		assetName: string;
		status: DownloadPhase;
		downloadedBytes: number;
		totalBytes: number | null;
		error: string | null;
		installScheduled: boolean;
	}

	let updateModalOpen = $state(false);
	let checkingUpdate = $state(false);
	let checkError = $state<string | null>(null);
	let latestRelease = $state<ReleaseSummary | null>(null);
	let updateAvailable = $state(false);
	let downloadState = $state<DownloadUiState>(createInitialDownloadState());
	let installingUpdate = $state(false);

	let downloadPollHandle: ReturnType<typeof setInterval> | null = null;

	const selectedAsset = $derived.by(() => pickPreferredAsset(latestRelease));
	const downloadProgress = $derived.by(() => {
		if (!downloadState.totalBytes || downloadState.totalBytes <= 0) return null;
		if (!Number.isFinite(downloadState.downloadedBytes)) return null;
		return Math.min(1, Math.max(0, downloadState.downloadedBytes / downloadState.totalBytes));
	});
	const downloadProgressPercent = $derived.by(() =>
		downloadProgress === null ? null : Math.round(downloadProgress * 100)
	);

	onMount(() => {
		if (!appAddress && browser) {
			appAddress = window.location.host;
		}
	});

	onDestroy(() => {
		clearDownloadPolling();
	});

	function createInitialDownloadState(): DownloadUiState {
		return {
			id: null,
			version: '',
			assetName: '',
			status: 'idle',
			downloadedBytes: 0,
			totalBytes: null,
			error: null,
			installScheduled: false
		};
	}

	function pickPreferredAsset(release: ReleaseSummary | null): UpdateAsset | null {
		if (!release || !release.assets?.length) return null;
		const exe = release.assets.find((asset) => asset.name.toLowerCase().endsWith('.exe'));
		return exe ?? release.assets[0] ?? null;
	}

	function formatBytes(bytes: number) {
		if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
		const units = ['B', 'KB', 'MB', 'GB'];
		let value = bytes;
		let index = 0;
		while (value >= 1024 && index < units.length - 1) {
			value /= 1024;
			index += 1;
		}
		const precision = value < 10 && index > 0 ? 1 : 0;
		return `${value.toFixed(precision)} ${units[index]}`;
	}

	function formatDateTime(value: string) {
		if (!value) return '-';
		const date = new Date(value);
		if (Number.isNaN(date.getTime())) return value;
		return date.toLocaleString('id-ID', {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
	}

	function clearDownloadPolling() {
		if (downloadPollHandle) {
			clearInterval(downloadPollHandle);
			downloadPollHandle = null;
		}
	}

	function resetDownloadState(release: ReleaseSummary | null) {
		const asset = pickPreferredAsset(release);
		downloadState = {
			id: null,
			version: release?.version ?? '',
			assetName: asset?.name ?? '',
			status: 'idle',
			downloadedBytes: 0,
			totalBytes: asset?.size ?? null,
			error: null,
			installScheduled: false
		};
	}

	async function copyAddress() {
		if (!browser) {
			toast({ message: 'Penyalinan hanya tersedia di peramban.', type: 'warning' });
			return;
		}

		const target = appAddress || window.location.host;
		if (!target) {
			toast({ message: 'Alamat aplikasi tidak ditemukan.', type: 'warning' });
			return;
		}

		if (!navigator.clipboard) {
			toast({ message: 'Clipboard tidak tersedia di perangkat ini.', type: 'warning' });
			return;
		}

		const scheme = protocol === 'https:' ? 'https://' : 'http://';
		const copyValue =
			target.startsWith('http://') || target.startsWith('https://') ? target : `${scheme}${target}`;

		try {
			copying = true;
			await navigator.clipboard.writeText(copyValue);
			toast({ message: 'Alamat aplikasi berhasil disalin.', type: 'success' });
		} catch (error) {
			console.error('Failed to copy app address', error);
			toast({ message: 'Gagal menyalin alamat. Salin manual ya.', type: 'error' });
		} finally {
			copying = false;
		}
	}

	function handlePasswordSuccess({ form }: { form: HTMLFormElement }) {
		form.reset();
	}

	async function checkForUpdate(force = false) {
		if (checkingUpdate) return;
		if (!force && latestRelease) return;

		checkingUpdate = true;
		checkError = null;

		try {
			const response = await fetch('/api/updates/latest', {
				method: 'GET',
				credentials: 'same-origin',
				cache: 'no-store'
			});

			if (!response.ok) {
				const message = await response.text().catch(() => '');
				throw new Error(message || 'Gagal memeriksa pembaruan.');
			}

			const payload = (await response.json()) as UpdateCheckResponse;
			latestRelease = payload.latest ?? null;
			updateAvailable = Boolean(payload.updateAvailable && latestRelease);

			if (!updateAvailable) {
				resetDownloadState(null);
			} else if (!downloadState.id || payload.latest?.version !== downloadState.version) {
				resetDownloadState(payload.latest);
			}
		} catch (error) {
			checkError = error instanceof Error ? error.message : 'Gagal memeriksa pembaruan.';
			updateAvailable = false;
		} finally {
			checkingUpdate = false;
		}
	}

	function openUpdateModal() {
		updateModalOpen = true;
		void checkForUpdate(true);
	}

	function closeUpdateModal() {
		updateModalOpen = false;
	}

	function startDownloadPolling(id: string) {
		clearDownloadPolling();
		downloadPollHandle = setInterval(async () => {
			try {
				const response = await fetch(`/api/updates/status/${id}`, {
					cache: 'no-store',
					credentials: 'same-origin'
				});

				if (!response.ok) {
					if (response.status === 404) {
						clearDownloadPolling();
						downloadState = {
							...downloadState,
							status: 'failed',
							error: 'Status unduhan tidak ditemukan.'
						};
					}
					return;
				}

				const status = (await response.json()) as UpdateDownloadStatus;
				downloadState = {
					...downloadState,
					id: status.id,
					version: status.version,
					assetName: status.assetName,
					status: status.status,
					downloadedBytes: status.downloadedBytes,
					totalBytes: status.totalBytes,
					error: status.error,
					installScheduled: status.installScheduled
				};

				if (status.status === 'completed' || status.status === 'failed') {
					clearDownloadPolling();
				}
			} catch (error) {
				console.error('Gagal memeriksa status unduhan', error);
			}
		}, 1000);
	}

	async function downloadUpdate() {
		if (!latestRelease) return;
		const asset = selectedAsset;
		if (!asset) {
			toast({ message: 'Berkas rilis tidak tersedia. Unduh manual di GitHub.', type: 'warning' });
			return;
		}

		clearDownloadPolling();
		downloadState = {
			id: null,
			version: latestRelease.version,
			assetName: asset.name,
			status: 'pending',
			downloadedBytes: 0,
			totalBytes: asset.size ?? null,
			error: null,
			installScheduled: false
		};

		try {
			const response = await fetch('/api/updates/download', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ version: latestRelease.version, assetId: asset.id }),
				credentials: 'same-origin'
			});

			if (!response.ok) {
				const message = await response.text().catch(() => '');
				throw new Error(message || 'Gagal memulai unduhan pembaruan.');
			}

			const payload = (await response.json()) as UpdateDownloadStatus;
			downloadState = {
				id: payload.id,
				version: payload.version,
				assetName: payload.assetName,
				status: payload.status,
				downloadedBytes: payload.downloadedBytes,
				totalBytes: payload.totalBytes,
				error: payload.error,
				installScheduled: payload.installScheduled
			};
			startDownloadPolling(payload.id);
		} catch (error) {
			downloadState = {
				...downloadState,
				status: 'failed',
				error: error instanceof Error ? error.message : 'Gagal mengunduh pembaruan.'
			};
			toast({
				message: downloadState.error ?? 'Gagal mengunduh pembaruan.',
				type: 'error'
			});
		}
	}

	async function installUpdate() {
		if (!downloadState.id) {
			toast({ message: 'Unduh pembaruan terlebih dahulu.', type: 'warning' });
			return;
		}
		if (downloadState.status !== 'completed') {
			toast({ message: 'Unduhan pembaruan belum selesai.', type: 'warning' });
			return;
		}
		if (installingUpdate || downloadState.installScheduled) return;

		installingUpdate = true;
		try {
			const response = await fetch('/api/updates/install', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ downloadId: downloadState.id }),
				credentials: 'same-origin'
			});

			if (!response.ok) {
				const message = await response.text().catch(() => '');
				throw new Error(message || 'Gagal menjadwalkan pemasangan pembaruan.');
			}

			downloadState = {
				...downloadState,
				installScheduled: true
			};
			toast({
				message: 'Installer dijalankan. Ikuti petunjuk untuk menyelesaikan pembaruan.',
				type: 'success',
				persist: true
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Gagal memasang pembaruan.';
			downloadState = {
				...downloadState,
				error: message
			};
			toast({ message, type: 'error' });
		} finally {
			installingUpdate = false;
		}
	}
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
	<div class="space-y-6">
		<header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="space-y-2">
				<h1 class="text-2xl font-bold">Pengaturan Aplikasi</h1>
				<p class="text-base-content/70 text-sm">
					Pengaturan tambahan untuk lingkungan server lokal Anda.
				</p>
				<p class="text-xs text-base-content/60">Versi terpasang: v{currentVersion}</p>
			</div>
			<button
				class="btn btn-outline shadow-none btn-secondary sm:self-start"
				type="button"
				onclick={openUpdateModal}
			>
				<Icon name="download" />
				Cek Update
			</button>
		</header>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Alamat aplikasi</legend>
			<div class="join">
				<input
					type="text"
					disabled
					class="input bg-base-200 join-item w-full dark:border-none"
					placeholder={appAddress || 'Tidak ada alamat terdeteksi'}
					value={appAddress}
				/>
				<button
					class="btn join-item shadow-none"
					type="button"
					onclick={copyAddress}
					disabled={!appAddress || copying}
				>
					{copying ? 'Menyalin…' : 'Copy'}
				</button>
			</div>
			{#if detectedAddresses.length > 1}
				<label class="label mt-3" for="addressSelector">
					<span class="label-text">Alamat terdeteksi lainnya</span>
				</label>
				<select
					id="addressSelector"
					class="select select-bordered dark:bg-base-200 w-full dark:border-none"
					bind:value={appAddress}
				>
					{#each detectedAddresses as address (address)}
						<option value={address}>{address}</option>
					{/each}
				</select>
			{/if}
			<p class="text-base-content/70 mt-1 text-xs">
				Buka alamat ini pada perangkat lain di jaringan lokal yang sama.
			</p>
		</fieldset>
	</div>
</section>

	{#if updateModalOpen}
	<dialog
		class="modal modal-open modal-middle"
		open
		aria-modal="true"
		onkeydown={(event) => {
			if (event.key === 'Escape') closeUpdateModal();
		}}
	>
		<div class="modal-box max-w-2xl">
			<div class="space-y-1">
				<h2 class="text-xl font-semibold">Cek Pembaruan</h2>
				<p class="text-base-content/70 text-sm">Versi terpasang: v{currentVersion}</p>
			</div>

			<div class="mt-4 space-y-4">
				{#if checkError}
					<div class="alert alert-error">
						<Icon name="error" />
						<div>
							<p class="font-semibold">Gagal memeriksa pembaruan</p>
							<p class="text-sm">{checkError}</p>
						</div>
						<button
							class="btn btn-sm"
							type="button"
							onclick={() => checkForUpdate(true)}
						>
							Coba lagi
						</button>
					</div>
				{/if}

				{#if checkingUpdate}
					<div class="rounded-box bg-base-200/60 p-4">
						<p class="text-sm font-medium">Memeriksa pembaruan…</p>
						<progress class="progress progress-primary mt-3 w-full"></progress>
					</div>
				{/if}

				{#if updateAvailable && latestRelease}
					<section class="space-y-3">
						<div>
							<p class="text-sm text-base-content/70">Versi terbaru</p>
							<h3 class="text-lg font-semibold">Rapkumer v{latestRelease.version}</h3>
							<p class="text-xs text-base-content/60">
								Dirilis {formatDateTime(latestRelease.publishedAt)}
							</p>
						</div>
						{#if selectedAsset}
							<div class="rounded-box bg-base-200/60 p-3 text-sm leading-5">
								<p class="font-medium">Berkas: {selectedAsset.name}</p>
								<p class="text-base-content/70">
									Ukuran: {formatBytes(selectedAsset.size)}
								</p>
							</div>
						{:else}
							<div class="alert alert-warning">
								<Icon name="warning" />
								<span>Berkas rilis tidak ditemukan. Unduh manual di GitHub.</span>
							</div>
						{/if}
						{#if latestRelease.notes}
							<div class="rounded-box bg-base-200/40 p-3 text-sm">
								<p class="font-medium">Catatan rilis</p>
								<p class="whitespace-pre-wrap text-base-content/80">
									{latestRelease.notes}
								</p>
							</div>
						{/if}
					</section>
				{:else if !checkingUpdate}
					<div class="rounded-box bg-base-200/60 p-4 text-sm">
						<p class="font-medium">
							Anda sudah menggunakan versi terbaru Rapkumer.
						</p>
						<p class="text-xs text-base-content/70">
							Tetap cek berkala untuk fitur terbaru.
						</p>
					</div>
				{/if}

				{#if updateAvailable && selectedAsset}
					<div class="space-y-3">
						{#if downloadState.status === 'downloading' || downloadState.status === 'pending'}
							<div class="rounded-box bg-base-200/50 p-3 text-sm space-y-2">
								<p class="font-medium">Mengunduh pembaruan…</p>
								{#if downloadProgressPercent !== null}
									<progress
										class="progress progress-primary w-full"
										max="100"
										value={downloadProgressPercent}
									></progress>
								{:else}
									<progress class="progress progress-primary w-full"></progress>
								{/if}
								<p class="text-xs text-base-content/70">
									{formatBytes(downloadState.downloadedBytes)}
									dari
									{downloadState.totalBytes
										? formatBytes(downloadState.totalBytes)
										: 'ukuran tidak diketahui'}
								</p>
							</div>
						{/if}

						{#if downloadState.status === 'failed' && downloadState.error}
							<div class="alert alert-error">
								<Icon name="error" />
								<span>{downloadState.error}</span>
							</div>
						{/if}

						{#if downloadState.installScheduled}
							<div class="alert alert-info">
								<Icon name="info" />
								<span>
									Installer telah dibuka. Ikuti petunjuk pemasangan, lalu jalankan ulang Rapkumer.
								</span>
							</div>
						{/if}

						<div class="flex flex-wrap gap-2">
							<button
								class="btn btn-primary"
								type="button"
								onclick={downloadUpdate}
								disabled={
									checkingUpdate ||
									downloadState.status === 'downloading' ||
									downloadState.status === 'pending'
								}
							>
								{#if downloadState.status === 'downloading' || downloadState.status === 'pending'}
									<span class="loading loading-spinner loading-sm"></span>
									Mengunduh…
								{:else}
									<Icon name="download" />
									Download
								{/if}
							</button>

							{#if downloadState.status === 'completed'}
								<button
									class="btn btn-success"
									type="button"
									onclick={installUpdate}
									disabled={installingUpdate || downloadState.installScheduled}
								>
									{#if installingUpdate}
										<span class="loading loading-spinner loading-sm"></span>
										Menyiapkan…
									{:else if downloadState.installScheduled}
										<Icon name="check" />
										Installer Dibuka
									{:else}
										<Icon name="check" />
										Install Update
									{/if}
								</button>
							{/if}

						</div>
					</div>
				{/if}

				<div class="flex justify-end">
					<button
						class="btn btn-outline btn-sm"
						type="button"
						onclick={() => checkForUpdate(true)}
						disabled={checkingUpdate}
					>
						<Icon name="activity" />
						Periksa ulang
					</button>
				</div>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button type="submit" onclick={closeUpdateModal}>
				tutup
			</button>
		</form>
	</dialog>
{/if}

<section class="card bg-base-100 mt-5 rounded-lg border border-none p-6 shadow-md">
	<div class="space-y-6">
		<div role="alert" class="alert alert-warning">
			<Icon name="alert" />
			<span>Simpan sandi dengan aman. Tidak ada garansi lupa sandi!</span>
		</div>
		<header class="space-y-2">
			<h2 class="text-xl font-semibold">Keamanan Akun</h2>
			<p class="text-base-content/70 text-sm">
				Perbarui kata sandi admin untuk menjaga keamanan akses aplikasi.
			</p>
		</header>

		<FormEnhance action="?/change-password" onsuccess={handlePasswordSuccess}>
			{#snippet children({ submitting, invalid })}
				<div class="space-y-4">
					<div class="form-control">
						<label class="label" for="currentPassword">
							<span class="label-text">Kata sandi saat ini</span>
						</label>
						<input
							type="password"
							id="currentPassword"
							name="currentPassword"
							required
							autocomplete="current-password"
							class="input input-bordered dark:bg-base-200 w-full dark:border-none"
							placeholder="Masukkan kata sandi lama"
						/>
					</div>

					<div class="form-control">
						<label class="label" for="newPassword">
							<span class="label-text">Kata sandi baru</span>
						</label>
						<input
							type="password"
							id="newPassword"
							name="newPassword"
							required
							minlength={8}
							autocomplete="new-password"
							class="input input-bordered dark:bg-base-200 w-full dark:border-none"
							placeholder="Minimal 8 karakter"
						/>
					</div>

					<div class="form-control">
						<label class="label" for="confirmPassword">
							<span class="label-text">Konfirmasi kata sandi baru</span>
						</label>
						<input
							type="password"
							id="confirmPassword"
							name="confirmPassword"
							required
							minlength={8}
							autocomplete="new-password"
							class="input input-bordered dark:bg-base-200 w-full dark:border-none"
							placeholder="Ulangi kata sandi baru"
						/>
					</div>

					<p class="text-base-content/70 text-xs">
						Gunakan kombinasi huruf dan angka untuk keamanan maksimal.
					</p>

					<button class="btn btn-primary" type="submit" disabled={submitting || invalid}>
						<Icon name="save" />
						{submitting ? 'Menyimpan…' : 'Simpan kata sandi'}
					</button>
				</div>
			{/snippet}
		</FormEnhance>
	</div>
</section>
