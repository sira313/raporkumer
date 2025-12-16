<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import { toast } from '$lib/components/toast.svelte';

	interface Props {
		isOpen?: boolean;
		onSuccess?: () => void;
	}

	let { isOpen = $bindable(false), onSuccess }: Props = $props();

	let selectedFile: File | null = $state(null);
	let uploadingPhotos = $state(false);
	let uploadProgress = $state<{ current: number; total: number } | null>(null);
	let uploadInputRef: HTMLInputElement | null = $state(null);
	let dialogRef: HTMLDialogElement | null = $state(null);

	$effect(() => {
		// React to isOpen changes
		if (isOpen && dialogRef) {
			// Add small delay to ensure dropdown is closed and DOM is settled
			const timer = setTimeout(() => {
				if (dialogRef && !dialogRef.open) {
					try {
						dialogRef.showModal?.();
					} catch (err) {
						console.error('Error opening modal:', err);
					}
				}
			}, 50);
			return () => clearTimeout(timer);
		} else if (!isOpen && dialogRef?.open) {
			try {
				dialogRef?.close?.();
			} catch (err) {
				console.error('Error closing modal:', err);
			}
		}
	});

	function handleFileChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) {
			selectedFile = null;
			return;
		}

		if (!file.type.includes('zip') && !file.name.endsWith('.zip')) {
			toast({
				message: 'Format file tidak didukung; hanya ZIP yang diizinkan',
				type: 'error'
			});
			input.value = '';
			selectedFile = null;
			return;
		}

		if (file.size > 5 * 1024 * 1024) {
			// 5MB limit for zip
			toast({ message: 'Ukuran file ZIP tidak boleh lebih dari 5MB', type: 'error' });
			input.value = '';
			selectedFile = null;
			return;
		}

		selectedFile = file;
		toast({
			message: `File dipilih: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`,
			type: 'success'
		});
	}

	async function saveUploadPhotos() {
		if (!selectedFile) return;
		if (uploadingPhotos) return;

		uploadingPhotos = true;
		uploadProgress = { current: 0, total: 1 };

		try {
			const formData = new FormData();
			formData.append('zipFile', selectedFile);

			const res = await fetch('/api/murid-bulk-photo', {
				method: 'POST',
				body: formData
			});

			if (!res.ok) {
				let msg = 'Gagal upload foto massal';
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
			const { uploaded = 0, failed = 0 } = result;

			if (failed > 0) {
				toast({
					message: `Upload selesai: ${uploaded} foto berhasil, ${failed} gagal`,
					type: 'warning',
					persist: true
				});
			} else {
				toast({
					message: `${uploaded} foto berhasil diperbarui`,
					type: 'success',
					persist: true
				});
			}

			// Dispatch event untuk refresh data
			window.dispatchEvent(new CustomEvent('murid:bulk-updated'));

			onSuccess?.();
		} catch (err) {
			console.error(err);
			toast({ message: 'Gagal upload foto massal', type: 'error' });
		} finally {
			uploadingPhotos = false;
			uploadProgress = null;
		}
	}

	function resetModal() {
		selectedFile = null;
		uploadProgress = null;
		if (uploadInputRef) uploadInputRef.value = '';
	}

	function closeModal() {
		resetModal();
		// Ensure state sync by closing dialog first
		if (dialogRef?.open) {
			dialogRef.close();
		}
		// Then update state
		isOpen = false;
	}

	function handleSave() {
		if (!selectedFile) {
			toast({ message: 'Pilih file ZIP terlebih dahulu', type: 'warning' });
			return;
		}
		saveUploadPhotos().then(() => {
			isOpen = false;
		});
	}

	function handleBatal() {
		closeModal();
	}
</script>

<!-- Modal Dialog using DaisyUI standard pattern -->
<dialog
	bind:this={dialogRef}
	class="modal"
	style="z-index: 9999"
	onclose={() => {
		isOpen = false;
		resetModal();
	}}
>
	<div class="modal-box max-w-md">
		<h3 class="mb-6 text-lg font-bold">Upload Semua Foto</h3>

		<div class="flex flex-col gap-4">
			<!-- Instructions -->
			<div class="alert alert-info alert-soft">
				<Icon name="info" />
				<div>
					<p class="mb-3 text-sm font-semibold">Cara menyiapkan file ZIP:</p>
					<ol class="list-inside list-decimal space-y-2 text-xs opacity-80">
						<li>
							<strong>Ubah nama semua foto</strong> menjadi NISN murid
							<br />
							<span class="ml-4 text-xs opacity-70">
								Contoh: <code class="bg-base-200 rounded px-1">3142593492.jpg</code>
							</span>
						</li>
						<li>
							<strong>Periksa ukuran foto</strong>
							<br />
							<span class="ml-4 text-xs opacity-70">
								Setiap foto maksimal 500KB. Kompresi jika diperlukan.
							</span>
						</li>
						<li>
							<strong>Blok semua foto</strong> (jangan dalam folder)
							<br />
							<span class="ml-4 text-xs opacity-70">
								ZIP hanya berisi file JPG/PNG, tidak ada folder di dalamnya
							</span>
						</li>
						<li>
							<strong>Buat file ZIP</strong>
							<br />
							<span class="ml-4 text-xs opacity-70">
								Total ukuran ZIP maksimal 5MB. Upload di sini.
							</span>
						</li>
					</ol>
					<p class="mt-2 font-semibold">Format foto yang didukung: JPG, JPEG, PNG</p>
				</div>
			</div>

			<!-- File Input -->
			<fieldset class="fieldset">
				<legend class="fieldset-legend">Pilih File ZIP</legend>
				<input
					bind:this={uploadInputRef}
					type="file"
					accept=".zip,application/zip"
					class="file-input file-input-ghost w-full"
					onchange={handleFileChange}
					disabled={uploadingPhotos}
					aria-label="Upload ZIP foto massal"
				/>
				<p class="label text-xs">
					File ZIP dengan nama file = NISN (max 5MB). Setiap foto max 500KB.
				</p>
			</fieldset>

			<!-- File Info -->
			{#if selectedFile}
				<div class="alert alert-success alert-soft">
					<Icon name="check" />
					<div class="text-sm">
						<p class="font-semibold">{selectedFile.name}</p>
						<p class="opacity-80">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
					</div>
				</div>
			{/if}

			<!-- Upload Progress -->
			{#if uploadProgress}
				<div class="flex flex-col gap-2">
					<div class="flex justify-between text-xs">
						<span>Proses upload...</span>
						<span>{uploadProgress.current} / {uploadProgress.total}</span>
					</div>
					<progress
						class="progress w-full"
						value={uploadProgress.current}
						max={uploadProgress.total}
					></progress>
				</div>
			{/if}
		</div>

		<!-- Action Buttons -->
		<div class="modal-action gap-2">
			<button
				type="button"
				class="btn btn-soft btn-error"
				disabled={uploadingPhotos}
				onclick={handleBatal}
				aria-label="Close modal"
			>
				Batal
			</button>
			<button
				type="button"
				class="btn btn-primary btn-soft"
				disabled={uploadingPhotos || !selectedFile}
				onclick={handleSave}
				aria-label="Upload foto"
			>
				{#if uploadingPhotos}
					<div class="loading loading-spinner loading-sm"></div>
				{:else}
					<Icon name="import" />
				{/if}
				Upload
			</button>
		</div>
	</div>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
