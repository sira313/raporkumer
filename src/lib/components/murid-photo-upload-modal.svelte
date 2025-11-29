<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import { onMount } from 'svelte';

	interface Props {
		isOpen?: boolean;
		muridId: number | null;
		muridNama?: string;
		onSuccess?: (filename: string) => void;
	}

	let { isOpen = $bindable(false), muridId, muridNama, onSuccess }: Props = $props();

	let selectedFile: File | null = $state(null);
	let previewUrl: string | null = $state(null);
	let uploadingFoto = $state(false);
	let uploadInputRef: HTMLInputElement | null = $state(null);
	let dialogRef: HTMLDialogElement | null = $state(null);

	onMount(() => {
		// Watch for isOpen changes and call showModal/close accordingly
		if (isOpen && dialogRef) {
			dialogRef.showModal?.();
		}
	});

	$effect(() => {
		if (isOpen && dialogRef) {
			// Reset modal state when opening
			resetModal();
			// Use setTimeout to ensure it runs after DOM is ready
			setTimeout(() => {
				dialogRef?.showModal?.();
			}, 0);
		}
	});

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) {
			selectedFile = null;
			previewUrl = null;
			return;
		}

		const allowed = ['image/png', 'image/jpeg'];
		if (!allowed.includes(file.type)) {
			toast({
				message: 'Format file tidak didukung; hanya JPG dan PNG yang diizinkan',
				type: 'error'
			});
			input.value = '';
			selectedFile = null;
			previewUrl = null;
			return;
		}

		if (file.size > 500 * 1024) {
			toast({ message: 'Ukuran file foto tidak boleh lebih dari 500KB', type: 'error' });
			input.value = '';
			selectedFile = null;
			previewUrl = null;
			return;
		}

		const reader = new FileReader();
		reader.onload = () => {
			previewUrl = reader.result as string;
			selectedFile = file;
		};
		reader.readAsDataURL(file);
	}

	async function saveUploadFoto() {
		if (!selectedFile || !muridId) return;

		uploadingFoto = true;
		try {
			const formData = new FormData();
			formData.append('foto', selectedFile);

			const res = await fetch(`/api/murid-photo/${muridId}`, {
				method: 'POST',
				body: formData
			});

			if (!res.ok) {
				let msg = 'Gagal upload foto';
				try {
					const json = await res.json().catch(() => null);
					if (json && typeof json.message === 'string') msg = json.message;
				} catch {
					void 0;
				}
				toast({ message: msg, type: 'error' });
				return;
			}

			const result = await res.json();
			if (result?.foto) {
				toast({ message: 'Foto berhasil diperbarui', type: 'success' });
				onSuccess?.(result.foto);
				// Dispatch custom event to notify other components
				window.dispatchEvent(
					new CustomEvent('murid:updated', {
						detail: { id: muridId, foto: result.foto, t: Date.now() }
					})
				);
				// Close only this modal, keep parent modal open
				resetModal();
				isOpen = false;
				dialogRef?.close();
			}
		} catch (err) {
			console.error(err);
			toast({ message: 'Gagal upload foto', type: 'error' });
		} finally {
			uploadingFoto = false;
		}
	}

	function resetModal() {
		selectedFile = null;
		previewUrl = null;
		if (uploadInputRef) uploadInputRef.value = '';
	}

	function closeModal() {
		resetModal();
		isOpen = false;
		dialogRef?.close();
	}

	function handleSave() {
		if (!selectedFile) {
			toast({ message: 'Pilih file foto terlebih dahulu', type: 'warning' });
			return;
		}
		saveUploadFoto();
	}

	function handleBatal() {
		closeModal();
	}
</script>

<!-- Modal Dialog using DaisyUI standard pattern -->
<dialog bind:this={dialogRef} class="modal">
	<div class="modal-box">
		<h3 class="mb-6 text-lg font-bold">Upload Foto {muridNama}</h3>

		<div class="flex flex-col gap-4 sm:flex-row">
			<!-- Preview -->
			<div class="flex justify-center">
				<div
					class="bg-base-200 flex aspect-3/4 w-48 items-center justify-center overflow-hidden rounded-lg"
				>
					{#if previewUrl}
						<img src={previewUrl} alt="Preview" class="h-full w-full object-cover" />
					{:else}
						<div class="p-4 text-center opacity-60">
							<Icon name="image" class="mx-auto text-4xl" />
							<p class="mt-2 text-xs">Foto belum dipilih</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- File Input -->
			<div>
				<fieldset class="fieldset">
					<legend class="fieldset-legend">Pilih File</legend>
					<input
						bind:this={uploadInputRef}
						type="file"
						accept="image/png,image/jpeg"
						class="file-input file-input-ghost w-full"
						onchange={handleFileChange}
						disabled={uploadingFoto}
						aria-label="Upload foto murid"
					/>
					<p class="label">JPG atau PNG. Ukuran maks 500KB</p>
				</fieldset>
			</div>
		</div>

		<!-- Action Buttons -->
		<div class="modal-action gap-2">
			<button
				type="button"
				class="btn btn-soft btn-error"
				disabled={uploadingFoto}
				onclick={handleBatal}
				aria-label="Close modal"
			>
				Batal
			</button>
			<button
				type="button"
				class="btn btn-primary"
				onclick={handleSave}
				disabled={uploadingFoto || !selectedFile}
				aria-label="Save photo"
			>
				{#if uploadingFoto}
					<span class="loading loading-spinner"></span>
				{:else}
					<Icon name="save" />
				{/if}
				Simpan
			</button>
		</div>
	</div>

	<!-- Close backdrop using standard DaisyUI pattern -->
	<button
		type="button"
		class="modal-backdrop"
		onclick={closeModal}
		aria-label="Close modal on backdrop click"
	></button>
</dialog>
