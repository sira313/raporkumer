<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import type { GroupFormState } from './types';

	interface Props {
		rowNumber: number;
		form: GroupFormState;
		onLingkupMateriInput: (value: string) => void;
		onEntryInput: (index: number, value: string) => void;
		onOpenDeleteEntry: (index: number) => void;
		onClose: () => void;
		onSaveClick: (event: MouseEvent, form: GroupFormState) => void;
		onSubmitSuccess: () => void;
	}

	let {
		rowNumber,
		form,
		onLingkupMateriInput,
		onEntryInput,
		onOpenDeleteEntry,
		onClose,
		onSaveClick,
		onSubmitSuccess
	}: Props = $props();

	const formId = crypto.randomUUID();
</script>

<tr>
	<td class="align-top"><input type="checkbox" class="checkbox" disabled /></td>
	<td class="text-primary animate-pulse align-top font-semibold">{rowNumber}</td>
	<td class="align-top">
		<textarea
			form={formId}
			class="textarea validator bg-base-200 dark:bg-base-300 border-base-300 h-30 w-full"
			value={form.lingkupMateri}
			name="lingkupMateri"
			aria-label="Lingkup materi"
			placeholder="Tuliskan lingkup materi"
			required
			oninput={(event) =>
				onLingkupMateriInput((event.currentTarget as HTMLTextAreaElement).value)
			}
		></textarea>
	</td>
	<td></td>
	<td class="align-top">
		<div class="flex flex-col gap-2">
			{#each form.entries as entry, entryIndex (`${entry.id ?? 'new'}-${entryIndex}`)}
				{#if entry.deleted}
					<input type="hidden" form={formId} name={`entries.${entryIndex}.id`} value={entry.id ?? ''} />
					<input type="hidden" form={formId} name={`entries.${entryIndex}.deskripsi`} value="" />
				{:else}
					{@const trimmedDeskripsi = entry.deskripsi.trim()}
					<input type="hidden" form={formId} name={`entries.${entryIndex}.id`} value={entry.id ?? ''} />
					<div class="flex flex-col gap-2 sm:flex-row">
						<textarea
							form={formId}
							class="textarea validator bg-base-200 border-base-300 dark:bg-base-300 w-full dark:border-none"
							value={entry.deskripsi}
							name={`entries.${entryIndex}.deskripsi`}
							aria-label={`Tujuan pembelajaran ${entryIndex + 1}`}
							placeholder="Tuliskan tujuan pembelajaran"
							required={form.mode === 'create' && entryIndex === 0}
							oninput={(event) =>
								onEntryInput(entryIndex, (event.currentTarget as HTMLTextAreaElement).value)
							}
						></textarea>
						{#if (form.mode === 'edit' && !(entry.id === undefined && trimmedDeskripsi === '')) || (form.mode === 'create' && trimmedDeskripsi.length > 0)}
							<button
								type="button"
								class="btn btn-sm btn-soft btn-error shadow-none"
								title="Hapus tujuan pembelajaran ini"
								onclick={() => onOpenDeleteEntry(entryIndex)}
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
			onsuccess={onSubmitSuccess}
		>
			{#snippet children({ submitting })}
				{@const lingkupFilled = form.lingkupMateri.trim().length > 0}
				{@const hasDeskripsi = form.entries.some((entry) => !entry.deleted && entry.deskripsi.trim().length > 0)}
				{@const disableSubmit = submitting || (form.mode === 'create' && (!lingkupFilled || !hasDeskripsi))}
				<input name="mode" value={form.mode} hidden />
				<div class="flex flex-col gap-2">
					<button
						class="btn btn-sm btn-soft btn-primary shadow-none"
						title="Simpan"
						type="submit"
						disabled={disableSubmit}
						onclick={(event) => onSaveClick(event, form)}
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
						onclick={onClose}
					>
						<Icon name="close" />
					</button>
				</div>
			{/snippet}
		</FormEnhance>
	</td>
</tr>
