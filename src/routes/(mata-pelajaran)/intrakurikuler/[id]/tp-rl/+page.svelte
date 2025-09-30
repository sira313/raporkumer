<script lang="ts">
import { goto, invalidate } from '$app/navigation';
import FormEnhance from '$lib/components/form-enhance.svelte';
import Icon from '$lib/components/icon.svelte';

type TujuanPembelajaranGroup = {
	lingkupMateri: string;
	items: Array<Omit<TujuanPembelajaran, 'mataPelajaran'>>;
};

type GroupEntry = { id?: number; deskripsi: string };

type GroupFormState = {
	mode: 'create' | 'edit';
	lingkupMateri: string;
	entries: GroupEntry[];
	targetIds: number[];
};

let { data } = $props();
const agamaOptions = $derived(data.agamaOptions ?? []);
const showAgamaSelect = $derived(agamaOptions.length > 0);
let selectedAgamaId = $state(data.agamaSelection ?? '');
const agamaSelectId = 'agama-select';

let groupedTujuanPembelajaran = $state<TujuanPembelajaranGroup[]>([]);
let groupForm = $state<GroupFormState | null>(null);
let deleteGroup = $state<{ lingkupMateri: string; ids: number[] } | null>(null);

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
	groupedTujuanPembelajaran = Array.from(groups.values());
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
	const copy = entries.map((entry) => ({
		id: entry.id,
		deskripsi: entry.deskripsi ?? ''
	}));

	while (copy.length > 1) {
		const lastIndex = copy.length - 1;
		const last = copy[lastIndex];
		const prev = copy[lastIndex - 1];
		if (
			last.deskripsi.trim() === '' &&
			last.id === undefined &&
			prev.deskripsi.trim() === '' &&
			prev.id === undefined
		) {
			copy.pop();
		} else {
			break;
		}
	}

	const last = copy[copy.length - 1];
	if (!last || last.deskripsi.trim() !== '' || last.id !== undefined) {
		copy.push({ id: undefined, deskripsi: '' });
	}

	return copy;
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
}

function handleLingkupMateriInput(value: string) {
	if (!groupForm) return;
	groupForm = { ...groupForm, lingkupMateri: value };
}

function handleEntryInput(index: number, value: string) {
	if (!groupForm) return;
	const entries = groupForm.entries.map((entry, entryIndex) =>
		entryIndex === index ? { ...entry, deskripsi: value } : entry
	);
	groupForm = { ...groupForm, entries: ensureTrailingEntry(entries) };
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
	deleteGroup = { lingkupMateri: group.lingkupMateri, ids: group.items.map((item) => item.id) };
}

function closeDeleteDialog() {
	deleteGroup = null;
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
		<button class="btn shadow-none sm:max-w-40" onclick={openCreateForm} type="button" disabled={Boolean(groupForm)}>
			<Icon name="plus" />
			Tambah TP
		</button>
		<button class="btn shadow-none sm:max-w-40" type="button">
			<Icon name="percent" />
			Atur Bobot
		</button>
		<button disabled class="btn btn-error shadow-none sm:ml-auto sm:max-w-40">
			<Icon name="del" />
			Hapus TP
		</button>
	</div>
	<div class="bg-base-100 dark:bg-base-200 overflow-x-auto rounded-md shadow-md dark:shadow-none">
		<table class="border-base-200 table border dark:border-none">
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th style="width: 50px; min-width: 40px;"><input type="checkbox" class="checkbox" /></th>
					<th style="width: 50px; min-width: 40px;">No</th>
					<th style="width: 30%;">Lingkup Materi</th>
					<th style="width: 60%">Tujuan Pembelajaran</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#if groupedTujuanPembelajaran.length > 0}
					{#each groupedTujuanPembelajaran as group, groupIndex (groupKey(group))}
						{#if groupForm && isEditingGroup(group)}
							{@render group_form_row(groupIndex + 1)}
						{:else}
							<tr>
								<td class="align-top"><input type="checkbox" class="checkbox" /></td>
								<td class="align-top">{groupIndex + 1}</td>
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
									<div class="flex gap-2">
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

				{#if groupForm && groupForm.mode === 'create'}
					{@render group_form_row(groupedTujuanPembelajaran.length + 1)}
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
					class="textarea validator bg-base-200 dark:bg-base-300 border-base-300 h-36 w-full"
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
						<input name={`entries.${entryIndex}.id`} value={entry.id ?? ''} hidden />
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
					{#snippet children({ submitting, invalid })}
						<input name="mode" value={currentForm.mode} hidden />
						<div class="flex flex-col gap-2">
							<button
								class="btn btn-sm btn-soft btn-primary shadow-none"
								title="Simpan"
								disabled={submitting || (currentForm.mode === 'create' && invalid)}
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
