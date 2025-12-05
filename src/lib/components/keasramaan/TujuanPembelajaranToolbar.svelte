<script lang="ts">
	import Icon from '../icon.svelte';

	let {
		isCreateMode,
		isEditMode,
		anySelected,
		canManage,
		onToggleCreateForm,
		onOpenBulkDelete
	}: {
		isCreateMode: boolean;
		isEditMode: boolean;
		anySelected: boolean;
		canManage: boolean;
		onToggleCreateForm: () => void;
		onOpenBulkDelete: () => void;
	} = $props();
</script>

<div class="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
	<button class="btn btn-soft shadow-none" type="button" onclick={() => history.back()}>
		<Icon name="left" />
		Kembali
	</button>
	{#if anySelected}
		<button
			class="btn btn-error btn-soft shadow-none sm:ml-auto sm:max-w-40"
			type="button"
			onclick={onOpenBulkDelete}
			disabled={!anySelected || !canManage}
		>
			<Icon name="del" />
			Hapus TP
		</button>
	{:else}
		<button
			class={`btn btn-soft shadow-none sm:max-w-40 ${isCreateMode ? 'btn-error' : ''}`}
			type="button"
			onclick={onToggleCreateForm}
			disabled={!canManage || isEditMode}
		>
			<Icon name={isCreateMode ? 'close' : 'plus'} />
			{isCreateMode ? 'Batal' : 'Tambah TP'}
		</button>
	{/if}
</div>
