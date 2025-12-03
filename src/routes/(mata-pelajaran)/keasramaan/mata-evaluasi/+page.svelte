<script lang="ts">
	import { invalidate } from '$app/navigation';
	import Icon from '$lib/components/icon.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import MataEvaluasiCreateRow from '$lib/components/keasramaan/MataEvaluasiCreateRow.svelte';
	import DeleteConfirmModal from '$lib/components/keasramaan/DeleteConfirmModal.svelte';

	let { data }: { data: Record<string, unknown> } = $props();

	interface MataEvaluasi {
		id: number;
		nama: string;
		indikator: Array<{
			id: number;
			deskripsi: string;
		}>;
	}

	const mataEvaluasi = $derived((data.mataPelajaran as MataEvaluasi[]) ?? []);
	const tableReady = $derived((data.tableReady as boolean) ?? true);
	const kelasAktif = $derived(
		data.kelasAktif as { id: number; nama: string; fase?: string } | null
	);

	let editingGroupId = $state<number | null>(null);
	let editingGroupData = $state<{
		nama: string;
		indikator: Array<{ id?: number; deskripsi: string }>;
	} | null>(null);
	let isCreating = $state(false);
	let newGroupData = $state<{
		nama: string;
		indikator: Array<{ deskripsi: string }>;
	} | null>(null);
	let deleteConfirmId = $state<number | null>(null);
	let selectedGroups = $state<Set<number>>(new Set());
	let isSubmitting = $state(false);

	const isEditMode = $derived(editingGroupId !== null);
	const isCreateMode = $derived(isCreating);
	const hasSelection = $derived(selectedGroups.size > 0 && !isEditMode && !isCreateMode);
	const isInteractionLocked = $derived(isEditMode || isCreateMode);

	function openCreate() {
		if (isEditMode || isCreateMode) return;
		clearSelection();
		isCreating = true;
		newGroupData = {
			nama: '',
			indikator: [{ deskripsi: '' }]
		};
	}

	function closeCreate() {
		isCreating = false;
		newGroupData = null;
	}

	function removeIndicatorFieldInCreate(index: number) {
		if (!newGroupData) return;
		updateIndicatorFieldInCreate(index, '');
		ensureTrailingIndicatorInCreate();
	}

	function updateIndicatorFieldInCreate(index: number, value: string) {
		if (!newGroupData) return;
		newGroupData.indikator[index].deskripsi = value;
		ensureTrailingIndicatorInCreate();
	}

	function ensureTrailingIndicatorInCreate() {
		if (!newGroupData) return;
		const entries = newGroupData.indikator;

		while (entries.length > 1) {
			const last = entries[entries.length - 1];
			const prev = entries[entries.length - 2];
			if (last.deskripsi.trim() === '' && prev.deskripsi.trim() === '') {
				entries.pop();
			} else {
				break;
			}
		}

		const last = entries[entries.length - 1];
		if (!last || last.deskripsi.trim() !== '') {
			newGroupData.indikator = [...entries, { deskripsi: '' }];
		} else {
			newGroupData.indikator = [...entries];
		}
	}

	function openEdit(group: MataEvaluasi) {
		editingGroupId = group.id;
		editingGroupData = {
			nama: group.nama,
			indikator: [...group.indikator]
		};
	}

	function closeEdit() {
		editingGroupId = null;
		editingGroupData = null;
	}

	function toggleSelection(id: number) {
		if (isEditMode) return;
		const newSet = new Set(selectedGroups);
		if (newSet.has(id)) {
			newSet.delete(id);
		} else {
			newSet.add(id);
		}
		selectedGroups = newSet;
	}

	function toggleSelectAll(checked: boolean) {
		if (isEditMode) return;
		if (checked) {
			selectedGroups = new Set(mataEvaluasi.map((m) => m.id));
		} else {
			selectedGroups = new Set();
		}
	}

	function clearSelection() {
		selectedGroups = new Set();
	}

	function removeIndicatorField(index: number) {
		if (!editingGroupData) return;
		updateIndicatorField(index, '');
		ensureTrailingIndicatorInEdit();
	}

	function updateIndicatorField(index: number, value: string) {
		if (!editingGroupData) return;
		editingGroupData.indikator[index].deskripsi = value;
		ensureTrailingIndicatorInEdit();
	}

	function ensureTrailingIndicatorInEdit() {
		if (!editingGroupData) return;
		const entries = editingGroupData.indikator;

		while (entries.length > 1) {
			const last = entries[entries.length - 1];
			const prev = entries[entries.length - 2];
			if (last.deskripsi.trim() === '' && prev.deskripsi.trim() === '') {
				entries.pop();
			} else {
				break;
			}
		}

		const last = entries[entries.length - 1];
		if (!last || last.deskripsi.trim() !== '') {
			editingGroupData.indikator = [...entries, { deskripsi: '' }];
		} else {
			editingGroupData.indikator = [...entries];
		}
	}

	async function deleteGroup(id: number) {
		const form = new FormData();
		form.append('id', String(id));

		try {
			const response = await fetch('?/delete', {
				method: 'POST',
				body: form
			});

			const result = await response.json();

			if (!response.ok) {
				toast(result.fail || 'Gagal menghapus mata evaluasi', 'error');
			} else {
				toast(result.message || 'Berhasil menghapus mata evaluasi', 'success');
				deleteConfirmId = null;
				clearSelection();
				await invalidate('app:keasramaan');
			}
		} catch (error) {
			toast('Terjadi kesalahan saat menghapus', 'error');
			console.error(error);
		}
	}

	async function submitCreate() {
		if (!newGroupData || !newGroupData.nama.trim()) {
			toast('Nama mata evaluasi wajib diisi', 'warning');
			return;
		}

		if (!kelasAktif?.id) {
			toast('Kelas belum dipilih', 'warning');
			return;
		}

		const indicators = newGroupData.indikator.filter((ind) => ind.deskripsi.trim().length > 0);

		const formData = new FormData();
		formData.append('kelasId', String(kelasAktif.id));
		formData.append('nama', newGroupData.nama.trim());
		indicators.forEach((ind, idx) => {
			formData.append(`indikator.${idx}.deskripsi`, ind.deskripsi.trim());
		});

		try {
			isSubmitting = true;
			const response = await fetch('?/create', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (!response.ok) {
				toast(result.fail || 'Gagal menambahkan mata evaluasi', 'error');
			} else {
				toast(result.message || 'Berhasil menambahkan mata evaluasi', 'success');
				closeCreate();
				await invalidate('app:keasramaan');
			}
		} catch (error) {
			toast('Terjadi kesalahan saat menambahkan', 'error');
			console.error(error);
		} finally {
			isSubmitting = false;
		}
	}

	const kelasLabel = $derived(
		kelasAktif
			? kelasAktif.fase
				? `${kelasAktif.nama} - ${kelasAktif.fase}`
				: kelasAktif.nama
			: '-'
	);
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<!-- Header -->
	<div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
		<div>
			<h2 class="text-xl font-bold">Daftar Mata Evaluasi Keasramaan</h2>
			<p class="text-base-content/70 text-sm">Kelas aktif: {kelasLabel}</p>
		</div>
	</div>

	<!-- Action Buttons Row -->
	<div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
		<button
			type="button"
			class="btn btn-soft shadow-none"
			onclick={() => history.back()}
			title="Kembali ke halaman sebelumnya"
		>
			<Icon name="left" />
			Kembali
		</button>

		<button
			type="button"
			class="btn btn-soft shadow-none sm:ml-auto sm:max-w-40"
			onclick={openCreate}
			disabled={isInteractionLocked || !tableReady}
			class:btn-error={hasSelection}
			class:btn-secondary={isInteractionLocked}
		>
			<Icon name={hasSelection ? 'del' : isInteractionLocked ? 'close' : 'plus'} />
			{hasSelection ? 'Hapus Dipilih' : isInteractionLocked ? 'Batalkan' : 'Tambah Matev'}
		</button>

		{#if isCreateMode}
			<button
				type="button"
				class="btn btn-primary shadow-none sm:max-w-40"
				onclick={submitCreate}
				disabled={isSubmitting || !newGroupData || !newGroupData.nama.trim()}
				aria-busy={isSubmitting}
			>
				<Icon name="save" />
				Simpan
			</button>
		{/if}
	</div>

	{#if !tableReady}
		<div class="alert border-error/60 bg-error/10 text-error-content mt-4 border border-dashed">
			<Icon name="warning" />
			<span>
				Database keasramaan belum siap. Jalankan <code>pnpm db:push</code> untuk menerapkan migrasi terbaru.
			</span>
		</div>
	{/if}

	<!-- Table -->
	<div class="bg-base-100 dark:bg-base-200 mt-6 overflow-x-auto rounded-md shadow-md">
		<table class="border-base-200 table border dark:border-none">
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th style="width: 50px; min-width: 40px;">
						<input
							type="checkbox"
							class="checkbox"
							aria-label="Pilih semua mata evaluasi"
							checked={mataEvaluasi.length > 0 && selectedGroups.size === mataEvaluasi.length}
							indeterminate={selectedGroups.size > 0 && selectedGroups.size < mataEvaluasi.length}
							onchange={(event) =>
								toggleSelectAll((event.currentTarget as HTMLInputElement).checked)}
							disabled={isEditMode || !tableReady || mataEvaluasi.length === 0}
						/>
					</th>
					<th style="width: 50px; min-width: 40px;">No</th>
					<th style="width: 30%;">Mata Evaluasi</th>
					<th style="width: 60%">Indikator</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#if isCreateMode && newGroupData}
					<MataEvaluasiCreateRow
						{newGroupData}
						{isSubmitting}
						onUpdateNama={(value) => {
							if (newGroupData) {
								newGroupData.nama = value;
							}
						}}
						onUpdateIndicator={updateIndicatorFieldInCreate}
						onRemoveIndicator={removeIndicatorFieldInCreate}
						onSave={submitCreate}
						onCancel={closeCreate}
					/>
				{/if}

				{#if mataEvaluasi.length > 0}
					{#each mataEvaluasi as group, idx (group.id)}
						{#if isEditMode && editingGroupId === group.id && editingGroupData}
							<!-- Edit Mode Row -->
							<tr>
								<td class="align-top"><input type="checkbox" class="checkbox" disabled /></td>
								<td class="text-primary animate-pulse align-top font-semibold">{idx + 1}</td>
								<td class="align-top">
									<textarea
										class="textarea textarea-bordered validator bg-base-200 dark:bg-base-300 border-base-300 h-24 w-full"
										value={editingGroupData.nama}
										oninput={(e) => {
											if (editingGroupData) {
												editingGroupData.nama = e.currentTarget.value;
											}
										}}
										placeholder="Tuliskan mata evaluasi"
										disabled={isSubmitting}
										required
									></textarea>
								</td>
								<td class="align-top">
									<div class="flex flex-col gap-2">
										{#each editingGroupData.indikator as indicator, indicatorIdx (indicatorIdx)}
											<div class="flex flex-col gap-2 sm:flex-row">
												<textarea
													class="textarea textarea-bordered validator bg-base-200 dark:bg-base-300 border-base-300 w-full dark:border-none"
													value={indicator.deskripsi}
													oninput={(e) => updateIndicatorField(indicatorIdx, e.currentTarget.value)}
													placeholder="Tuliskan indikator"
													disabled={isSubmitting}
													required={indicatorIdx === 0}
												></textarea>
												{#if editingGroupData.indikator.length > 1 && indicator.deskripsi.trim().length > 0}
													<button
														type="button"
														class="btn btn-sm btn-soft btn-error shadow-none"
														onclick={() => removeIndicatorField(indicatorIdx)}
														disabled={isSubmitting}
														title="Hapus indikator"
													>
														<Icon name="del" />
													</button>
												{/if}
											</div>
										{/each}
									</div>
								</td>
								<td class="align-top">
									<div class="flex gap-1">
										<button
											type="button"
											class="btn btn-sm btn-soft shadow-none"
											onclick={closeEdit}
											disabled={isSubmitting}
											title="Batalkan"
										>
											<Icon name="close" />
										</button>
										<button
											type="button"
											class="btn btn-sm btn-primary shadow-none"
											onclick={async () => {
												const data = editingGroupData!;
												const formData = new FormData();
												formData.append('mataEvaluasiId', String(editingGroupId));
												formData.append('mataEvaluasiNama', data.nama);
												data.indikator.forEach((ind, idx) => {
													if (ind.deskripsi.trim().length > 0) {
														formData.append(`indikator.${idx}.id`, String(ind.id ?? ''));
														formData.append(`indikator.${idx}.deskripsi`, ind.deskripsi);
													}
												});

												try {
													isSubmitting = true;
													const response = await fetch('?/save', {
														method: 'POST',
														body: formData
													});

													const result = await response.json();
													if (!response.ok) {
														toast(result.fail || 'Gagal menyimpan', 'error');
													} else {
														toast(result.message || 'Berhasil disimpan', 'success');
														closeEdit();
														await invalidate('app:keasramaan');
													}
												} catch (error) {
													toast('Terjadi kesalahan', 'error');
													console.error(error);
												} finally {
													isSubmitting = false;
												}
											}}
											disabled={isSubmitting}
											aria-busy={isSubmitting}
											title="Simpan"
										>
											<Icon name="save" />
										</button>
									</div>
								</td>
							</tr>
						{:else}
							<!-- Display Mode Row -->
							<tr class="hover:bg-base-200/50 dark:hover:bg-base-700/50">
								<td class="align-top">
									<input
										type="checkbox"
										class="checkbox"
										aria-label={`Pilih ${group.nama}`}
										checked={selectedGroups.has(group.id)}
										onchange={() => toggleSelection(group.id)}
										disabled={isEditMode || !tableReady}
									/>
								</td>
								<td class="align-top">{idx + 1}</td>
								<td class="align-top font-semibold">{group.nama}</td>
								<td class="align-top">
									<div class="space-y-1">
										{#each group.indikator as indicator, indIdx (indicator.id)}
											<div class="flex gap-2 text-sm">
												<span class="shrink-0">{indIdx + 1}.</span>
												<span>{indicator.deskripsi}</span>
											</div>
										{/each}
										{#if group.indikator.length === 0}
											<p class="text-base-content/50 text-sm italic">-</p>
										{/if}
									</div>
								</td>
								<td class="align-top">
									<div class="flex gap-1">
										<button
											type="button"
											class="btn btn-sm btn-soft shadow-none"
											onclick={() => openEdit(group)}
											disabled={isEditMode || !tableReady}
											title="Edit mata evaluasi"
										>
											<Icon name="edit" />
										</button>
										<button
											type="button"
											class="btn btn-sm btn-error btn-soft shadow-none"
											onclick={() => (deleteConfirmId = group.id)}
											disabled={isEditMode || !tableReady}
											title="Hapus mata evaluasi"
										>
											<Icon name="del" />
										</button>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				{:else if tableReady}
					<tr>
						<td class="py-8 text-center italic opacity-50" colspan="5">Belum ada mata evaluasi</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>

	<!-- Delete Confirmation Modal -->
	<DeleteConfirmModal
		{deleteConfirmId}
		{mataEvaluasi}
		onConfirm={deleteGroup}
		onCancel={() => {
			deleteConfirmId = null;
		}}
	/>
</div>
