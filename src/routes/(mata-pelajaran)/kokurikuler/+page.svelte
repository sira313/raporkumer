<script lang="ts">
	import { invalidate } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import {
		profilPelajarPancasilaDimensionLabelByKey,
		profilPelajarPancasilaDimensions,
		type ProfilPelajarPancasilaDimensionKey
	} from '$lib/statics';

	let {
		data
	}: {
		data: {
			kelasId: number | null;
			kokurikuler: Array<
				Kokurikuler & { dimensi: ProfilPelajarPancasilaDimensionKey[] }
			>;
			dimensiPilihan: typeof profilPelajarPancasilaDimensions;
			tableReady: boolean;
		};
	} = $props();
	let selectedIds = $state<number[]>([]);
	let selectedDimensions = $state<ProfilPelajarPancasilaDimensionKey[]>([]);
	let selectAllCheckbox: HTMLInputElement | null = null;
	let lastTableReady = $state<boolean | null>(null);
	let modalState = $state<
		| { mode: 'add' }
		| { mode: 'edit'; item: Kokurikuler & { dimensi: ProfilPelajarPancasilaDimensionKey[] } }
		| null
	>(null);
	let deleteDialogState = $state<
		| {
				ids: number[];
				source: 'bulk';
			}
		| {
				ids: number[];
				source: 'single';
				item: Kokurikuler & { dimensi: ProfilPelajarPancasilaDimensionKey[] };
			}
		| null
	>(null);
	let tujuanInput = $state('');

	const labelByKey = profilPelajarPancasilaDimensionLabelByKey;

	const totalData = $derived.by(() => data.kokurikuler.length);
	const anySelected = $derived.by(() => selectedIds.length > 0);
	const allSelected = $derived.by(() => totalData > 0 && selectedIds.length === totalData);
	const canManage = $derived.by(() => data.tableReady && !!data.kelasId);
	const isModalOpen = $derived.by(() => modalState !== null);
	const isEditMode = $derived.by(() => modalState?.mode === 'edit');
	const modalItem = $derived.by(() => (modalState?.mode === 'edit' ? modalState.item : null));
	const modalTitle = $derived.by(() => (isEditMode ? 'Edit Kokurikuler' : 'Tambah Kokurikuler'));
	const modalAction = $derived.by(() => (isEditMode ? '?/update' : '?/add'));
	const bulkDeleteDisabled = $derived.by(() => !anySelected || !canManage);
	const isDeleteModalOpen = $derived.by(() => deleteDialogState !== null);
	const deleteModalTitle = $derived.by(() => {
		if (!deleteDialogState) return 'Hapus Kokurikuler';
		return deleteDialogState.source === 'bulk'
			? `Hapus ${deleteDialogState.ids.length} Kokurikuler`
			: 'Hapus Kokurikuler';
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
		const existingIds = new Set(data.kokurikuler.map((item) => item.id));
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
			if (selectedDimensions.length) selectedDimensions = [];
			if (tujuanInput) tujuanInput = '';
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
		selectedIds = checked ? data.kokurikuler.map((item) => item.id) : [];
	}

	function openAddModal() {
		if (!canManage) return;
		if (selectedDimensions.length) selectedDimensions = [];
		tujuanInput = '';
		modalState = { mode: 'add' };
	}

	function openEditModal(item: Kokurikuler & { dimensi: ProfilPelajarPancasilaDimensionKey[] }) {
		if (!canManage) return;
		selectedDimensions = [...item.dimensi];
		tujuanInput = item.tujuan;
		modalState = { mode: 'edit', item };
	}

	function openBulkDeleteModal() {
		if (!canManage) return;
		if (!selectedIds.length) return;
		deleteDialogState = { source: 'bulk', ids: [...selectedIds] };
	}

	function openSingleDeleteModal(item: Kokurikuler & { dimensi: ProfilPelajarPancasilaDimensionKey[] }) {
		if (!canManage) return;
		deleteDialogState = { source: 'single', ids: [item.id], item };
	}

	function closeModal() {
		if (modalState === null && !selectedDimensions.length && !tujuanInput) return;
		modalState = null;
		if (selectedDimensions.length) selectedDimensions = [];
		if (tujuanInput) tujuanInput = '';
	}

	function closeDeleteModal() {
		if (!deleteDialogState) return;
		deleteDialogState = null;
	}
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<h2 class="text-xl font-bold">Daftar Kokurikuler</h2>
			{#if !data.kelasId}
				<p class="text-sm text-base-content/60">Pilih kelas aktif agar data kokurikuler tampil.</p>
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
			<span>Silakan pilih kelas di navbar sebelum menambah kokurikuler.</span>
		</div>
	{/if}

	{#if !data.tableReady}
		<div class="alert mt-4 border border-dashed border-error/60 bg-error/10 text-error-content">
			<Icon name="warning" />
			<span>
				Database kokurikuler belum siap. Jalankan <code>pnpm db:push</code> untuk menerapkan migrasi
				terbaru.
			</span>
		</div>
	{/if}

	<div class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none">
		<table class="border-base-200 table min-w-[720px] border dark:border-none">
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-left font-bold">
					<th style="width: 50px; min-width: 40px;">
						<input
							type="checkbox"
							class="checkbox"
							bind:this={selectAllCheckbox}
							disabled={!data.kokurikuler.length || !data.tableReady}
							checked={allSelected}
							onchange={(event) => handleSelectAll(event.currentTarget.checked)}
						/>
					</th>
					<th style="width: 60px;">No</th>
					<th style="min-width: 200px;">8 DPL</th>
					<th class="w-full" style="min-width: 260px;">Kegiatan Kokurikuler</th>
					<th style="width: 140px; min-width: 120px;">Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#each data.kokurikuler as item, index (item.id)}
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
						<td>
							{#if item.dimensi.length}
								{item.dimensi
									.map((key) => labelByKey[key as ProfilPelajarPancasilaDimensionKey] ?? key)
									.join(', ')}
							{:else}
								<span class="italic opacity-60">Belum ada dimensi</span>
							{/if}
						</td>
						<td>{item.tujuan}</td>
						<td class="flex items-center justify-end gap-2">
							<button
								class="btn btn-sm btn-soft shadow-none"
								type="button"
								title="Edit kokurikuler"
								disabled={!canManage}
								onclick={() => openEditModal(item)}
							>
								<Icon name="edit" />
							</button>
							<button
								class="btn btn-sm btn-soft btn-error shadow-none"
								type="button"
								title="Hapus kokurikuler"
								aria-label="Hapus kokurikuler"
								name="fungsi tombol"
								disabled={!canManage}
								onclick={() => openSingleDeleteModal(item)}
							>
								<Icon name="del" />
							</button>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="py-6 text-center italic opacity-60" colspan="5">
							Belum ada data kokurikuler
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
		<dialog class="modal-box relative z-10 max-w-2xl" open aria-modal="true">
			<h3 class="mb-2 text-lg font-bold">{modalTitle}</h3>
			<p class="font-semibold">Pilih Dimensi Profil Pelajar Pancasila</p>

			<FormEnhance
				action={modalAction}
				onsuccess={({ form }) => {
					form.reset();
					closeModal();
					invalidate('app:kokurikuler');
				}}
			>
				{#snippet children({ submitting })}
					<input name="kelasId" value={data.kelasId ?? ''} hidden />
					{#if isEditMode && modalItem}
						<input name="id" value={modalItem.id} hidden />
					{/if}

					<div class="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
						{#each data.dimensiPilihan as dimensi (dimensi.key)}
							<label class="flex cursor-pointer flex-row gap-2 rounded-md border border-base-200 bg-base-200/60 dark:border-none dark:bg-base-300/40">
								<input
									type="checkbox"
									class="checkbox"
									value={dimensi.key}
									name="dimensi"
									bind:group={selectedDimensions}
									aria-label={dimensi.label}
								/>
								<div class="flex flex-col">
									<span class="font-semibold">{dimensi.label}</span>
								</div>
							</label>
						{/each}
					</div>

					<p class="mt-4 font-semibold">Kegiatan Kokurikuler</p>
					<textarea
						class="textarea dark:bg-base-200 mt-2 h-28 w-full dark:border-none"
						placeholder="Ketik Kegiatan Kokurikuler"
						name="kokurikuler"
						bind:value={tujuanInput}
						required
						disabled={!canManage}
					></textarea>

					<div class="modal-action mt-6 flex gap-2">
						<button class="btn shadow-none" type="button" onclick={closeModal}>
							<Icon name="close" />
							Batal
						</button>
						<button
							class="btn shadow-none"
							disabled={
								submitting ||
								!selectedDimensions.length ||
								!data.kelasId ||
								!data.tableReady ||
								!tujuanInput.trim()
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
					Yakin ingin menghapus kokurikuler
					<span class="font-semibold">{deleteModalItem.tujuan}</span>?
				</p>
			{:else if deleteDialogState}
				<p class="mt-2 text-sm">
					Yakin ingin menghapus {deleteModalIds.length} kokurikuler terpilih?
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
					invalidate('app:kokurikuler');
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
							name="fungsi tombol"
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
