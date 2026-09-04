<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import StorageFolderPicker from '$lib/components/settings/storage-folder-picker.svelte';

	let { storage }: { storage: { dataRoot: string; rootManagedByLauncher: boolean } } = $props();

	// Storage location form (admin only). Uploads/sounds follow the data root
	// automatically, so only the root is editable here.
	// svelte-ignore state_referenced_locally
	let storageRoot = $state(storage.dataRoot);
	const storageChanged = $derived(storageRoot !== storage.dataRoot);

	// Folder picker
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
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
	<FormEnhance action="?/update-storage-location">
		{#snippet children({ submitting })}
			<header class="mb-4 space-y-2">
				<h2 class="text-xl font-semibold">Lokasi Data</h2>
				<p class="text-base-content/70 text-sm">
					Pilih root data. Subfolder <code>ttd/</code>, <code>dinas-luar/</code>,
					<code>uploads/</code>, dan <code>sounds/</code> akan dibuat otomatis di dalamnya. File yang
					ada akan dipindahkan otomatis ke lokasi baru; perubahan berlaku setelah server dimulai ulang.
				</p>
			</header>

			{#if storage.rootManagedByLauncher}
				<div role="alert" class="alert alert-info mb-4">
					<Icon name="alert" />
					<span
						>Pada instalasi Windows, pengaturan ini disimpan ke file Installer
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
					Cukup pilih root ini saja. Subfolder <code>ttd/</code>, <code>dinas-luar/</code>,
					<code>uploads/</code>, dan <code>sounds/</code> dibuat otomatis di dalamnya saat disimpan.
				</p>
			</fieldset>

			<div role="alert" class="alert alert-info mt-4 alert-soft">
				<Icon name="info" />
				<span
					>File di lokasi lama akan disalin ke lokasi baru (tidak dihapus). Perlu mulai ulang server
					agar aplikasi membaca folder baru.</span
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
