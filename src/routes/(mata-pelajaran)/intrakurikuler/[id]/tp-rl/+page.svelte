<script lang="ts">
import { goto, invalidate } from '$app/navigation';
import FormEnhance from '$lib/components/form-enhance.svelte';
import Icon from '$lib/components/icon.svelte';
import { toast } from '$lib/components/toast.svelte';

type TujuanPembelajaranGroup = {
	lingkupMateri: string;
	items: Array<Omit<TujuanPembelajaran, 'mataPelajaran'>>;
};

type GroupEntry = { id?: number; deskripsi: string; deleted?: boolean };

type GroupFormState = {
	mode: 'create' | 'edit';
	lingkupMateri: string;
	entries: GroupEntry[];
	targetIds: number[];
};

type SelectedGroupState = {
	lingkupMateri: string;
	ids: number[];
};

let { data } = $props();
const agamaOptions = $derived(data.agamaOptions ?? []);
const showAgamaSelect = $derived(agamaOptions.length > 0);
let selectedAgamaId = $state(data.agamaSelection ?? '');
const agamaSelectId = 'agama-select';

let groupedTujuanPembelajaran = $state<TujuanPembelajaranGroup[]>([]);
let groupForm = $state<GroupFormState | null>(null);
let deleteGroup = $state<{ lingkupMateri: string; ids: number[] } | null>(null);
let deleteEntryDialog = $state<{ index: number } | null>(null);
let selectedGroups = $state<Record<string, SelectedGroupState>>({});
let bulkDeleteDialog = $state<{ groups: SelectedGroupState[] } | null>(null);
let selectAllCheckbox = $state<HTMLInputElement | null>(null);

const selectedGroupList = $derived(Object.values(selectedGroups));
const selectableGroups = $derived(
	groupedTujuanPembelajaran.filter((group) => !(groupForm && isEditingGroup(group)))
);
const hasSelection = $derived(selectedGroupList.length > 0);
const allSelected = $derived(
	selectableGroups.length > 0 && selectedGroupList.length === selectableGroups.length
);

$effect(() => {
	selectedAgamaId = data.agamaSelection ?? '';
	const groups = new Map<string, TujuanPembelajaranGroup>();
	for (const item of data.tujuanPembelajaran ?? []) {
		const key = (item.lingkupMateri ?? '').trim().toLowerCase();
		const existing = groups.get(key);
		if (existing) {
			existing.items = [...existing.items, item];
		} else {
			groups.set(key, {
				lingkupMateri: item.lingkupMateri,
				items: [item]
			});
		}
	}
	const nextGroups = Array.from(groups.values());
	groupedTujuanPembelajaran = nextGroups;

	const allowedKeys = new Set(nextGroups.map((group) => groupKey(group)));
	const filteredEntries = Object.entries(selectedGroups).filter(([key]) => allowedKeys.has(key));
	if (filteredEntries.length !== Object.keys(selectedGroups).length) {
		selectedGroups = Object.fromEntries(filteredEntries);
	}

	if (filteredEntries.length === 0) {
		bulkDeleteDialog = null;
	}
});

$effect(() => {
	if (selectAllCheckbox) {
		selectAllCheckbox.indeterminate = hasSelection && !allSelected;
	}
});

async function handleAgamaChange(event: Event) {
	const target = event.target as HTMLSelectElement;
	const value = target.value;
	if (!value) return;
	const mapelId = Number(value);
	if (!Number.isFinite(mapelId) || mapelId === data.mapel.id) return;
	await goto(`/intrakurikuler/${mapelId}/tp-rl`, { replaceState: true });
}

