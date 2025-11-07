<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import { hideModal } from '$lib/components/global-modal.svelte';
	import Icon from '../icon.svelte';
	import { toast } from '../toast.svelte';

	const inputId = 'import-database-file';

	function handleSuccess() {
		hideModal();
		toast('Database berhasil diimport.', 'success');
		invalidateAll().catch((error) => {
			console.warn('Gagal melakukan refresh data setelah import', error);
			toast('Database berhasil diimport, tetapi data tidak berhasil dimuat ulang.', 'warning');
		});
	}
</script>

<FormEnhance action="/api/database/import" enctype="multipart/form-data" onsuccess={handleSuccess}>
	{#snippet children({ submitting, invalid })}
		<div class="space-y-4">
			<div class="form-control fieldset">
				<label class="fieldset-legend" for={inputId}>
					<span class="label-text font-semibold">Pilih berkas database</span>
				</label>
				<input
					required
					name="database"
					type="file"
					accept=".sqlite3"
					class="file-input file-input-ghost"
					id={inputId}
				/>
				<div class="label">
					<span class="label-text-alt text-base-content/70">
						Contoh file: file-backup.sqlite3
					</span>
				</div>
			</div>

			<div role="alert" class="alert alert-warning">
				<Icon name="warning" />
				<span
					>Berkas yang diunggah akan menggantikan database saat ini. Backup otomatis dibuat sebelum
					proses import.</span
				>
			</div>

			<div class="flex justify-end gap-2 pt-2">
				<button type="button" class="btn" onclick={hideModal} disabled={submitting}> Batal </button>
				<button type="submit" class="btn btn-primary" disabled={invalid || submitting}>
					{submitting ? 'Mengunggah…' : 'Import'}
				</button>
			</div>
		</div>
	{/snippet}
</FormEnhance>
