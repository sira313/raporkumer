<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { hideModal, updateModal } from '$lib/components/global-modal.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { onMount } from 'svelte';

	interface BuktiItem {
		id: number;
		jenis: 'pdf' | 'foto';
		namaFile: string;
	}

	interface Props {
		sppdId: number;
		existing?: BuktiItem[];
	}

	let { sppdId, existing = [] }: Props = $props();

	const existingPdf = $derived(existing.find((b) => b.jenis === 'pdf'));
	const existingFotos = $derived(existing.filter((b) => b.jenis === 'foto'));
	const isEdit = $derived(existing.length > 0);

	let pdfFile = $state<File | null>(null);
	let fotoFiles = $state<File[]>([]);
	let fotoUrls = $state<string[]>([]);
	let removedIds = $state<number[]>([]);
	let submitting = $state(false);

	onMount(() => {
		return () => {
			for (const url of fotoUrls) {
				URL.revokeObjectURL(url);
			}
		};
	});

	function previewUrl(file: File, index: number): string {
		if (!fotoUrls[index]) {
			fotoUrls[index] = URL.createObjectURL(file);
		}
		return fotoUrls[index];
	}

	function removeFoto(index: number) {
		const url = fotoUrls[index];
		if (url) URL.revokeObjectURL(url);
		fotoUrls = fotoUrls.filter((_, i) => i !== index);
		fotoFiles = fotoFiles.filter((_, i) => i !== index);
	}

	function removeExisting(id: number) {
		removedIds = removedIds.includes(id) ? removedIds.filter((x) => x !== id) : [...removedIds, id];
	}

	function handlePdfChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const selected = input.files?.[0] ?? null;
		if (!selected) {
			pdfFile = null;
			return;
		}
		if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
			toast('File bukti PDF harus berupa PDF', 'warning');
			input.value = '';
			pdfFile = null;
			return;
		}
		pdfFile = selected;
		if (existingPdf && !removedIds.includes(existingPdf.id)) {
			removedIds = [...removedIds, existingPdf.id];
		}
	}

	function handleFotoChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const selected = Array.from(input.files ?? []);
		if (selected.length === 0) return;
		const valid = selected.filter((f) =>
			['image/jpeg', 'image/png', 'image/webp'].includes(f.type)
		);
		if (valid.length !== selected.length) {
			toast('Foto hanya mendukung format JPG, PNG, atau WebP', 'warning');
		}
		let combined = [...fotoFiles, ...valid];
		// Keep 3 foto slots total: auto-drop oldest existing fotos when new ones are added.
		const keptExisting = existingFotos.filter((f) => !removedIds.includes(f.id));
		const overflow = keptExisting.length + combined.length - 3;
		if (overflow > 0) {
			const toRemove = keptExisting.slice(0, overflow).map((f) => f.id);
			removedIds = [...new Set([...removedIds, ...toRemove])];
		}
		combined = combined.slice(0, 3 - keptExisting.filter((f) => !removedIds.includes(f.id)).length);
		fotoFiles = combined;
		if (valid.length > 0) {
			input.value = '';
		}
	}

	function buktiUrl(item: BuktiItem): string {
		return `/api/dinas-luar/bukti/${item.namaFile}`;
	}

	onMount(() => {
		updateModal({
			onPositive: {
				label: isEdit ? 'Simpan Perubahan' : 'Upload',
				class: 'btn-primary',
				action: () => void submit()
			},
			onNegative: undefined,
			onNeutral: { label: 'Batal', action: () => hideModal() }
		});
	});

	async function submit() {
		if (submitting) return;

		const hasRemoval = removedIds.length > 0;
		const hasNew = Boolean(pdfFile) || fotoFiles.length > 0;

		if (!hasRemoval && !hasNew) {
			toast('Pilih file bukti yang baru atau hapus bukti yang ada', 'warning');
			return;
		}

		submitting = true;
		try {
			// Unggah file baru + hapus item lama dalam satu request sehingga
			// operasi bersifat atomik: bila upload gagal, bukti lama tetap utuh.
			const formData = new FormData();
			formData.set('sppdId', String(sppdId));
			if (removedIds.length > 0) {
				formData.set('removeIds', JSON.stringify(removedIds));
			}
			if (pdfFile) formData.set('pdf', pdfFile);
			fotoFiles.forEach((f, i) => formData.set(`foto${i + 1}`, f));

			const res = await fetch('/api/dinas-luar/bukti', {
				method: 'POST',
				body: formData
			});
			const data = await res.json().catch(() => ({}));
			if (!res.ok) {
				throw new Error(
					(data as { message?: string }).message ?? `Terjadi kesalahan (${res.status})`
				);
			}

			hideModal();
			await Promise.all([invalidate('app:dinas-luar'), invalidate('app:sppd')]);
			toast(
				isEdit
					? 'Bukti perjalanan dinas berhasil diperbarui'
					: 'Bukti perjalanan dinas berhasil diunggah',
				'success'
			);
		} catch (e) {
			toast(e instanceof Error ? e.message : 'Gagal memperbarui bukti', 'error');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="not-prose flex flex-col gap-4">
	{#if existingPdf}
		<div
			class="border-base-200 dark:border-none bg-base-200 flex items-center justify-between gap-3 rounded-box border p-2.5"
			class:opacity-50={removedIds.includes(existingPdf.id)}
		>
			<span class="flex min-w-0 items-center gap-3">
				<span
					class="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
				>
					<Icon name="book" class="h-4 w-4" />
				</span>
				<span class="truncate text-sm font-medium">{existingPdf.namaFile.split('/').pop()}</span>
				<span class="badge badge-soft badge-info shrink-0">PDF</span>
			</span>
			<button
				type="button"
				class="btn btn-error btn-soft btn-xs shadow-none"
				onclick={() => removeExisting(existingPdf.id)}
				disabled={submitting}
				title={removedIds.includes(existingPdf.id) ? 'Batalkan penghapusan' : 'Hapus PDF ini'}
			>
				<Icon name={removedIds.includes(existingPdf.id) ? 'repeat' : 'del'} />
			</button>
		</div>
	{/if}

	{#if existingFotos.length > 0}
		<div class="grid grid-cols-3 gap-2">
			{#each existingFotos as foto (foto.id)}
				<div
					class="border-base-300 relative overflow-hidden rounded-md border"
					class:opacity-50={removedIds.includes(foto.id)}
				>
					<img
						src={buktiUrl(foto)}
						alt={foto.namaFile.split('/').pop()}
						class="h-20 w-full object-cover"
					/>
					<button
						type="button"
						class="btn btn-error btn-xs absolute right-1 top-1 shadow-none"
						onclick={() => removeExisting(foto.id)}
						disabled={submitting}
						title={removedIds.includes(foto.id) ? 'Batalkan penghapusan' : 'Hapus foto ini'}
					>
						<Icon name={removedIds.includes(foto.id) ? 'repeat' : 'del'} />
					</button>
				</div>
			{/each}
		</div>
		<p class="label-text-alt text-base-content/60">
			{removedIds.length > 0
				? 'Item yang ditandai akan dihapus setelah disimpan.'
				: 'Klik ikon hapus untuk menghapus bukti yang ada.'}
		</p>
	{/if}

	<fieldset class="fieldset">
		<legend class="fieldset-legend">
			{isEdit
				? 'Ganti File PDF Bukti Perjalanan Dinas (opsional)'
				: 'File PDF Bukti Perjalanan Dinas'}
		</legend>
		<input
			type="file"
			class="file-input bg-base-200 w-full dark:border-none"
			accept=".pdf,application/pdf"
			onchange={handlePdfChange}
			disabled={submitting}
		/>
		<p class="label-text-alt text-base-content/60">Maksimal 1 file PDF.</p>
	</fieldset>

	<fieldset class="fieldset">
		<legend class="fieldset-legend">
			{isEdit
				? 'Tambah/Ganti Foto Bukti Perjalanan Dinas (opsional)'
				: 'Foto Bukti Perjalanan Dinas'}
		</legend>
		<input
			type="file"
			class="file-input bg-base-200 w-full dark:border-none"
			accept="image/jpeg,image/png,image/webp"
			multiple
			onchange={handleFotoChange}
			disabled={submitting}
		/>
		<p class="label-text-alt text-base-content/60">Maksimal 3 foto (JPG, PNG, atau WebP).</p>
	</fieldset>

	{#if fotoFiles.length > 0}
		<div class="grid grid-cols-3 gap-2">
			{#each fotoFiles as foto, index (foto.name + index)}
				<div class="border-base-300 group relative overflow-hidden rounded-md border">
					<img src={previewUrl(foto, index)} alt={foto.name} class="h-20 w-full object-cover" />
					<button
						type="button"
						class="btn btn-error btn-xs absolute right-1 top-1 shadow-none"
						onclick={() => removeFoto(index)}
						disabled={submitting}
						title="Hapus foto"
					>
						<Icon name="del" />
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>
