<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import { toast } from '$lib/components/toast.svelte';

	const {
		open,
		title,
		action = '?/bulkDelete',
		ids,
		mode,
		item = null,
		disabled = false,
		onClose,
		onSuccess
	} = $props();

	let isDeleting = $state(false);

	async function handleDelete() {
		if (isDeleting || ids.length === 0) return;

		isDeleting = true;

		try {
			const formData = new FormData();
			ids.forEach((id: number) => {
				formData.append('ids', String(id));
			});

			const response = await fetch(action, {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			if (!response.ok) {
				toast(result.fail || 'Gagal menghapus', 'error');
			} else {
				toast(result.message || 'Berhasil dihapus', 'success');
				onSuccess();
			}
		} catch (error) {
			toast('Terjadi kesalahan saat menghapus', 'error');
			console.error(error);
		} finally {
			isDeleting = false;
		}
	}
</script>

{#if open}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="text-lg font-bold">{title}</h3>

			{#if mode === 'single' && item}
				<div class="py-4">
					<p class="text-base-content/70 text-sm">Nama Mata Evaluasi:</p>
					<p class="font-semibold">{item.nama}</p>

					{#if item.indikator.length > 0}
						<p class="text-base-content/70 mt-3 text-sm">Indikator:</p>
						<div class="space-y-1">
							{#each item.indikator as indicator (indicator.id)}
								<div class="flex gap-2 text-sm">
									<span class="shrink-0">•</span>
									<span>{indicator.deskripsi}</span>
								</div>
							{/each}
						</div>
					{/if}
				</div>
				<div class="alert alert-warning">
					<Icon name="warning" />
					<span>Apakah Anda yakin ingin menghapus mata evaluasi ini?</span>
				</div>
			{:else if mode === 'bulk'}
				<div class="py-4">
					<p class="text-sm">Akan menghapus <strong>{ids.length}</strong> mata evaluasi.</p>
				</div>
				<div class="alert alert-warning">
					<Icon name="warning" />
					<span>Aksi ini tidak dapat dibatalkan. Lanjutkan?</span>
				</div>
			{/if}

			<div class="modal-action">
				<button
					type="button"
					class="btn btn-ghost"
					onclick={onClose}
					disabled={isDeleting || disabled}
				>
					Batal
				</button>
				<button
					type="button"
					class="btn btn-error"
					onclick={handleDelete}
					disabled={isDeleting || disabled}
					aria-busy={isDeleting}
				>
					{#if isDeleting}
						<span class="loading loading-spinner"></span>
					{:else}
						<Icon name="del" />
					{/if}
					Hapus
				</button>
			</div>
		</div>
		<div
			class="modal-backdrop"
			role="button"
			onkeydown={(e) => e.key === 'Escape' && onClose()}
			onclick={onClose}
			tabindex={-1}
		></div>
	</div>
{/if}
