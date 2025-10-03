<script lang="ts">
import { goto, invalidate } from '$app/navigation';
import Icon from '$lib/components/icon.svelte';
import BobotInfoAlert from '$lib/components/tp-rl/bobot-info-alert.svelte';
import BulkDeleteDialog from '$lib/components/tp-rl/bulk-delete-dialog.svelte';
import DeleteEntryDialog from '$lib/components/tp-rl/delete-entry-dialog.svelte';
import DeleteGroupDialog from '$lib/components/tp-rl/delete-group-dialog.svelte';
import ImportDialog from '$lib/components/tp-rl/import-dialog.svelte';
import GroupDisplayRow from '$lib/components/tp-rl/group-display-row.svelte';
import GroupFormRow from '$lib/components/tp-rl/group-form-row.svelte';
import type {
	GroupBobotState,
	GroupEntry,
	GroupFormState,
	SelectedGroupState,
	TujuanPembelajaranGroup
} from '$lib/components/tp-rl/types';
import { toast } from '$lib/components/toast.svelte';

function buildGroupedTujuanPembelajaran(items: Array<Omit<TujuanPembelajaran, 'mataPelajaran'>> = []) {
	const groups = new Map<string, TujuanPembelajaranGroup>();
	for (const item of items) {
		const key = (item.lingkupMateri ?? '').trim().toLowerCase();
		const existing = groups.get(key);
		if (existing) {
			existing.items = [...existing.items, item];
			if (existing.bobot == null && item.bobot != null) {
				existing.bobot = item.bobot;
			}
			continue;
		}
		groups.set(key, {
			lingkupMateri: item.lingkupMateri,
			items: [item],
			bobot: item.bobot ?? null
		});
	}
	return Array.from(groups.values());
}

function areGroupsEqual(prev: TujuanPembelajaranGroup[], next: TujuanPembelajaranGroup[]) {
	if (prev.length !== next.length) return false;
	for (let groupIndex = 0; groupIndex < prev.length; groupIndex += 1) {
		const a = prev[groupIndex];
		const b = next[groupIndex];
		if (a.lingkupMateri !== b.lingkupMateri) return false;
		if (a.items.length !== b.items.length) return false;
		for (let itemIndex = 0; itemIndex < a.items.length; itemIndex += 1) {
			const itemA = a.items[itemIndex];
			const itemB = b.items[itemIndex];
			if (itemA.id !== itemB.id) return false;
			if (itemA.deskripsi !== itemB.deskripsi) return false;
		}
	}
	return true;
}

let { data } = $props();
const AGAMA_PARENT_NAME = 'Pendidikan Agama dan Budi Pekerti';
const isAgamaParentMapel = $derived(data.mapel.nama === AGAMA_PARENT_NAME);
const agamaOptions = $derived(data.agamaOptions ?? []);
const showAgamaSelect = $derived(agamaOptions.length > 0);
const requiresAgamaSelection = $derived(isAgamaParentMapel && showAgamaSelect);
let selectedAgamaId = $state(data.agamaSelection ?? '');
let lastAgamaSelection = $state(data.agamaSelection ?? '');
const agamaSelectId = 'agama-select';
const activeAgamaOption = $derived.by(() => {
	if (!isAgamaParentMapel) {
		return agamaOptions.find((option) => option.id === data.mapel.id);
	}
	const selectionId = Number.parseInt(selectedAgamaId, 10);
	return Number.isFinite(selectionId)
		? agamaOptions.find((option) => option.id === selectionId)
		: undefined;
});
const hasActiveAgamaSelection = $derived(Boolean(activeAgamaOption));
const mapelDisplayName = $derived.by(() => {
	if (!isAgamaParentMapel) {
		return data.mapel.nama;
	}
	return activeAgamaOption?.name ?? data.mapel.nama;
});

let groupedTujuanPembelajaran = $state<TujuanPembelajaranGroup[]>([]);
let groupForm = $state<GroupFormState | null>(null);
let deleteGroup = $state<{ lingkupMateri: string; ids: number[] } | null>(null);
let deleteEntryDialog = $state<{ index: number } | null>(null);
let selectedGroups = $state<Record<string, SelectedGroupState>>({});
let bulkDeleteDialog = $state<{ groups: SelectedGroupState[] } | null>(null);
let selectAllCheckbox = $state<HTMLInputElement | null>(null);
let agamaSelectElement = $state<HTMLSelectElement | null>(null);
let importDialogOpen = $state(false);

