<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import type { TujuanPembelajaranGroup } from './types';

	interface Props {
		rowNumber: number;
		group: TujuanPembelajaranGroup;
		isSelected: boolean;
		isEditingBobot: boolean;
		bobotDraftValue: string;
		bobotDisplayValue: string;
		onToggleSelection: (checked: boolean) => void;
		onBobotInput: (value: string) => void;
		onEdit: () => void;
		onDelete: () => void;
		areActionsDisabled: boolean;
	}

	let {
		rowNumber,
		group,
		isSelected,
		isEditingBobot,
		bobotDraftValue,
		bobotDisplayValue,
		onToggleSelection,
		onBobotInput,
		onEdit,
		onDelete,
		areActionsDisabled
	}: Props = $props();

	function handleSelectionChange(event: Event) {
		onToggleSelection((event.currentTarget as HTMLInputElement).checked);
	}

	function handleBobotChange(event: Event) {
		onBobotInput((event.currentTarget as HTMLInputElement).value);
	}
</script>

<tr>
	<td class="align-top">
		<input
			type="checkbox"
			class="checkbox"
			aria-label={`Pilih lingkup materi ${group.lingkupMateri}`}
			checked={isSelected}
			onchange={handleSelectionChange}
			disabled={areActionsDisabled}
		/>
	</td>
	<td class="align-top">{rowNumber}</td>
	<td class="align-top">{group.lingkupMateri}</td>
	<td class="align-top">
		{#if isEditingBobot}
			<input
				type="number"
				class="input input-bordered input-sm w-full shadow-none"
				min="0"
				max="100"
				step="0.01"
				value={bobotDraftValue}
				oninput={handleBobotChange}
			/>
		{:else}
			<span class="font-semibold">{bobotDisplayValue}</span>
		{/if}
	</td>
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
		<div class="flex flex-col gap-2">
			<button
				class="btn btn-sm btn-soft shadow-none"
				type="button"
				title="Edit lingkup dan tujuan pembelajaran"
				onclick={onEdit}
				disabled={areActionsDisabled}
			>
				<Icon name="edit" />
			</button>
			<button
				class="btn btn-sm btn-soft btn-error shadow-none"
				type="button"
				title="Hapus lingkup dan tujuan pembelajaran"
				onclick={onDelete}
				disabled={areActionsDisabled}
			>
				<Icon name="del" />
			</button>
		</div>
	</td>
</tr>
