<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	const {
		isCreateMode,
		isEditMode,
		hasSelection,
		canManage = true,
		isSubmitting = false,
		isTableReady = true,
		onBack,
		onToggleCreate,
		onBulkDelete,
		children
	} = $props();

	const isPrimaryButtonDisabled = $derived.by(() => {
		if (hasSelection) return false;
		if (isCreateMode || isEditMode) return false; // Allow clicking to cancel
		if (!isTableReady) return true;
		return false;
	});

	function handlePrimaryActionClick() {
		if (hasSelection) {
			onBulkDelete();
			return;
		}
		onToggleCreate();
	}
</script>

<div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
	<button
		type="button"
		class="btn btn-soft shadow-none"
		onclick={onBack}
		title="Kembali ke halaman sebelumnya"
	>
		<Icon name="left" />
		Kembali
	</button>

	<button
		type="button"
		class="btn btn-soft shadow-none sm:ml-auto sm:max-w-40"
		onclick={handlePrimaryActionClick}
		disabled={isPrimaryButtonDisabled || isSubmitting || !canManage}
		class:btn-error={hasSelection}
		class:btn-secondary={isCreateMode || isEditMode}
		aria-busy={hasSelection && isSubmitting}
	>
		{#if hasSelection && isSubmitting}
			<span class="loading loading-spinner"></span>
		{:else}
			<Icon name={hasSelection ? 'del' : isCreateMode || isEditMode ? 'close' : 'plus'} />
		{/if}
		{hasSelection ? 'Hapus Dipilih' : isCreateMode || isEditMode ? 'Batalkan' : 'Tambah Matev'}
	</button>

	{#if children}
		{@render children()}
	{/if}
</div>
