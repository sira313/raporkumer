<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- card uses links for internal navigation */
	import { browser } from '$app/environment';
	import Icon from '$lib/components/icon.svelte';
	import UpdateModal from '$lib/components/settings/update-modal.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import { onMount } from 'svelte';

	let {
		currentVersion,
		addresses,
		protocol,
		isAdmin
	}: {
		currentVersion: string;
		addresses: string[];
		protocol: string;
		isAdmin: boolean;
	} = $props();

	// svelte-ignore state_referenced_locally
	let appAddress = $state(addresses[0] ?? '');
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
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
	<div class="space-y-4">
		<header class="flex justify-between gap-3">
			<div class="space-y-2">
				<h1 class="text-2xl font-bold">Pengaturan Aplikasi</h1>
				<p class="text-base-content/70 text-sm">
					Pengaturan tambahan untuk lingkungan server lokal.
				</p>
				<p class="text-base-content/60 text-xs">Versi terpasang: v{currentVersion}</p>
			</div>
		</header>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Alamat aplikasi</legend>
			<div class="join">
				<input
					type="text"
					disabled
					class="input bg-base-200 join-item w-full border-base-300 dark:border-none"
					placeholder={appAddress || 'Tidak ada alamat terdeteksi'}
					value={appAddress}
				/>
				<button
					class="btn join-item btn-soft btn-info shadow-none"
					type="button"
					onclick={copyAddress}
					disabled={!appAddress || copying}
				>
					<Icon name="copy" />
					{copying ? 'Menyalin…' : 'Copy'}
				</button>
			</div>
			{#if addresses.length > 1}
				<label class="label mt-3" for="addressSelector">
					<span class="label-text">Alamat terdeteksi lainnya</span>
				</label>
				<div class="overflow-hidden">
					<select
						id="addressSelector"
						class="select select-bordered dark:bg-base-200 w-full truncate border-base-300 dark:border-none"
						bind:value={appAddress}
					>
						{#each addresses as address (address)}
							<option value={address}>{address}</option>
						{/each}
					</select>
				</div>
			{/if}
			<p class="text-base-content/70 mt-1 text-xs">
				Buka alamat ini pada perangkat lain di jaringan lokal yang sama.
			</p>
		</fieldset>
	</div>
	<UpdateModal open={updateModalOpen} {currentVersion} on:close={() => (updateModalOpen = false)} />
	<div class="mt-4 flex flex-col justify-between gap-2 sm:flex-row">
		{#if isAdmin}
			<button
				class="btn btn-soft btn-secondary shadow-none sm:self-start"
				type="button"
				onclick={() => (updateModalOpen = true)}
			>
				<Icon name="download" />
				Cek Update
			</button>
		{/if}
		<div class="flex flex-col gap-2 sm:flex-row">
			{#if isAdmin}
				<a class="btn btn-soft btn-info shadow-none" href="/pengguna">
					<Icon name="users" />
					Manajemen Pengguna
				</a>
			{/if}
			<a class="btn btn-soft btn-success shadow-none" href="/pengaturan/profil">
				<Icon name="user" />
				Edit Profil
			</a>
		</div>
	</div>
</section>
