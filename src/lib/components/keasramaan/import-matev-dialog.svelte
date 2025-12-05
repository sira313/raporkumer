<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { hideModal } from '$lib/components/global-modal.svelte';
	import { invalidate } from '$app/navigation';

	interface Props {
		onSuccess?: () => void;
	}

	let { onSuccess }: Props = $props();

	const fileInputId = 'import-matev-file';
	let fileInput: HTMLInputElement | null = null;
	let hasFile = $state(false);
	let fileName = $state('');

	function handleFileChange(e: Event) {
		const target = e.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		hasFile = Boolean(file);
		fileName = file ? file.name : '';
	}

	function resetForm(form?: HTMLFormElement | null) {
		hasFile = false;
		fileName = '';
		if (fileInput) fileInput.value = '';
		form?.reset();
	}

	function handleClose() {
		resetForm();
		hideModal();
	}
</script>

<div>
	<p class="text-base-content/70 mb-4 text-sm">
		Unggah file Excel (.xlsx) sesuai format di bawah. Baris kosong akan diabaikan.
	</p>

	<div class="mb-4 overflow-auto rounded-lg text-sm">
		<table class="table-sm table-compact table-zebra table w-full border-collapse">
			<thead class="bg-base-300">
				<tr class="text-sm font-semibold">
					<th class="pl-2">Matev</th>
					<th>Indikator</th>
					<th>Tujuan Pembelajaran</th>
				</tr>
			</thead>
			<tbody>
				<!-- Matev 1 (Kepemimpinan) with multiple indikator rows -->
				<tr>
					<td class="pl-2 font-medium">Kepemimpinan</td>
					<td>Kemampuan menjalin relasi dengan baik</td>
					<td>Tujuan 1</td>
				</tr>
				<tr>
					<td></td>
					<td></td>
					<td>Tujuan 2</td>
				</tr>
				<tr>
					<td></td>
					<td>Kemampuan memberikan instruksi</td>
					<td>Tujuan 1</td>
				</tr>
				<tr>
					<td></td>
					<td></td>
					<td>Tujuan 2</td>
				</tr>

				<!-- Matev 2 (KETAATAN IBADAH) with multiple indikator rows -->
				<tr>
					<td class="pl-2 font-medium">KETAATAN IBADAH</td>
					<td>Etika beribadah</td>
					<td>Tujuan 1</td>
				</tr>
				<tr>
					<td></td>
					<td></td>
					<td>Tujuan 2</td>
				</tr>
				<tr>
					<td></td>
					<td>Konsistensi beribadah</td>
					<td>Tujuan 1</td>
				</tr>
				<tr>
					<td></td>
					<td></td>
					<td>Tujuan 2</td>
				</tr>
			</tbody>
		</table>
	</div>

	<FormEnhance
		action="?/import_matev"
		enctype="multipart/form-data"
		showToast={true}
		onsuccess={async ({ form }) => {
			// revalidate the same dependency token used in the page load (depends('app:keasramaan'))
			await invalidate('app:keasramaan');
			onSuccess?.();
			resetForm(form);
			hideModal();
		}}
	>
		{#snippet children({ submitting })}
			<fieldset class="fieldset">
				<legend class="fieldset-legend font-semibold">Pilih File Excel (.xlsx)</legend>
				<input
					id={fileInputId}
					bind:this={fileInput}
					onchange={handleFileChange}
					required
					name="file"
					type="file"
					accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					class="file-input file-input-ghost"
				/>
				<label class="label" for={fileInputId}>
					<span class="label-text-alt text-base-content/60 text-xs text-wrap"
						>Maksimal 2MB. Pastikan kolom Matev, Indikator, dan Tujuan Pembelajaran tersedia.</span
					>
					{#if fileName}
						<span class="label-text-alt text-base-content/60 text-xs"
							>File dipilih: <strong>{fileName}</strong></span
						>
					{/if}
				</label>
			</fieldset>

			<div class="mt-6 flex justify-end gap-2">
				<button
					type="button"
					class="btn btn-soft shadow-none"
					onclick={handleClose}
					disabled={submitting}>Batal</button
				>
				<button
					type="submit"
					class="btn btn-primary btn-soft shadow-none"
					disabled={submitting || !hasFile}
				>
					{#if submitting}
						<span class="loading loading-spinner"></span>
					{:else}
						<Icon name="import" /> Import
					{/if}
				</button>
			</div>
		{/snippet}
	</FormEnhance>
</div>
