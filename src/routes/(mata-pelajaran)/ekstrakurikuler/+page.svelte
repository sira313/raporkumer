<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { tick } from 'svelte';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import EkstrakurikulerDeleteModal from '$lib/components/ekstrakurikuler/delete-modal.svelte';

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
	let deleteDialogState = $state<
		| { source: 'bulk'; ids: number[] }
		| { source: 'single'; ids: number[]; item: Ekstrakurikuler }
		| null
	>(null);
	let addRowVisible = $state(false);
	let addNamaInput = $state('');
	let addInputRef = $state<HTMLInputElement | null>(null);
	let addSubmitting = $state(false);
	let editingRowId = $state<number | null>(null);
	let editingNamaInput = $state('');
	let editingInputRef = $state<HTMLInputElement | null>(null);
	let editingSubmitting = $state(false);

	const totalData = $derived.by(() => data.ekstrakurikuler.length);
	const anySelected = $derived.by(() => selectedIds.length > 0);
	const allSelected = $derived.by(() => totalData > 0 && selectedIds.length === totalData);
	const canManage = $derived.by(() => data.tableReady && !!data.kelasId);
	const addSaveDisabled = $derived.by(
		() => addSubmitting || !addNamaInput.trim() || !data.kelasId || !data.tableReady
	);
	const editingSaveDisabled = $derived.by(
		() =>
			editingRowId === null ||
			editingSubmitting ||
			!editingNamaInput.trim() ||
			!data.kelasId ||
			!data.tableReady
	);
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
	const deleteModalMode = $derived.by(() =>
		deleteDialogState?.source === 'single' ? 'single' : 'bulk'
	);

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
			if (deleteDialogState) deleteDialogState = null;
			if (addNamaInput) addNamaInput = '';
			if (addRowVisible) addRowVisible = false;
			addSubmitting = false;
			editingRowId = null;
			editingNamaInput = '';
			editingSubmitting = false;
		}
	});

	$effect(() => {
		if (!canManage && addRowVisible) {
			addRowVisible = false;
			addNamaInput = '';
			addSubmitting = false;
		}
	});

	$effect(() => {
		if (!canManage && editingRowId !== null) {
			editingRowId = null;
			editingNamaInput = '';
			editingSubmitting = false;
		}
	});

	$effect(() => {
		if (addRowVisible) {
			void tick().then(() => addInputRef?.focus());
		}
	});

	$effect(() => {
		if (editingRowId !== null) {
			void tick().then(() => editingInputRef?.focus());
		}
	});

	$effect(() => {
		if (editingRowId === null) return;
		const exists = data.ekstrakurikuler.some((item) => item.id === editingRowId);
		if (!exists) {
			editingRowId = null;
			editingNamaInput = '';
			editingSubmitting = false;
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

	function startEditRow(item: Ekstrakurikuler) {
		if (!canManage) return;
		addRowVisible = false;
		addNamaInput = '';
		addSubmitting = false;
		editingRowId = item.id;
		editingNamaInput = item.nama;
		editingSubmitting = false;
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

	function closeDeleteModal() {
		if (!deleteDialogState) return;
		deleteDialogState = null;
	}

	function toggleAddRow() {
		if (!canManage) return;
		if (addRowVisible) {
			addRowVisible = false;
			addNamaInput = '';
			addSubmitting = false;
			return;
		}
		cancelEditRow();
		addNamaInput = '';
		addRowVisible = true;
	}

	function cancelAddRow() {
		addRowVisible = false;
		addNamaInput = '';
		addSubmitting = false;
	}

	function cancelEditRow() {
		if (editingRowId === null && !editingNamaInput) return;
		editingRowId = null;
		editingNamaInput = '';
		editingSubmitting = false;
	}
</script>

<EkstrakurikulerDeleteModal
	open={isDeleteModalOpen}
	title={deleteModalTitle}
	action="?/delete"
	ids={deleteModalIds}
	mode={deleteModalMode}
	item={deleteModalItem}
	{canManage}
	disabled={deleteModalDisabled}
	onClose={closeDeleteModal}
	onSuccess={() => {
		const ids = deleteDialogState?.ids ?? [];
		if (ids.length) {
			selectedIds = selectedIds.filter((selectedId) => !ids.includes(selectedId));
		}
		closeDeleteModal();
		invalidate('app:ekstrakurikuler');
	}}
/>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<h2 class="text-xl font-bold">Daftar Ekstrakurikuler</h2>
			{#if !data.kelasId}
				<p class="text-base-content/60 text-sm">
					Pilih kelas aktif agar data ekstrakurikuler tampil.
				</p>
			{/if}
		</div>
		<div class="flex flex-col gap-2 sm:flex-row">
			<button class="btn shadow-none" disabled={!canManage} onclick={toggleAddRow}>
				<Icon name="plus" />
				Tambah
			</button>
			<button
				type="button"
				class={`btn w-full shadow-none sm:w-fit ${bulkDeleteDisabled ? '' : 'btn-soft btn-error'}`}
				disabled={bulkDeleteDisabled}
				onclick={openBulkDeleteModal}
			>
				<Icon name="del" />
				Hapus
			</button>
		</div>
	</div>

	{#if !data.kelasId}
		<div
			class="alert border-warning/60 bg-warning/10 text-warning-content mt-6 border border-dashed"
		>
			<Icon name="info" />
			<span>Silakan pilih kelas di navbar sebelum menambah ekstrakurikuler.</span>
		</div>
	{/if}

	{#if !data.tableReady}
		<div class="alert border-error/60 bg-error/10 text-error-content mt-4 border border-dashed">
			<Icon name="warning" />
			<span>
				Database ekstrakurikuler belum siap. Jalankan <code>pnpm db:push</code> untuk menerapkan migrasi
				terbaru.
			</span>
		</div>
	{/if}

	<div
		class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
	>
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
				{#if addRowVisible}
					<tr class="bg-base-200/40">
						<td></td>
						<td>
							<span>1</span>
						</td>
						<td class="p-3" colspan="2">
							<FormEnhance
								id="add-ekstrakurikuler-form"
								action="?/add"
								submitStateChange={(value) => (addSubmitting = value)}
								onsuccess={({ form }) => {
									form.reset();
									addNamaInput = '';
									addRowVisible = false;
									invalidate('app:ekstrakurikuler');
								}}
							>
								{#snippet children({ submitting, invalid })}
									<input name="kelasId" value={data.kelasId ?? ''} hidden />
									<label class="flex flex-col gap-2" aria-busy={submitting}>
										<input
											bind:this={addInputRef}
											class="input input-sm bg-base-200 dark:bg-base-100 w-full dark:border-none"
											placeholder="Masukkan nama ekstrakurikuler"
											name="nama"
											value={addNamaInput}
											oninput={(event) =>
												(addNamaInput = (event.currentTarget as HTMLInputElement).value)}
											autocomplete="off"
											required
											aria-invalid={invalid}
										/>
									</label>
								{/snippet}
							</FormEnhance>
						</td>
						<td class="flex items-center justify-end gap-2">
							<button
								type="button"
								class="btn btn-soft btn-sm shadow-none"
								onclick={cancelAddRow}
								disabled={addSubmitting}
								title="Batal"
							>
								<Icon name="close" />
							</button>
							<button
								class="btn btn-sm btn-primary shadow-none"
								form="add-ekstrakurikuler-form"
								type="submit"
								disabled={addSaveDisabled}
								title="Simpan"
							>
								{#if addSubmitting}
									<span class="loading loading-spinner loading-xs" aria-hidden="true"></span>
								{/if}
								<Icon name="save" />
							</button>
						</td>
					</tr>
				{/if}
				{#each data.ekstrakurikuler as item, index (item.id)}
					{@const baseNumber = addRowVisible ? index + 2 : index + 1}
					{@const formId = `edit-ekstrakurikuler-form-${item.id}`}
					<tr class={editingRowId === item.id ? 'bg-base-200/30' : undefined}>
						<td>
							<input
								type="checkbox"
								class="checkbox"
								checked={selectedIds.includes(item.id)}
								disabled={!data.tableReady || editingRowId === item.id}
								onchange={(event) => toggleRowSelection(item.id, event.currentTarget.checked)}
							/>
						</td>
						<td>
							{#if editingRowId === item.id}
								<span class="badge badge-primary badge-soft">1</span>
							{:else}
								{baseNumber}
							{/if}
						</td>
						<td>
							{#if editingRowId === item.id}
								<FormEnhance
									id={formId}
									action="?/update"
									submitStateChange={(value) => (editingSubmitting = value)}
									onsuccess={({ form }) => {
										form.reset();
										editingNamaInput = '';
										cancelEditRow();
										invalidate('app:ekstrakurikuler');
									}}
								>
									{#snippet children({ submitting, invalid })}
										<input name="kelasId" value={data.kelasId ?? ''} hidden />
										<input name="id" value={item.id} hidden />
										<label class="flex flex-col gap-2" aria-busy={submitting}>
											<input
												bind:this={editingInputRef}
												class="input input-sm bg-base-200 dark:bg-base-100 w-full dark:border-none"
												placeholder="Masukkan nama ekstrakurikuler"
												name="nama"
												value={editingNamaInput}
												oninput={(event) =>
													(editingNamaInput = (event.currentTarget as HTMLInputElement).value)}
												autocomplete="off"
												required
												aria-invalid={invalid}
											/>
										</label>
									{/snippet}
								</FormEnhance>
							{:else}
								{item.nama}
							{/if}
						</td>
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
							{#if editingRowId === item.id}
								<button
									class="btn btn-soft btn-sm shadow-none"
									type="button"
									title="Batalkan edit"
									onclick={cancelEditRow}
									disabled={editingSubmitting}
								>
									<Icon name="close" />
								</button>
								<button
									class="btn btn-sm btn-primary shadow-none"
									form={formId}
									type="submit"
									disabled={editingSaveDisabled}
									title="Simpan"
								>
									{#if editingSubmitting}
										<span class="loading loading-spinner loading-xs" aria-hidden="true"></span>
									{/if}
									<Icon name="save" />
								</button>
							{:else}
								<button
									class="btn btn-sm btn-soft shadow-none"
									type="button"
									title="Edit ekstrakurikuler"
									aria-label="Edit ekstrakurikuler"
									disabled={!canManage}
									onclick={() => startEditRow(item)}
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
							{/if}
						</td>
					</tr>
				{:else}
					{#if !addRowVisible}
						<tr>
							<td class="py-6 text-center italic opacity-60" colspan="5">
								Belum ada data ekstrakurikuler
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
	</div>
</div>