const BOBOT_TOTAL = 100;
let isEditingBobot = $state(false);
let bobotState = $state<Record<string, GroupBobotState>>({});
let bobotDrafts = $state<Record<string, string>>({});
let bobotOverflowActive = false;
let bobotInfoShown = false;
let shouldShowBobotInfoAlert = $state(false);

const selectedGroupList = $derived(Object.values(selectedGroups));
const selectableGroups = $derived(
	groupedTujuanPembelajaran.filter((group) => !(groupForm && isEditingGroup(group)))
);
const hasSelection = $derived(selectedGroupList.length > 0);
const allSelected = $derived(
	selectableGroups.length > 0 && selectedGroupList.length === selectableGroups.length
);
const hasGroups = $derived(groupedTujuanPembelajaran.length > 0);
const isTambahTpDisabled = $derived.by(() => {
	if (hasSelection) return false;
	if (groupForm) return true;
	if (requiresAgamaSelection && !hasActiveAgamaSelection) return true;
	return false;
});
const tambahTpTooltip = $derived.by(() => {
	if (hasSelection) return undefined;
	if (requiresAgamaSelection && !hasActiveAgamaSelection) {
		return 'Pilih agama terlebih dahulu sebelum menambahkan tujuan pembelajaran.';
	}
	if (groupForm) {
		return 'Form tujuan pembelajaran sedang dibuka.';
	}
	return undefined;
});
const isImportDisabled = $derived(requiresAgamaSelection && !hasActiveAgamaSelection);
const importTooltip = $derived.by(() => {
	if (requiresAgamaSelection && !hasActiveAgamaSelection) {
		return 'Pilih agama terlebih dahulu sebelum mengimpor tujuan pembelajaran.';
	}
	return undefined;
});

$effect(() => {
	const nextSelection = data.agamaSelection ?? '';
	if (nextSelection === lastAgamaSelection) return;
	lastAgamaSelection = nextSelection;
	selectedAgamaId = nextSelection;
});

$effect(() => {
	const nextGroups = buildGroupedTujuanPembelajaran(data.tujuanPembelajaran ?? []);
	if (!areGroupsEqual(groupedTujuanPembelajaran, nextGroups)) {
		groupedTujuanPembelajaran = nextGroups;
		syncBobotStateWithGroups(nextGroups);
	}
});

