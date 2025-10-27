<script lang="ts">
	import { browser } from '$app/environment';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import UpdateModal from '$lib/components/settings/update-modal.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	const { data } = $props<{ data: PageData }>();

	const detectedAddresses = data.appAddresses ?? [];
	const protocol = data.protocol ?? 'http:';
	const currentVersion = $derived(data.appVersion ?? '0.0.0');

	let appAddress = $state(detectedAddresses[0] ?? '');
	let copying = $state(false);
	let updateModalOpen = $state(false);

	onMount(() => {
		if (!appAddress && browser) {
			appAddress = window.location.host;
		}
	});

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
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
	<div class="space-y-4">
		<header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
			<div class="space-y-2">
				<h1 class="text-2xl font-bold">Pengaturan Aplikasi</h1>
				<p class="text-base-content/70 text-sm">
					Pengaturan tambahan untuk lingkungan server lokal Anda.
				</p>
				<p class="text-base-content/60 text-xs">Versi terpasang: v{currentVersion}</p>
			</div>
			<button
				class="btn btn-outline btn-secondary shadow-none sm:self-start"
				type="button"
				onclick={() => (updateModalOpen = true)}
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
	<UpdateModal open={updateModalOpen} {currentVersion} on:close={() => (updateModalOpen = false)} />
</section>

<section class="card bg-base-100 mt-5 rounded-lg border border-none p-6 shadow-md">
	<div class="space-y-4">
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
				<div>
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Kata sandi saat ini</legend>
						<input
							type="password"
							id="currentPassword"
							name="currentPassword"
							required
							autocomplete="current-password"
							class="input input-bordered dark:bg-base-200 w-full dark:border-none"
							placeholder="Masukkan kata sandi lama"
						/>
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Kata sandi baru</legend>
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
					</fieldset>

					<fieldset class="fieldset">
						<legend class="fieldset-legend">Konfirmasi kata sandi baru</legend>
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
					</fieldset>

					<p class="text-base-content/70 text-xs">
						Gunakan kombinasi huruf dan angka untuk keamanan maksimal.
					</p>

					<div class="mt-6 flex justify-between">
						<a class="btn btn-outline btn-info" href="/pengguna">
							<Icon name="users" />
							Manajemen Pengguna
						</a>

						<button class="btn btn-primary" type="submit" disabled={submitting || invalid}>
							<Icon name="save" />
							{submitting ? 'Menyimpan…' : 'Simpan kata sandi'}
						</button>
					</div>
				</div>
			{/snippet}
		</FormEnhance>
	</div>
</section>