function ensureTrailingEntry(entries: GroupEntry[]): GroupEntry[] {
	const normalized = entries.map((entry) => ({
		id: entry.id,
		deskripsi: entry.deskripsi ?? '',
		deleted: entry.deleted ?? false
	}));

	const active = normalized.filter((entry) => !entry.deleted);

	while (active.length > 1) {
		const last = active[active.length - 1];
		const prev = active[active.length - 2];
		if (
			last.deskripsi.trim() === '' &&
			last.id === undefined &&
			prev.deskripsi.trim() === '' &&
			prev.id === undefined
		) {
			active.pop();
		} else {
			break;
		}
	}

	const last = active[active.length - 1];
	if (!last || last.deskripsi.trim() !== '' || last.id !== undefined) {
		active.push({ id: undefined, deskripsi: '', deleted: false });
	}

	const deletedEntries = normalized.filter((entry) => entry.deleted && entry.id !== undefined);

	return [
		...active,
		...deletedEntries.map((entry) => ({ ...entry, deskripsi: '', deleted: true }))
	];
}

function groupSelectionPayload(group: TujuanPembelajaranGroup): SelectedGroupState {
	return {
		lingkupMateri: group.lingkupMateri,
		ids: group.items.map((item) => item.id)
	};
}

function removeSelectionByKey(key: string) {
	if (!(key in selectedGroups)) return;
	const { [key]: _removed, ...rest } = selectedGroups;
	selectedGroups = rest;
}

function isGroupSelected(group: TujuanPembelajaranGroup) {
	return Boolean(selectedGroups[groupKey(group)]);
}

function toggleGroupSelection(group: TujuanPembelajaranGroup, checked: boolean) {
	const key = groupKey(group);
	if (checked) {
		selectedGroups = {
			...selectedGroups,
			[key]: groupSelectionPayload(group)
		};
		return;
	}
	removeSelectionByKey(key);
}

function clearSelection() {
	if (Object.keys(selectedGroups).length === 0) return;
	selectedGroups = {};
}

function handleSelectAllChange(checked: boolean) {
	if (checked) {
		if (selectableGroups.length === 0) return;
		selectedGroups = Object.fromEntries(
			selectableGroups.map((group) => [groupKey(group), groupSelectionPayload(group)] as const)
		);
		return;
	}
	if (Object.keys(selectedGroups).length > 0) {
		selectedGroups = {};
	}
}

function openBulkDeleteDialog() {
	if (selectedGroupList.length === 0) return;
	bulkDeleteDialog = {
		groups: selectedGroupList.map((group) => ({
			lingkupMateri: group.lingkupMateri,
			ids: [...group.ids]
		}))
	};
}

function closeBulkDeleteDialog() {
	bulkDeleteDialog = null;
}

function openCreateForm() {
	groupForm = {
		mode: 'create',
		lingkupMateri: '',
		entries: ensureTrailingEntry([{ deskripsi: '' }]),
		targetIds: []
	};
}

function openEditForm(group: TujuanPembelajaranGroup) {
	removeSelectionByKey(groupKey(group));
	if (bulkDeleteDialog) {
		closeBulkDeleteDialog();
	}
	const entries = group.items.map((item) => ({ id: item.id, deskripsi: item.deskripsi }));
	groupForm = {
		mode: 'edit',
		lingkupMateri: group.lingkupMateri,
		entries: ensureTrailingEntry(entries),
		targetIds: group.items.map((item) => item.id)
	};
}

function closeForm() {
	groupForm = null;
	deleteEntryDialog = null;
}

function handleLingkupMateriInput(value: string) {
	if (!groupForm) return;
	groupForm = { ...groupForm, lingkupMateri: value };
}

function handleEntryInput(index: number, value: string) {
	if (!groupForm) return;
	const entries = groupForm.entries.map((entry, entryIndex) =>
		entryIndex === index ? { ...entry, deskripsi: value, deleted: false } : entry
	);
	groupForm = { ...groupForm, entries: ensureTrailingEntry(entries) };
}

function openEntryDeleteDialog(index: number) {
	deleteEntryDialog = { index };
}

function closeEntryDeleteDialog() {
	deleteEntryDialog = null;
}

