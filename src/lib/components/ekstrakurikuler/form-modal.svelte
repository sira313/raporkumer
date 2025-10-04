<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import type { EkstrakurikulerRow } from './types';

	let {
		open,
		title,
		action,
		kelasId,
		tableReady,
		canManage,
		isEditMode,
		modalItem,
		namaInput,
		onNamaChange,
		onClose,
		onSuccess
	} = $props<{
		open: boolean;
		title: string;
		action: string;
		kelasId: number | null;
		tableReady: boolean;
		canManage: boolean;
		isEditMode: boolean;
		modalItem: EkstrakurikulerRow | null;
		namaInput: string;
		onNamaChange: (value: string) => void;
		onClose: () => void;
		onSuccess: (payload: { form: HTMLFormElement }) => void;
	}>();
</script>

{#if open}
	<div
		class="modal modal-open"
		tabindex="-1"
		role="dialog"
		aria-modal="true"
		onkeydown={(event) => {
			if (event.key === 'Escape') onClose();
		}}
	>
		<dialog class="modal-box relative z-10 max-w-md" open aria-modal="true">
			<h3 class="text-lg font-bold">{title}</h3>
			<p class="mt-2 text-sm text-base-content/70">
				Isi nama ekstrakurikuler sesuai kegiatan yang berjalan di kelas.
			</p>

			<FormEnhance action={action} onsuccess={onSuccess}>
				{#snippet children({ submitting })}
					<input name="kelasId" value={kelasId ?? ''} hidden />
					{#if isEditMode && modalItem}
						<input name="id" value={modalItem.id} hidden />
					{/if}

					<label class="mt-4 flex flex-col gap-2">
						<span class="font-semibold">Nama Ekstrakurikuler</span>
						<input
							class="input bg-base-200 dark:border-none w-full"
							placeholder="Masukkan nama ekstrakurikuler"
							name="nama"
							value={namaInput}
							oninput={(event) => onNamaChange((event.currentTarget as HTMLInputElement).value)}
							required
							disabled={!canManage}
						/>
					</label>

					<div class="modal-action mt-6 flex gap-2">
						<button class="btn shadow-none" type="button" onclick={onClose}>
							<Icon name="close" />
							Batal
						</button>
						<button
							class="btn btn-primary shadow-none"
							disabled={
								submitting ||
								!namaInput.trim() ||
								!kelasId ||
								!tableReady
							}
						>
							{#if submitting}
								<div class="loading loading-spinner"></div>
							{:else}
								<Icon name="save" />
							{/if}
							{isEditMode ? 'Simpan Perubahan' : 'Simpan'}
						</button>
					</div>
				{/snippet}
			</FormEnhance>
		</dialog>
		<form method="dialog" class="modal-backdrop">
			<button
				type="submit"
				onclick={(event) => {
					event.preventDefault();
					onClose();
				}}
			>
				tutup
			</button>
		</form>
	</div>
{/if}
