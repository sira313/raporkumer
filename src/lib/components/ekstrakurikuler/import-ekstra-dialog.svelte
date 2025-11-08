<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { hideModal } from '$lib/components/global-modal.svelte';
	import { invalidate } from '$app/navigation';

	interface Props {
		onSuccess?: () => void;
	}

	let { onSuccess }: Props = $props();

	const fileInputId = 'import-ekstra-file';
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
					<th class="pl-2">Ekstrakurikuler</th>
					<th>Tujuan</th>
				</tr>
			</thead>
			<tbody>
				<!-- Ekstrakurikuler 1 with two tujuan rows -->
				<tr>
					<td class="pl-2 font-medium">Pramuka</td>
					<td>Mengamalkan dasa darma pramuka</td>
				</tr>
				<tr>
					<td></td>
					<td>Membuat simpul sederhana</td>
				</tr>

				<!-- Ekstrakurikuler 2 with two tujuan rows -->
				<tr>
					<td class="pl-2 font-medium">Sepak bola</td>
					<td>Memperagakan cara menggiring bola dengan benar</td>
				</tr>
				<tr>
					<td></td>
					<td>Memperagakan cara shot</td>
				</tr>
			</tbody>
		</table>
	</div>

	<FormEnhance
		action="?/import_ekstra"
		enctype="multipart/form-data"
		showToast={true}
		onsuccess={async ({ form }) => {
			// revalidate the same dependency token used in the page load (depends('app:ekstrakurikuler'))
			await invalidate('app:ekstrakurikuler');
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
						>Maksimal 2MB. Pastikan kolom Ekstrakurikuler dan Tujuan tersedia.</span
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