function confirmEntryDelete() {
	if (deleteEntryDialog === null) return;
	const { index } = deleteEntryDialog;
	if (!groupForm) {
		deleteEntryDialog = null;
		return;
	}
	if (!groupForm.entries[index]) {
		deleteEntryDialog = null;
		return;
	}
	handleEntryDelete(index);
}

function handleEntryDelete(index: number) {
	if (!groupForm) return;
	const target = groupForm.entries[index];
	if (!target) return;

	let entries: GroupEntry[];
	if (target.id !== undefined) {
		entries = groupForm.entries.map((entry, entryIndex) =>
			entryIndex === index ? { ...entry, deskripsi: '', deleted: true } : entry
		);
	} else {
		entries = groupForm.entries.filter((_, entryIndex) => entryIndex !== index);
	}

	groupForm = { ...groupForm, entries: ensureTrailingEntry(entries) };
	deleteEntryDialog = null;
}

function isEditingGroup(group: TujuanPembelajaranGroup) {
	if (!groupForm || groupForm.mode !== 'edit') return false;
	const targetSet = new Set(groupForm.targetIds);
	return group.items.length === targetSet.size && group.items.every((item) => targetSet.has(item.id));
}

function groupKey(group: TujuanPembelajaranGroup) {
	return `${group.lingkupMateri ?? ''}::${group.items.map((item) => item.id).join('-')}`;
}

function openDeleteDialog(group: TujuanPembelajaranGroup) {
	removeSelectionByKey(groupKey(group));
	deleteGroup = { lingkupMateri: group.lingkupMateri, ids: group.items.map((item) => item.id) };
}

function closeDeleteDialog() {
	deleteGroup = null;
}

function handleSaveClick(event: MouseEvent, currentForm: GroupFormState) {
	const button = event.currentTarget as HTMLButtonElement | null;
	const formElement = button?.form ?? null;
	if (!formElement) return;

	const lingkupInput = formElement.elements.namedItem('lingkupMateri') as HTMLTextAreaElement | null;
	const lingkupValue = lingkupInput?.value.trim() ?? '';

	if (!lingkupValue) {
		event.preventDefault();
		event.stopPropagation();
		toast(
			'lingkup materi tidak boleh kosong, jika anda ingin menghapusnya, anda bisa melakukannya dengan tombol hapus',
			'warning'
		);
		lingkupInput?.focus();
		return;
	}

	if (!formElement.checkValidity()) {
		event.preventDefault();
		event.stopPropagation();
		formElement.reportValidity();
	}
}
</script>

