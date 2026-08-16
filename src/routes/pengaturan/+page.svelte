<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- page uses links for internal navigation */
	import { browser } from '$app/environment';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import UpdateModal from '$lib/components/settings/update-modal.svelte';
	import { page } from '$app/state';

	let user = $derived(page.data.user);
	const isAdmin = $derived(user?.type === 'admin' || user?.type === 'kepala_sekolah');
	const canCheckUpdate = $derived(isAdmin);
	const canManageUsers = $derived(isAdmin);
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

	// Storage location form (admin only). Uploads/sounds follow the data root
	// automatically, so only the root is editable here.
	let storageRoot = $state(data.storage?.dataRoot ?? '');
	const storageChanged = $derived(storageRoot !== (data.storage?.dataRoot ?? ''));

	// Folder picker
	import StorageFolderPicker from '$lib/components/settings/storage-folder-picker.svelte';
	let pickerOpen = $state(false);
	let pickerInitial = $state('');
	let pickerTitle = $state('Pilih Folder');

	function openPicker() {
		pickerInitial = storageRoot;
		pickerTitle = 'Pilih Folder Root Data';
		pickerOpen = true;
	}

	function handlePickerSelect(event: CustomEvent<{ path: string }>) {
		storageRoot = event.detail.path;
		pickerOpen = false;
	}

	// Password visibility toggles
	let showAdminPassword = $state(false);
	let showCurrentPassword = $state(false);
	let showNewPassword = $state(false);
	let showConfirmPassword = $state(false);
	let showBukuTamuPasskey = $state(false);
	let showBukuTamuConfirm = $state(false);
	let clearingBukuTamuPasskey = $state(false);

	onMount(() => {
		if (!appAddress && browser) {
			appAddress = window.location.host;
		}
		if (data.forcePasswordChange && browser) {
			document.getElementById('default-password-warning')?.scrollIntoView({ behavior: 'smooth' });
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

	let wasForcePasswordChange = $state(data.forcePasswordChange);
	let passwordChanged = $state(false);

	function handlePasswordSuccess({ form }: { form: HTMLFormElement }) {
		form.reset();
		passwordChanged = true;
	}

	function handleAdminUsernameSuccess({ form }: { form: HTMLFormElement }) {
		form.reset();
	}
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
	<div class="space-y-4">
		<header class="flex justify-between gap-3">
			<div class="space-y-2">
				<h1 class="text-2xl font-bold">Pengaturan Aplikasi</h1>
				<p class="text-base-content/70 text-sm">
					Pengaturan tambahan untuk lingkungan server lokal Anda.
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
					class="input bg-base-200 join-item w-full dark:border-none"
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
			{#if detectedAddresses.length > 1}
				<label class="label mt-3" for="addressSelector">
					<span class="label-text">Alamat terdeteksi lainnya</span>
				</label>
				<div class="overflow-hidden">
					<select
						id="addressSelector"
						class="select select-bordered dark:bg-base-200 w-full truncate dark:border-none"
						bind:value={appAddress}
					>
						{#each detectedAddresses as address (address)}
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
		{#if canCheckUpdate}
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
			{#if canManageUsers}
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
	<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
		<!-- Change Admin Username -->
		<FormEnhance action="?/change-admin-username" onsuccess={handleAdminUsernameSuccess}>
			{#snippet children({ submitting, invalid })}
				<header class="mb-4 space-y-2">
					<h2 class="text-xl font-semibold">Ganti Username</h2>
					<p class="text-base-content/70 text-sm">
						Perbarui username untuk menjaga keamanan akses aplikasi.
					</p>
				</header>
				<div class="flex flex-col gap-2">
					<div class="w-full">
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Username</legend>
							<div class="form-control">
								<label class="input bg-base-200 dark:bg-base-300 validator w-full dark:border-none">
									<span class="pl-2"><Icon name="users" /></span>
									<input
										type="text"
										id="adminUsername"
										name="adminUsername"
										required
										pattern="^[A-Za-z0-9._-]&#123;3,&#125;$"
										title="Gunakan huruf, angka, titik, underscore atau minus. Minimal 3 karakter."
										placeholder="contoh: laila2"
									/>
								</label>
								<p class="text-base-content/70 mt-1 text-xs">Masukkan username baru.</p>
							</div>
						</fieldset>
					</div>

					<div class="w-full">
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Konfirmasi Dengan Kata Sandi</legend>
							<div class="form-control">
								<label class="input bg-base-200 dark:bg-base-300 validator w-full dark:border-none">
									<span class="pl-2"><Icon name="lock" /></span>
									<input
										type={showAdminPassword ? 'text' : 'password'}
										id="adminPassword"
										name="adminPassword"
										required
										placeholder="Masukkan kata sandi"
										autocomplete="current-password"
									/>
									<button
										type="button"
										class="cursor-pointer pr-2"
										onclick={() => (showAdminPassword = !showAdminPassword)}
										aria-label="Toggle password visibility"
									>
										<Icon name={showAdminPassword ? 'eye-off' : 'eye'} />
									</button>
								</label>
								<p class="text-base-content/70 mt-1 text-xs">
									Masukkan kata sandi saat ini untuk konfirmasi perubahan username.
								</p>
							</div>
						</fieldset>
					</div>
				</div>

				<div class="mt-6 flex justify-end">
					<button
						class="btn btn-primary shadow-none"
						type="submit"
						disabled={submitting || invalid}
					>
						<Icon name="save" />
						{submitting ? 'Menyimpan…' : 'Terapkan'}
					</button>
				</div>
			{/snippet}
		</FormEnhance>
	</section>

	<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md" id="ganti-password">
		<div class="space-y-4">
			<header class="space-y-2">
				<h2 class="text-xl font-semibold">Ganti Password</h2>
				<p class="text-base-content/70 text-sm">
					Perbarui kata sandi untuk menjaga keamanan akses aplikasi.
				</p>
			</header>

			<FormEnhance action="?/change-password" onsuccess={handlePasswordSuccess}>
				{#snippet children({ submitting, invalid })}
					<div>
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Kata sandi saat ini</legend>
							<label class="input bg-base-200 dark:bg-base-300 validator w-full dark:border-none">
								<span class="pl-2"><Icon name="lock" /></span>
								<input
									type={showCurrentPassword ? 'text' : 'password'}
									id="currentPassword"
									name="currentPassword"
									required
									autocomplete="current-password"
									placeholder="Masukkan kata sandi lama"
								/>
								<button
									type="button"
									class="cursor-pointer pr-2"
									onclick={() => (showCurrentPassword = !showCurrentPassword)}
									aria-label="Toggle password visibility"
								>
									<Icon name={showCurrentPassword ? 'eye-off' : 'eye'} />
								</button>
							</label>
						</fieldset>

						<fieldset class="fieldset">
							<legend class="fieldset-legend">Kata sandi baru</legend>
							<label class="input bg-base-200 dark:bg-base-300 validator w-full dark:border-none">
								<span class="pl-2"><Icon name="lock" /></span>
								<input
									type={showNewPassword ? 'text' : 'password'}
									id="newPassword"
									name="newPassword"
									required
									minlength={8}
									autocomplete="new-password"
									placeholder="Minimal 8 karakter"
								/>
								<button
									type="button"
									class="cursor-pointer pr-2"
									onclick={() => (showNewPassword = !showNewPassword)}
									aria-label="Toggle password visibility"
								>
									<Icon name={showNewPassword ? 'eye-off' : 'eye'} />
								</button>
							</label>
						</fieldset>

						<fieldset class="fieldset">
							<legend class="fieldset-legend">Konfirmasi kata sandi baru</legend>
							<label class="input bg-base-200 dark:bg-base-300 validator w-full dark:border-none">
								<span class="pl-2"><Icon name="lock" /></span>
								<input
									type={showConfirmPassword ? 'text' : 'password'}
									id="confirmPassword"
									name="confirmPassword"
									required
									minlength={8}
									autocomplete="new-password"
									placeholder="Ulangi kata sandi baru"
								/>
								<button
									type="button"
									class="cursor-pointer pr-2"
									onclick={() => (showConfirmPassword = !showConfirmPassword)}
									aria-label="Toggle password visibility"
								>
									<Icon name={showConfirmPassword ? 'eye-off' : 'eye'} />
								</button>
							</label>
						</fieldset>

						<p class="text-base-content/70 text-xs">
							Gunakan kombinasi huruf dan angka untuk keamanan maksimal.
						</p>

						<div class="mt-6 flex justify-end">
							<button
								class="btn btn-primary shadow-none"
								type="submit"
								disabled={submitting || invalid}
							>
								<Icon name="save" />
								{submitting ? 'Menyimpan…' : 'Simpan kata sandi'}
							</button>
						</div>
					</div>
				{/snippet}
			</FormEnhance>
		</div>
	</section>
</div>

{#if user?.type === 'admin' && data.storage}
	<section class="card bg-base-100 mt-4 rounded-lg border border-none p-6 shadow-md">
		<FormEnhance action="?/update-storage-location">
			{#snippet children({ submitting })}
				<header class="mb-4 space-y-2">
					<h2 class="text-xl font-semibold">Lokasi Data</h2>
					<p class="text-base-content/70 text-sm">
						Pilih root data — subfolder <code>ttd/</code>, <code>dinas-luar/</code>,
						<code>uploads/</code>, dan <code>sounds/</code> akan dibuat otomatis di dalamnya. File yang
						ada akan dipindahkan otomatis ke lokasi baru; perubahan berlaku setelah server dimulai ulang.
					</p>
				</header>

				{#if data.storage.rootManagedByLauncher}
					<div role="alert" class="alert alert-info mb-4">
						<Icon name="alert" />
						<span
							>Pada instalasi Windows, pengaturan ini disimpan ke file peluncur
							<code>%LOCALAPPDATA%\Rapkumer-data\data-root.txt</code> dan diterapkan saat aplikasi
							dimulai ulang. Basis data tetap berada di
							<code>%LOCALAPPDATA%\Rapkumer-data\database.sqlite3</code>.</span
						>
					</div>
				{/if}

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Root data (RAPKUMER_DATA_DIR)</legend>
					<div class="join w-full">
						<input
							class="input bg-base-200 dark:bg-base-300 join-item w-full dark:border-none"
							type="text"
							name="dataRoot"
							bind:value={storageRoot}
							placeholder="Kosongkan untuk default"
						/>
						<button
							class="btn join-item btn-soft btn-info shadow-none"
							type="button"
							onclick={openPicker}
						>
							<Icon name="folder" />
							Jelajah
						</button>
					</div>
					<p class="text-base-content/70 mt-1 text-xs">
						Cukup pilih root ini saja — subfolder <code>ttd/</code>, <code>dinas-luar/</code>,
						<code>uploads/</code>, dan <code>sounds/</code> dibuat otomatis di dalamnya saat disimpan.
					</p>
				</fieldset>

				<div role="alert" class="alert alert-info mt-4 alert-soft">
					<Icon name="info" />
					<span
						>File di lokasi lama akan disalin ke lokasi baru (tidak dihapus). Perlu mulai ulang
						server agar aplikasi membaca folder baru.</span
					>
				</div>

				<div class="mt-6 flex justify-end">
					<button
						class="btn btn-primary shadow-none"
						type="submit"
						disabled={submitting || !storageChanged}
						aria-disabled={!storageChanged}
						title={storageChanged ? '' : 'Tidak ada perubahan yang disimpan'}
					>
						<Icon name="save" />
						{submitting ? 'Menyimpan…' : 'Simpan Lokasi'}
					</button>
				</div>
			{/snippet}
		</FormEnhance>

		<StorageFolderPicker
			open={pickerOpen}
			title={pickerTitle}
			initial={pickerInitial}
			on:select={handlePickerSelect}
			on:close={() => (pickerOpen = false)}
		/>
	</section>
{/if}

{#if isAdmin}
	<section class="card bg-base-100 mt-4 rounded-lg border border-none p-6 shadow-md">
		<FormEnhance
			action="?/buku-tamu-passkey"
			onsuccess={({ form }) => {
				form.reset();
			}}
		>
			{#snippet children({ submitting, invalid })}
				<header class="mb-4 space-y-2">
					<h2 class="text-xl font-semibold">Passkey Buku Tamu</h2>
					<p class="text-base-content/70 text-sm">
						Jika diaktifkan, pengunjung harus memasukkan passkey sekali saat membuka halaman
						<code>/tamu</code> sebelum dapat mengisi buku tamu. Kosongkan untuk menonaktifkan.
					</p>
					{#if data.bukuTamuPasskeySet}
						<div class="alert alert-success">
							<Icon name="success" />
							<span>Passkey buku tamu aktif.</span>
						</div>
					{/if}
				</header>

				<div class="flex flex-col gap-2">
					<div class="w-full">
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Passkey</legend>
							<div class="form-control">
								<label class="input bg-base-200 dark:bg-base-300 validator w-full dark:border-none">
									<span class="pl-2"><Icon name="lock" /></span>
									<input
										type={showBukuTamuPasskey ? 'text' : 'password'}
										id="passkey"
										name="passkey"
										required
										minlength={4}
										maxlength={64}
										placeholder="Masukkan passkey baru (4–64 karakter)"
										autocomplete="new-password"
									/>
									<button
										type="button"
										class="cursor-pointer pr-2"
										onclick={() => (showBukuTamuPasskey = !showBukuTamuPasskey)}
										aria-label="Toggle passkey visibility"
									>
										<Icon name={showBukuTamuPasskey ? 'eye-off' : 'eye'} />
									</button>
								</label>
							</div>
						</fieldset>
					</div>

					<div class="w-full">
						<fieldset class="fieldset">
							<legend class="fieldset-legend">Konfirmasi passkey</legend>
							<div class="form-control">
								<label class="input bg-base-200 dark:bg-base-300 validator w-full dark:border-none">
									<span class="pl-2"><Icon name="lock" /></span>
									<input
										type={showBukuTamuConfirm ? 'text' : 'password'}
										id="confirmPasskey"
										name="confirmPasskey"
										required
										minlength={4}
										maxlength={64}
										placeholder="Ulangi passkey baru"
										autocomplete="new-password"
									/>
									<button
										type="button"
										class="cursor-pointer pr-2"
										onclick={() => (showBukuTamuConfirm = !showBukuTamuConfirm)}
										aria-label="Toggle confirm passkey visibility"
									>
										<Icon name={showBukuTamuConfirm ? 'eye-off' : 'eye'} />
									</button>
								</label>
							</div>
						</fieldset>
					</div>
				</div>

				<div class="mt-6 flex items-center gap-2">
					{#if data.bukuTamuPasskeySet}
						<button
							class="btn btn-soft btn-error shadow-none"
							type="submit"
							form="buku-tamu-passkey-clear"
							disabled={clearingBukuTamuPasskey}
						>
							<Icon name="del" />
							{clearingBukuTamuPasskey ? 'Menonaktifkan…' : 'Nonaktifkan Passkey'}
						</button>
					{/if}

					<button
						class="btn btn-primary shadow-none ml-auto"
						type="submit"
						disabled={submitting || invalid}
					>
						<Icon name="save" />
						{submitting ? 'Menyimpan…' : 'Simpan Passkey'}
					</button>
				</div>
			{/snippet}
		</FormEnhance>

		{#if data.bukuTamuPasskeySet}
			<FormEnhance
				id="buku-tamu-passkey-clear"
				action="?/buku-tamu-passkey-clear"
				submitStateChange={(s) => (clearingBukuTamuPasskey = s)}
			>
				{#snippet children({ submitting })}
					<button type="submit" class="hidden" disabled={submitting}>Nonaktifkan</button>
				{/snippet}
			</FormEnhance>
		{/if}
	</section>
{/if}
