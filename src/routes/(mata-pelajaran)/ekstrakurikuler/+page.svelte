<script lang="ts">
	import { invalidate } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';

	let {
		data
	}: {
		data: {
			kelasId: number | null;
			tableReady: boolean;
			ekstrakurikuler: Ekstrakurikuler[];
		};
	} = $props();

	let selectedIds = $state<number[]>([]);
	let selectAllCheckbox: HTMLInputElement | null = null;
	let lastTableReady = $state<boolean | null>(null);
	let modalState = $state<
		| { mode: 'add' }
		| { mode: 'edit'; item: Ekstrakurikuler }
		| null
	>(null);
	let deleteDialogState = $state<
		| { source: 'bulk'; ids: number[] }
		| { source: 'single'; ids: number[]; item: Ekstrakurikuler }
		| null
	>(null);
	let namaInput = $state('');

	const totalData = $derived.by(() => data.ekstrakurikuler.length);
	const anySelected = $derived.by(() => selectedIds.length > 0);
	const allSelected = $derived.by(() => totalData > 0 && selectedIds.length === totalData);
	const canManage = $derived.by(() => data.tableReady && !!data.kelasId);
	const isModalOpen = $derived.by(() => modalState !== null);
	const isEditMode = $derived.by(() => modalState?.mode === 'edit');
	const modalItem = $derived.by(() => (modalState?.mode === 'edit' ? modalState.item : null));
	const modalTitle = $derived.by(() => (isEditMode ? 'Edit Ekstrakurikuler' : 'Tambah Ekstrakurikuler'));
	const modalAction = $derived.by(() => (isEditMode ? '?/update' : '?/add'));
	const bulkDeleteDisabled = $derived.by(() => !anySelected || !canManage);
	const isDeleteModalOpen = $derived.by(() => deleteDialogState !== null);
	const deleteModalTitle = $derived.by(() => {
		if (!deleteDialogState) return 'Hapus Ekstrakurikuler';
		return deleteDialogState.source === 'bulk'
			? `Hapus ${deleteDialogState.ids.length} Ekstrakurikuler`
			: 'Hapus Ekstrakurikuler';
	});
	const deleteModalItem = $derived.by(() =>
		deleteDialogState?.source === 'single' ? deleteDialogState.item : null
	);
	const deleteModalIds = $derived.by(() => deleteDialogState?.ids ?? []);
	const deleteModalDisabled = $derived.by(() => deleteModalIds.length === 0 || !canManage);

	$effect(() => {
		if (selectAllCheckbox) {
			selectAllCheckbox.indeterminate = selectedIds.length > 0 && selectedIds.length < totalData;
		}
	});

	$effect(() => {
		if (selectedIds.length === 0) return;
		const existingIds = new Set(data.ekstrakurikuler.map((item) => item.id));
		const filtered = selectedIds.filter((id) => existingIds.has(id));
		if (filtered.length !== selectedIds.length) {
			selectedIds = filtered;
		}
	});

	$effect(() => {
		const tableReady = data.tableReady ?? false;
		if (lastTableReady === tableReady) return;
		lastTableReady = tableReady;

		if (!tableReady) {
			if (selectedIds.length) selectedIds = [];
			if (namaInput) namaInput = '';
			if (modalState) modalState = null;
			if (deleteDialogState) deleteDialogState = null;
		}
	});

	function toggleRowSelection(id: number, checked: boolean) {
		selectedIds = checked
			? [...new Set([...selectedIds, id])]
			: selectedIds.filter((selectedId) => selectedId !== id);
	}

	function handleSelectAll(checked: boolean) {
		selectedIds = checked ? data.ekstrakurikuler.map((item) => item.id) : [];
	}

	function openAddModal() {
		if (!canManage) return;
		namaInput = '';
		modalState = { mode: 'add' };
	}

	function openEditModal(item: Ekstrakurikuler) {
		if (!canManage) return;
		namaInput = item.nama;
		modalState = { mode: 'edit', item };
	}

	function openBulkDeleteModal() {
		if (!canManage) return;
		if (!selectedIds.length) return;
		deleteDialogState = { source: 'bulk', ids: [...selectedIds] };
	}

	function openSingleDeleteModal(item: Ekstrakurikuler) {
		if (!canManage) return;
		deleteDialogState = { source: 'single', ids: [item.id], item };
	}

	function closeModal() {
		if (modalState === null && !namaInput) return;
		modalState = null;
		if (namaInput) namaInput = '';
	}

	function closeDeleteModal() {
		if (!deleteDialogState) return;
		deleteDialogState = null;
	}
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<h2 class="text-xl font-bold">Daftar Ekstrakurikuler</h2>
			{#if !data.kelasId}
				<p class="text-sm text-base-content/60">Pilih kelas aktif agar data ekstrakurikuler tampil.</p>
			{/if}
		</div>
		<div class="flex flex-col gap-2 sm:flex-row">
			<button class="btn shadow-none" disabled={!canManage} onclick={openAddModal}>
				<Icon name="plus" />
				Tambah
			</button>
			<button
				type="button"
				class={`btn shadow-none w-full sm:w-fit ${bulkDeleteDisabled ? '' : 'btn-soft btn-error'}`}
				disabled={bulkDeleteDisabled}
				onclick={openBulkDeleteModal}
			>
				<Icon name="del" />
				Hapus
			</button>
		</div>
	</div>

	{#if !data.kelasId}
		<div class="alert mt-6 border border-dashed border-warning/60 bg-warning/10 text-warning-content">
			<Icon name="info" />
			<span>Silakan pilih kelas di navbar sebelum menambah ekstrakurikuler.</span>
		</div>
	{/if}

	{#if !data.tableReady}
		<div class="alert mt-4 border border-dashed border-error/60 bg-error/10 text-error-content">
			<Icon name="warning" />
			<span>
				Database ekstrakurikuler belum siap. Jalankan <code>pnpm db:push</code> untuk menerapkan migrasi
				terbaru.
			</span>
		</div>
	{/if}

	<div class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none">
		<table class="border-base-200 table min-w-[560px] border dark:border-none">
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-left font-bold">
					<th style="width: 50px; min-width: 40px;">
						<input
							type="checkbox"
							class="checkbox"
							bind:this={selectAllCheckbox}
							disabled={!data.ekstrakurikuler.length || !data.tableReady}
							checked={allSelected}
							onchange={(event) => handleSelectAll(event.currentTarget.checked)}
						/>
					</th>
					<th style="width: 60px;">No</th>
					<th class="w-full" style="min-width: 260px;">Ekstrakurikuler</th>
					<th>Tujuan Pembelajaran</th>
					<th style="width: 140px; min-width: 120px;">Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#each data.ekstrakurikuler as item, index (item.id)}
					<tr>
						<td>
							<input
								type="checkbox"
								class="checkbox"
								checked={selectedIds.includes(item.id)}
								disabled={!data.tableReady}
								onchange={(event) => toggleRowSelection(item.id, event.currentTarget.checked)}
							/>
						</td>
						<td>{index + 1}</td>
						<td>{item.nama}</td>
						<td>
							<a
								href={`ekstrakurikuler/tp-ekstra?ekstrakurikulerId=${item.id}`}
								class={`btn btn-sm shadow-none ${!canManage ? 'btn-disabled pointer-events-none opacity-60' : ''}`}
								title="Atur tujuan ekstrakurikuler"
								aria-disabled={!canManage}
								tabindex={canManage ? undefined : -1}
							>
								<Icon name="book" />
								Edit TP
							</a>
						</td>
						<td class="flex items-center justify-end gap-2">
							<button
								class="btn btn-sm btn-soft shadow-none"
								type="button"
								title="Edit ekstrakurikuler"
								aria-label="Edit ekstrakurikuler"
								disabled={!canManage}
								onclick={() => openEditModal(item)}
							>
								<Icon name="edit" />
							</button>
							<button
								class="btn btn-sm btn-soft btn-error shadow-none"
								type="button"
								title="Hapus ekstrakurikuler"
								aria-label="Hapus ekstrakurikuler"
								disabled={!canManage}
								onclick={() => openSingleDeleteModal(item)}
							>
								<Icon name="del" />
							</button>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="py-6 text-center italic opacity-60" colspan="4">
							Belum ada data ekstrakurikuler
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#if isModalOpen}
	<div
		class="modal modal-open"
		tabindex="-1"
		role="dialog"
		aria-modal="true"
		onkeydown={(event) => {
			if (event.key === 'Escape') closeModal();
		}}
	>
		<dialog class="modal-box relative z-10 max-w-md" open aria-modal="true">
			<h3 class="text-lg font-bold">{modalTitle}</h3>
			<p class="mt-2 text-sm text-base-content/70">
				Isi nama ekstrakurikuler sesuai kegiatan yang berjalan di kelas.
			</p>

			<FormEnhance
				action={modalAction}
				onsuccess={({ form }) => {
					form.reset();
					namaInput = '';
					closeModal();
					invalidate('app:ekstrakurikuler');
				}}
			>
				{#snippet children({ submitting })}
					<input name="kelasId" value={data.kelasId ?? ''} hidden />
					{#if isEditMode && modalItem}
						<input name="id" value={modalItem.id} hidden />
					{/if}

					<label class="mt-4 flex flex-col gap-2">
						<span class="font-semibold">Nama Ekstrakurikuler</span>
						<input
							class="input bg-base-200 dark:border-none w-full"
							placeholder="Masukkan nama ekstrakurikuler"
							name="nama"
							bind:value={namaInput}
							required
							disabled={!canManage}
						/>
					</label>

					<div class="modal-action mt-6 flex gap-2">
						<button class="btn shadow-none" type="button" onclick={closeModal}>
							<Icon name="close" />
							Batal
						</button>
						<button
							class="btn shadow-none"
							disabled={
								submitting || !namaInput.trim() || !data.kelasId || !data.tableReady
							}
						>
							{#if submitting}
								<div class="loading loading-spinner"></div>
							{:else}
								<Icon name="save" />
							{/if}
							{isEditMode ? 'Simpan Perubahan' : 'Simpan'}
						</button>
					</div>
				{/snippet}
			</FormEnhance>
		</dialog>
		<form method="dialog" class="modal-backdrop">
			<button
				type="submit"
				onclick={(event) => {
					event.preventDefault();
					closeModal();
				}}
			>
				tutup
			</button>
		</form>
	</div>
{/if}

{#if isDeleteModalOpen}
	<div
		class="modal modal-open"
		tabindex="-1"
		role="dialog"
		aria-modal="true"
		onkeydown={(event) => {
			if (event.key === 'Escape') closeDeleteModal();
		}}
	>
		<dialog class="modal-box relative z-10 max-w-md" open aria-modal="true">
			<Icon name="warning" class="text-error" />
			<h3 class="mt-2 text-lg font-bold">{deleteModalTitle}</h3>
			{#if deleteDialogState?.source === 'single' && deleteModalItem}
				<p class="mt-2 text-sm">
					Yakin ingin menghapus ekstrakurikuler
					<span class="font-semibold">{deleteModalItem.nama}</span>?
				</p>
			{:else if deleteDialogState}
				<p class="mt-2 text-sm">
					Yakin ingin menghapus {deleteModalIds.length} ekstrakurikuler terpilih?
				</p>
			{/if}

			<FormEnhance
				action="?/delete"
				onsuccess={() => {
					const ids = deleteDialogState?.ids ?? [];
					if (ids.length) {
						selectedIds = selectedIds.filter((selectedId) => !ids.includes(selectedId));
					}
					closeDeleteModal();
					invalidate('app:ekstrakurikuler');
				}}
			>
				{#snippet children({ submitting })}
					{#each deleteModalIds as id (id)}
						<input name="ids" value={id} hidden />
					{/each}

					<div class="modal-action mt-6 flex gap-2">
						<button class="btn shadow-none" type="button" onclick={closeDeleteModal}>
							<Icon name="close" />
							Batal
						</button>
						<button
							class="btn btn-error btn-soft shadow-none"
							type="submit"
							disabled={submitting || deleteModalDisabled}
						>
							{#if submitting}
								<div class="loading loading-spinner"></div>
							{:else}
								<Icon name="del" />
							{/if}
							Hapus
						</button>
					</div>
				{/snippet}
			</FormEnhance>
		</dialog>
		<form method="dialog" class="modal-backdrop">
			<button
				type="submit"
				onclick={(event) => {
					event.preventDefault();
					closeDeleteModal();
				}}
			>
				tutup
			</button>
		</form>
	</div>
{/if}
