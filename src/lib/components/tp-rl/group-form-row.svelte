<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { onDestroy, onMount } from 'svelte';
	import type { GroupFormState } from './types';

	interface Props {
		rowNumber: number;
		form: GroupFormState;
		onLingkupMateriInput: (value: string) => void;
		onEntryInput: (index: number, value: string) => void;
		onOpenDeleteEntry: (index: number) => void;
		onSubmitSuccess: () => void;
		onFormRegistered: (formId: string) => void;
		onSubmittingChange: (submitting: boolean) => void;
	}

	let {
		rowNumber,
		form,
		onLingkupMateriInput,
		onEntryInput,
		onOpenDeleteEntry,
		onSubmitSuccess,
		onFormRegistered,
		onSubmittingChange
	}: Props = $props();

	const formId = crypto.randomUUID();

	onMount(() => {
		onFormRegistered(formId);
		onSubmittingChange(false);
	});

	onDestroy(() => {
		onFormRegistered('');
		onSubmittingChange(false);
	});

	function shouldShowDeleteButton(entry: GroupFormState['entries'][number]) {
		if (entry.deleted) return false;
		const trimmedDeskripsi = entry.deskripsi.trim();
		if (form.mode === 'edit') {
			return !(entry.id === undefined && trimmedDeskripsi === '');
		}
		return trimmedDeskripsi.length > 0;
	}
</script>

<tr>
	<td class="align-top"><input type="checkbox" class="checkbox" disabled /></td>
	<td class="text-primary animate-pulse align-top font-semibold">{rowNumber}</td>
	<td class="align-top" colspan="2">
		<textarea
			form={formId}
			class="textarea validator bg-base-200 dark:bg-base-300 border-base-300 h-30 w-full"
			value={form.lingkupMateri}
			name="lingkupMateri"
			aria-label="Lingkup materi"
			placeholder="Tuliskan lingkup materi"
			required
			oninput={(event) => onLingkupMateriInput((event.currentTarget as HTMLTextAreaElement).value)}
		></textarea>
	</td>
	<td class="align-top" colspan="2">
		<div class="flex flex-col gap-2">
			{#each form.entries as entry, entryIndex (`${entry.id ?? 'new'}-${entryIndex}`)}
				<input
					type="hidden"
					form={formId}
					name={`entries.${entryIndex}.id`}
					value={entry.id ?? ''}
				/>
				{#if entry.deleted}
					<input type="hidden" form={formId} name={`entries.${entryIndex}.deskripsi`} value="" />
				{:else}
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
								onEntryInput(entryIndex, (event.currentTarget as HTMLTextAreaElement).value)}
						></textarea>
						{#if shouldShowDeleteButton(entry)}
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
		<FormEnhance
			id={formId}
			action="?/save"
			onsuccess={onSubmitSuccess}
			submitStateChange={onSubmittingChange}
		>
			{#snippet children({ submitting })}
				<input name="mode" value={form.mode} hidden />
				<button type="submit" class="hidden" aria-hidden="true" disabled={submitting}></button>
			{/snippet}
		</FormEnhance>
	</td>
</tr>