$effect(() => {
	const allowedKeys = new Set(groupedTujuanPembelajaran.map((group) => groupKey(group)));
	const entries = Object.entries(selectedGroups);
	const filteredEntries = entries.filter(([key]) => allowedKeys.has(key));
	if (filteredEntries.length !== entries.length) {
		selectedGroups = Object.fromEntries(filteredEntries);
	}
	if (filteredEntries.length === 0 && bulkDeleteDialog) {
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

function dismissBobotInfoAlert() {
	shouldShowBobotInfoAlert = false;
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
	if (requiresAgamaSelection && !hasActiveAgamaSelection) {
		toast('Pilih agama terlebih dahulu sebelum menambahkan tujuan pembelajaran.', 'warning');
		agamaSelectElement?.focus();
		return;
	}
	groupForm = {
		mode: 'create',
		lingkupMateri: '',
		entries: ensureTrailingEntry([{ deskripsi: '' }]),
		targetIds: []
	};
}

function openImportDialog() {
	if (requiresAgamaSelection && !hasActiveAgamaSelection) {
		toast('Pilih agama terlebih dahulu sebelum mengimpor tujuan pembelajaran.', 'warning');
		agamaSelectElement?.focus();
		return;
	}
	importDialogOpen = true;
}

function handleImportCancel() {
	importDialogOpen = false;
}

async function handleImportSuccess() {
	importDialogOpen = false;
	await invalidate('app:mapel_tp-rl');
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

function handleFormSuccess() {
	closeForm();
	invalidate('app:mapel_tp-rl');
}

function handleBulkDeleteSuccess() {
	closeBulkDeleteDialog();
	clearSelection();
	invalidate('app:mapel_tp-rl');
}

function handleDeleteGroupSuccess() {
	closeDeleteDialog();
	invalidate('app:mapel_tp-rl');
}

function sanitizeBobotValue(value: number) {
	if (!Number.isFinite(value)) return 0;
	return value < 0 ? 0 : value;
}

function formatBobotValue(value: number) {
	return sanitizeBobotValue(value).toFixed(2);
}

type RefreshBobotOptions = {
	preserveKey?: string;
	rawValue?: string;
};

function refreshBobotDrafts(state: Record<string, GroupBobotState>, options: RefreshBobotOptions = {}) {
	const nextDrafts: Record<string, string> = {};
	for (const [key, entry] of Object.entries(state)) {
		if (options.preserveKey === key && options.rawValue !== undefined) {
			nextDrafts[key] = options.rawValue;
			continue;
		}

		const existingDraft = bobotDrafts[key];
		if (entry.isManual && existingDraft !== undefined) {
			nextDrafts[key] = existingDraft;
			continue;
		}

		nextDrafts[key] = formatBobotValue(entry.value);
	}
	bobotDrafts = nextDrafts;
}

function applyBobotDistribution(state: Record<string, GroupBobotState>) {
	const next: Record<string, GroupBobotState> = {};
	const autoKeys: string[] = [];
	let manualSum = 0;

	for (const [key, entry] of Object.entries(state)) {
		const sanitizedValue = sanitizeBobotValue(entry?.value ?? 0);
		const isManual = Boolean(entry?.isManual);
		if (isManual) {
			manualSum += sanitizedValue;
		} else {
			autoKeys.push(key);
		}
		next[key] = { value: sanitizedValue, isManual };
	}

	if (autoKeys.length > 0) {
		let average = (BOBOT_TOTAL - manualSum) / autoKeys.length;
		if (!Number.isFinite(average) || average < 0) {
			average = 0;
		}
		for (const key of autoKeys) {
			next[key] = { value: average, isManual: false };
		}
	}

	return { state: next, manualSum };
}

function isSameBobotState(
	prev: Record<string, GroupBobotState>,
	next: Record<string, GroupBobotState>
) {
	const prevKeys = Object.keys(prev);
	const nextKeys = Object.keys(next);
	if (prevKeys.length !== nextKeys.length) return false;
	for (const key of prevKeys) {
		if (!(key in next)) return false;
		const left = prev[key];
		const right = next[key];
		if (!left || !right) return false;
		if (Boolean(left.isManual) !== Boolean(right.isManual)) return false;
		const leftValue = sanitizeBobotValue(left.value);
		const rightValue = sanitizeBobotValue(right.value);
		if (Math.abs(leftValue - rightValue) > 0.005) return false;
	}
	return true;
}

function deriveInitialBobotState(groups: TujuanPembelajaranGroup[]) {
	const initial: Record<string, GroupBobotState> = {};
	for (const group of groups) {
		const key = groupKey(group);
		const rawValue = group.bobot ?? null;
		const sanitized = sanitizeBobotValue(rawValue ?? 0);
		if (rawValue === null || sanitized === 0) {
			initial[key] = { value: 0, isManual: false };
			continue;
		}
		initial[key] = { value: sanitized, isManual: true };
	}
	return applyBobotDistribution(initial).state;
}

function syncBobotStateWithGroups(groups: TujuanPembelajaranGroup[]) {
	const derived = deriveInitialBobotState(groups);
	const next: Record<string, GroupBobotState> = {};
	for (const group of groups) {
		const key = groupKey(group);
		const existing = bobotState[key];
		const derivedEntry = derived[key];
		if (!existing) {
			next[key] = derivedEntry ?? { value: 0, isManual: false };
			continue;
		}
		if (!isEditingBobot && derivedEntry && !isSameBobotState({ [key]: existing }, { [key]: derivedEntry })) {
			next[key] = derivedEntry;
			continue;
		}
		next[key] = {
			value: sanitizeBobotValue(existing.value ?? 0),
			isManual: Boolean(existing.isManual)
		};
	}

	if (isSameBobotState(bobotState, next)) {
		maybeShowBobotInfo(bobotState);
		refreshBobotDrafts(bobotState);
		return;
	}

	const { state, manualSum } = applyBobotDistribution(next);
	bobotState = state;
	notifyBobotOverflow(manualSum > BOBOT_TOTAL);
	maybeShowBobotInfo(state);
	refreshBobotDrafts(state);
}

function notifyBobotOverflow(active: boolean) {
	if (active === bobotOverflowActive) return;
	bobotOverflowActive = active;
	if (active) {
		toast('Total bobot tidak boleh melebihi 100%!', 'error');
	}
}

function maybeShowBobotInfo(state: Record<string, GroupBobotState>) {
	if (bobotInfoShown) return;
	const hasAutomatic = Object.values(state).some((entry) => !entry.isManual);
	if (hasAutomatic) {
		shouldShowBobotInfoAlert = true;
		bobotInfoShown = true;
	}
}

function handleBobotInput(group: TujuanPembelajaranGroup, rawValue: string) {
	const key = groupKey(group);
	const trimmed = rawValue.trim();
	const next: Record<string, GroupBobotState> = { ...bobotState };

	if (trimmed === '') {
		next[key] = { value: 0, isManual: false };
		const { state, manualSum } = applyBobotDistribution(next);
		bobotState = state;
		refreshBobotDrafts(state, { preserveKey: key, rawValue: '' });
		notifyBobotOverflow(manualSum > BOBOT_TOTAL);
		return;
	}

	const parsed = Number.parseFloat(trimmed);
	const sanitized = sanitizeBobotValue(parsed);
	next[key] = { value: sanitized, isManual: true };
	const { state, manualSum } = applyBobotDistribution(next);
	bobotState = state;
	refreshBobotDrafts(state, { preserveKey: key, rawValue });
	notifyBobotOverflow(manualSum > BOBOT_TOTAL);
}

function getBobotValue(group: TujuanPembelajaranGroup) {
	return bobotState[groupKey(group)]?.value ?? 0;
}

function computeTotalBobot(state: Record<string, GroupBobotState> = bobotState) {
	return Object.values(state).reduce((sum, entry) => sum + sanitizeBobotValue(entry.value), 0);
}

function toggleBobotEditing() {
	if (!hasGroups) return;
	if (!isEditingBobot) {
		const next: Record<string, GroupBobotState> = {};
		for (const [key, entry] of Object.entries(bobotState)) {
			next[key] = {
				value: sanitizeBobotValue(entry.value ?? 0),
				isManual: false
			};
		}
		bobotState = next;
		refreshBobotDrafts(next);
		isEditingBobot = true;
		notifyBobotOverflow(false);
		maybeShowBobotInfo(next);
		return;
	}

	const total = computeTotalBobot();
	if (Math.abs(total - BOBOT_TOTAL) > 0.01) {
		toast('Total bobot harus tepat 100% untuk menyimpan.', 'warning');
		isEditingBobot = true;
		return;
	}

	const next: Record<string, GroupBobotState> = {};
	for (const [key, entry] of Object.entries(bobotState)) {
		next[key] = { value: sanitizeBobotValue(entry.value), isManual: true };
	}
	bobotState = next;
	refreshBobotDrafts(next);
	bobotOverflowActive = false;
	isEditingBobot = false;
	bobotDrafts = {};
	shouldShowBobotInfoAlert = false;
	toast('Bobot berhasil disimpan.', 'success');
}
</script>

{#if shouldShowBobotInfoAlert}
	<BobotInfoAlert
		message="Bobot belum disetel, maka pembobotan akan dilakukan dengan mengambil rata-rata dari semua nilai."
		onDismiss={dismissBobotInfoAlert}
	/>
{/if}

<!-- Data Mapel Wajib -->
<div class="card bg-base-100 rounded-box w-full border border-none p-4 shadow-md">
	<!-- Judul IPAS bisa berubah dinamis sesuai mata pelajaran yang dipilih -->
	<h2 class="mb-6 text-xl font-bold">
		<span class="opacity-50">Mata Pelajaran:</span>
		{mapelDisplayName} – {data.mapel.kelas.nama}
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
					bind:this={agamaSelectElement}
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
			disabled={isTambahTpDisabled}
			title={tambahTpTooltip}
			class:btn-error={hasSelection}
			class:btn-soft={hasSelection}
		>
			<Icon name={hasSelection ? 'del' : 'plus'} />
			{hasSelection ? 'Hapus TP' : 'Tambah TP'}
		</button>
		<button
			class="btn shadow-none sm:max-w-40"
			type="button"
			onclick={toggleBobotEditing}
			disabled={!hasGroups}
			class:btn-primary={!isEditingBobot}
			class:btn-success={isEditingBobot}
		>
			<Icon name="percent" />
			{isEditingBobot ? 'Simpan Bobot' : 'Atur Bobot'}
		</button>
		<button
			class="btn shadow-none sm:max-w-40"
			type="button"
			onclick={openImportDialog}
			disabled={isImportDisabled}
			title={importTooltip}
		>
			<Icon name="import" />
			Import TP
		</button>
	</div>
	{#if requiresAgamaSelection && !hasActiveAgamaSelection}
		<div class="alert alert-warning alert-soft my-2 flex items-center gap-2 text-sm">
			<Icon name="warning" />
			<span>Pilih agama terlebih dahulu sebelum menambahkan tujuan pembelajaran.</span>
		</div>
	{/if}
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
					<th style="width: 13%">Bobot</th>
					<th style="width: 60%">Tujuan Pembelajaran</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#if groupForm && groupForm.mode === 'create'}
					{@const currentForm = groupForm}
					<GroupFormRow
						rowNumber={1}
						form={currentForm}
						onLingkupMateriInput={handleLingkupMateriInput}
						onEntryInput={handleEntryInput}
						onOpenDeleteEntry={openEntryDeleteDialog}
						onClose={closeForm}
						onSaveClick={handleSaveClick}
						onSubmitSuccess={handleFormSuccess}
					/>
				{/if}

				{#if groupedTujuanPembelajaran.length > 0}
					{#each groupedTujuanPembelajaran as group, groupIndex (groupKey(group))}
						{@const rowNumber = groupIndex + 1 + (groupForm && groupForm.mode === 'create' ? 1 : 0)}
						{#if groupForm && isEditingGroup(group)}
							{@const currentForm = groupForm}
							<GroupFormRow
								rowNumber={rowNumber}
								form={currentForm}
								onLingkupMateriInput={handleLingkupMateriInput}
								onEntryInput={handleEntryInput}
								onOpenDeleteEntry={openEntryDeleteDialog}
								onClose={closeForm}
								onSaveClick={handleSaveClick}
								onSubmitSuccess={handleFormSuccess}
							/>
						{:else}
							<GroupDisplayRow
								rowNumber={rowNumber}
								group={group}
								isSelected={isGroupSelected(group)}
								isEditingBobot={isEditingBobot}
								bobotDraftValue={bobotDrafts[groupKey(group)] ?? formatBobotValue(getBobotValue(group))}
								bobotDisplayValue={formatBobotValue(getBobotValue(group))}
								onToggleSelection={(checked) => toggleGroupSelection(group, checked)}
								onBobotInput={(value) => handleBobotInput(group, value)}
								onEdit={() => openEditForm(group)}
								onDelete={() => openDeleteDialog(group)}
							/>
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

		{#if importDialogOpen}
			<ImportDialog onCancel={handleImportCancel} onSuccess={handleImportSuccess} />
		{/if}

	{#if deleteEntryDialog && groupForm}
		{@const entryToDelete = groupForm.entries[deleteEntryDialog.index]}
		<DeleteEntryDialog
			entry={entryToDelete}
			onCancel={closeEntryDeleteDialog}
			onConfirm={confirmEntryDelete}
		/>
	{/if}

	{#if bulkDeleteDialog}
		<BulkDeleteDialog
			groups={bulkDeleteDialog.groups}
			onCancel={closeBulkDeleteDialog}
			onSuccess={handleBulkDeleteSuccess}
		/>
	{/if}

	{#if deleteGroup}
		<DeleteGroupDialog
			lingkupMateri={deleteGroup.lingkupMateri}
			ids={deleteGroup.ids}
			onCancel={closeDeleteDialog}
			onSuccess={handleDeleteGroupSuccess}
		/>
	{/if}