<!-- Data Mapel Wajib -->
<div class="card bg-base-100 rounded-box w-full border border-none p-4 shadow-md">
	<!-- Judul IPAS bisa berubah dinamis sesuai mata pelajaran yang dipilih -->
	<h2 class="mb-6 text-xl font-bold">
		<span class="opacity-50">Mata Pelajaran:</span>
		{data.mapel.nama} – {data.mapel.kelas.nama}
	</h2>

	<!-- tombol tambah Tujuan Pembelajaran -->
	<div class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center">
		<button class="btn shadow-none" type="button" onclick={() => history.back()}>
			<Icon name="left" />
			Kembali
		</button>
		{#if showAgamaSelect}
			<div class="form-control sm:w-60">
				<select
					class="select bg-base-200 w-full shadow-none dark:border-none"
					id={agamaSelectId}
					aria-label="Pilih Agama"
					bind:value={selectedAgamaId}
					onchange={handleAgamaChange}
				>
					<option value="" disabled>Pilih Agama</option>
					{#each agamaOptions as option}
						<option value={option.id.toString()}>{option.label}</option>
					{/each}
				</select>
			</div>
		{/if}
		<button
			class="btn shadow-none sm:max-w-40 sm:ml-auto"
			type="button"
			onclick={hasSelection ? openBulkDeleteDialog : openCreateForm}
			disabled={!hasSelection && Boolean(groupForm)}
			class:btn-error={hasSelection}
			class:btn-soft={hasSelection}
		>
			<Icon name={hasSelection ? 'del' : 'plus'} />
			{hasSelection ? 'Hapus TP' : 'Tambah TP'}
		</button>
		<button class="btn shadow-none sm:max-w-40" type="button">
			<Icon name="percent" />
			Atur Bobot
		</button>
		<button class="btn shadow-none sm:max-w-40" type="button">
			<Icon name="import" />
			Import TP
		</button>
	</div>
	<div class="bg-base-100 dark:bg-base-200 overflow-x-auto rounded-md shadow-md dark:shadow-none">
		<table class="border-base-200 table border dark:border-none">
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th style="width: 50px; min-width: 40px;">
						<input
							type="checkbox"
							class="checkbox"
							aria-label="Pilih semua lingkup materi"
							bind:this={selectAllCheckbox}
							checked={allSelected}
							onchange={(event) =>
								handleSelectAllChange((event.currentTarget as HTMLInputElement).checked)
							}
							disabled={selectableGroups.length === 0}
						/>
					</th>
					<th style="width: 50px; min-width: 40px;">No</th>
					<th style="width: 30%;">Lingkup Materi</th>
					<th style="width: 60%">Tujuan Pembelajaran</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#if groupForm && groupForm.mode === 'create'}
					{@render group_form_row(1)}
				{/if}

				{#if groupedTujuanPembelajaran.length > 0}
					{#each groupedTujuanPembelajaran as group, groupIndex (groupKey(group))}
						{@const rowNumber = groupIndex + 1 + (groupForm && groupForm.mode === 'create' ? 1 : 0)}
						{#if groupForm && isEditingGroup(group)}
							{@render group_form_row(rowNumber)}
						{:else}
							<tr>
								<td class="align-top">
									<input
										type="checkbox"
										class="checkbox"
										aria-label={`Pilih lingkup materi ${group.lingkupMateri}`}
										checked={isGroupSelected(group)}
										onchange={(event) =>
											toggleGroupSelection(group, (event.currentTarget as HTMLInputElement).checked)
										}
									/>
								</td>
								<td class="align-top">{rowNumber}</td>
								<td class="align-top">{group.lingkupMateri}</td>
								<td class="align-top">
									<div class="flex flex-col gap-2">
										{#each group.items as item, itemIndex (item.id)}
											<div class="flex items-start gap-2">
												<span class="text-base-content/70 w-5 shrink-0 text-sm font-semibold">
													{itemIndex + 1}.
												</span>
												<span class="leading-snug">{item.deskripsi}</span>
											</div>
										{/each}
									</div>
								</td>
								<td class="align-top">
									<div class="flex gap-2 flex-col">
										<button
											class="btn btn-sm btn-soft shadow-none"
											type="button"
											title="Edit lingkup dan tujuan pembelajaran"
											onclick={() => openEditForm(group)}
										>
											<Icon name="edit" />
										</button>
										<button
											class="btn btn-sm btn-soft btn-error shadow-none"
											type="button"
											title="Hapus lingkup dan tujuan pembelajaran"
											onclick={() => openDeleteDialog(group)}
										>
											<Icon name="del" />
										</button>
									</div>
								</td>
							</tr>
						{/if}
					{/each}
				{:else if !(groupForm && groupForm.mode === 'create')}
					<tr>
						<td class="text-center italic opacity-50" colspan="5">Belum ada data</td>
					</tr>
				{/if}
			</tbody>
		</table>
	</div>
</div>

{#snippet group_form_row(rowNumber: number)}
	{#if groupForm}
		{@const currentForm = groupForm}
		{@const formId = crypto.randomUUID()}
		<tr>
			<td class="align-top"><input type="checkbox" class="checkbox" disabled /></td>
			<td class="text-primary animate-pulse align-top font-semibold">{rowNumber}</td>
			<td class="align-top">
				<textarea
					form={formId}
					class="textarea validator bg-base-200 dark:bg-base-300 border-base-300 h-30 w-full"
					value={currentForm.lingkupMateri}
					name="lingkupMateri"
					aria-label="Lingkup materi"
					placeholder="Tuliskan lingkup materi"
					required
					oninput={(event) =>
						handleLingkupMateriInput((event.currentTarget as HTMLTextAreaElement).value)
					}
				></textarea>
			</td>
			<td class="align-top">
				<div class="flex flex-col gap-2">
					{#each currentForm.entries as entry, entryIndex (`${entry.id ?? 'new'}-${entryIndex}`)}
						{#if entry.deleted}
							<input
								type="hidden"
								form={formId}
								name={`entries.${entryIndex}.id`}
								value={entry.id ?? ''}
							/>
							<input
								type="hidden"
								form={formId}
								name={`entries.${entryIndex}.deskripsi`}
								value=""
							/>
						{:else}
							{@const trimmedDeskripsi = entry.deskripsi.trim()}
							<input
								type="hidden"
								form={formId}
								name={`entries.${entryIndex}.id`}
								value={entry.id ?? ''}
							/>
							<div class="flex flex-col gap-2 sm:flex-row">
								<textarea
									form={formId}
									class="textarea validator bg-base-200 border-base-300 dark:bg-base-300 w-full dark:border-none"
									value={entry.deskripsi}
									name={`entries.${entryIndex}.deskripsi`}
									aria-label={`Tujuan pembelajaran ${entryIndex + 1}`}
									placeholder="Tuliskan tujuan pembelajaran"
									required={currentForm.mode === 'create' && entryIndex === 0}
									oninput={(event) =>
										handleEntryInput(entryIndex, (event.currentTarget as HTMLTextAreaElement).value)
									}
								></textarea>
								{#if (currentForm.mode === 'edit' && !(entry.id === undefined && trimmedDeskripsi === '')) || (currentForm.mode === 'create' && trimmedDeskripsi.length > 0)}
									<button
										type="button"
										class="btn btn-sm btn-soft btn-error shadow-none"
										title="Hapus tujuan pembelajaran ini"
										onclick={() => openEntryDeleteDialog(entryIndex)}
									>
										<Icon name="del" />
									</button>
								{/if}
							</div>
						{/if}
					{/each}
				</div>
			</td>
			<td class="align-top">
				<FormEnhance
					id={formId}
					action="?/save"
					onsuccess={() => {
						closeForm();
						invalidate('app:mapel_tp-rl');
					}}
				>
					{#snippet children({ submitting })}
						{@const lingkupFilled = currentForm.lingkupMateri.trim().length > 0}
						{@const hasDeskripsi = currentForm.entries.some((entry) => !entry.deleted && entry.deskripsi.trim().length > 0)}
						{@const disableSubmit = submitting || (currentForm.mode === 'create' && (!lingkupFilled || !hasDeskripsi))}
						<input name="mode" value={currentForm.mode} hidden />
						<div class="flex flex-col gap-2">
							<button
								class="btn btn-sm btn-soft btn-primary shadow-none"
								title="Simpan"
								type="submit"
								disabled={disableSubmit}
								onclick={(event) => handleSaveClick(event, currentForm)}
							>
								{#if submitting}
									<div class="loading loading-spinner loading-xs"></div>
								{:else}
									<Icon name="save" />
								{/if}
							</button>
							<button
								class="btn btn-sm btn-soft shadow-none"
								type="button"
								title="Batal"
								onclick={closeForm}
							>
								<Icon name="close" />
							</button>
						</div>
					{/snippet}
				</FormEnhance>
			</td>
		</tr>
	{/if}
{/snippet}

{#if deleteEntryDialog && groupForm}
	{@const entryToDelete = groupForm.entries[deleteEntryDialog.index]}
	<dialog class="modal" open onclose={closeEntryDeleteDialog}>
		<div class="modal-box">
			<h3 class="mb-3 text-xl font-bold">Hapus tujuan pembelajaran?</h3>
			<p class="mb-4">
				{#if entryToDelete}
					"{entryToDelete.deskripsi.trim() || 'Tujuan pembelajaran tanpa deskripsi'}" akan dihapus.
				{:else}
					Tujuan pembelajaran ini tidak ditemukan.
				{/if}
			</p>
			<div class="flex justify-end gap-2">
				<button class="btn shadow-none" type="button" onclick={closeEntryDeleteDialog}>
					Batal
				</button>
				<button
					type="button"
					class="btn btn-error btn-soft shadow-none"
					disabled={!entryToDelete}
					onclick={confirmEntryDelete}
				>
					<Icon name="del" />
					Hapus
				</button>
			</div>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button onclick={closeEntryDeleteDialog}>close</button>
		</form>
	</dialog>
{/if}

{#if bulkDeleteDialog}
	{@const groupsToDelete = bulkDeleteDialog.groups}
	{@const idsToDelete = groupsToDelete.flatMap((group) => group.ids)}
	{@const totalLingkup = groupsToDelete.length}
	{@const totalTujuan = groupsToDelete.reduce((total, group) => total + group.ids.length, 0)}
	<dialog class="modal" open onclose={closeBulkDeleteDialog}>
		<div class="modal-box">
			<FormEnhance
				action="?/delete"
				onsuccess={() => {
					closeBulkDeleteDialog();
					clearSelection();
					invalidate('app:mapel_tp-rl');
				}}
			>
				{#snippet children({ submitting })}
					{#each idsToDelete as idValue}
						<input name="ids" value={idValue} hidden />
					{/each}

					<h3 class="mb-3 text-xl font-bold">Hapus beberapa lingkup materi?</h3>
					<p class="mb-2">
						{totalLingkup} lingkup materi berikut akan dihapus beserta tujuan pembelajarannya:
					</p>
					<ul class="mb-4 list-disc space-y-1 pl-5 text-sm">
						{#each groupsToDelete as group (group.lingkupMateri)}
							<li>
								<span class="font-semibold">{group.lingkupMateri}</span>
								<span class="opacity-70"> – {group.ids.length} tujuan pembelajaran</span>
							</li>
						{/each}
					</ul>
					<p class="text-sm opacity-70">Total tujuan pembelajaran: {totalTujuan}</p>

					<div class="mt-4 flex justify-end gap-2">
						<button class="btn shadow-none" type="button" onclick={closeBulkDeleteDialog}>
							Batal
						</button>
						<button class="btn btn-error btn-soft shadow-none" disabled={submitting || idsToDelete.length === 0}>
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
		</div>
		<form method="dialog" class="modal-backdrop">
			<button onclick={closeBulkDeleteDialog}>close</button>
		</form>
	</dialog>
{/if}

{#if deleteGroup}
	<dialog class="modal" open onclose={closeDeleteDialog}>
		<div class="modal-box">
			<FormEnhance
				action="?/delete"
				onsuccess={() => {
					closeDeleteDialog();
					invalidate('app:mapel_tp-rl');
				}}
			>
				{#snippet children({ submitting })}
					{#if deleteGroup?.ids}
						{#each deleteGroup.ids as idValue}
							<input name="ids" value={idValue} hidden />
						{/each}
					{/if}

					<h3 class="mb-4 text-xl font-bold">Hapus lingkup materi?</h3>
					<p class="mb-2">"{deleteGroup?.lingkupMateri}" beserta seluruh tujuan pembelajaran akan dihapus.</p>
					<p class="text-sm opacity-70">Jumlah tujuan pembelajaran: {deleteGroup?.ids.length}</p>

					<div class="mt-4 flex justify-end gap-2">
						<button class="btn shadow-none" type="button" onclick={closeDeleteDialog}>
							Batal
						</button>
						<button class="btn btn-error btn-soft shadow-none" disabled={submitting}>
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
		</div>
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>
{/if}
