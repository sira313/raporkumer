<script lang="ts">
	import { browser } from '$app/environment';
	import Icon from '$lib/components/icon.svelte';
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import AppInfoCard from '$lib/components/settings/app-info-card.svelte';
	import ChangeUsernameCard from '$lib/components/settings/change-username-card.svelte';
	import ChangePasswordCard from '$lib/components/settings/change-password-card.svelte';
	import StorageLocationCard from '$lib/components/settings/storage-location-card.svelte';
	import DatabaseCard from '$lib/components/settings/database-card.svelte';
	import BukuTamuPasskeyCard from '$lib/components/settings/buku-tamu-passkey-card.svelte';
	import AiKeyCard from '$lib/components/settings/ai-key-card.svelte';
	import type { PageData } from './$types';

	const { data } = $props<{ data: PageData }>();

	let user = $derived(page.data.user);
	const isAdmin = $derived(user?.type === 'admin' || user?.type === 'kepala_sekolah');

	// svelte-ignore state_referenced_locally
	let wasForcePasswordChange = $state(data.forcePasswordChange);
	let passwordChanged = $state(false);

	onMount(() => {
		if (data.forcePasswordChange && browser) {
			document.getElementById('default-password-warning')?.scrollIntoView({ behavior: 'smooth' });
		}
	});

	function handlePasswordSuccess() {
		passwordChanged = true;
	}
</script>

<AppInfoCard
	currentVersion={data.appVersion ?? '0.0.0'}
	addresses={data.appAddresses ?? []}
	protocol={data.protocol ?? 'http:'}
	{isAdmin}
/>

{#if wasForcePasswordChange}
	{#if passwordChanged}
		<div class="alert alert-success mt-4" role="status">
			<Icon name="success" />
			<span>Silahkan gunakan aplikasi…</span>
		</div>
	{:else}
		<div id="default-password-warning" class="alert alert-warning mt-4 scroll-mt-20" role="alert">
			<Icon name="lock" />
			<span>
				Jangan gunakan sandi bawaan! Perbarui kata sandi di bagian
				<strong>Ganti Password</strong> di bawah sebelum menggunakan aplikasi.
			</span>
		</div>
	{/if}
{/if}

<div class="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
	<ChangeUsernameCard />
	<ChangePasswordCard onsuccess={handlePasswordSuccess} />
</div>

{#if user?.type === 'admin' && data.storage}
	<div class="mt-4">
		<StorageLocationCard storage={data.storage} />
	</div>
{/if}

<!-- Hidden during forced password change: the auth guard redirects the database
	API calls in that state, so the buttons would silently fail. -->
{#if isAdmin && !wasForcePasswordChange}
	<div class="mt-4">
		<DatabaseCard />
	</div>
{/if}

{#if isAdmin}
	<div class="mt-4">
		<BukuTamuPasskeyCard passkeySet={data.bukuTamuPasskeySet} />
	</div>
{/if}

{#if isAdmin}
	<div class="mt-4">
		<AiKeyCard gemini={data.gemini} />
	</div>
{/if}
