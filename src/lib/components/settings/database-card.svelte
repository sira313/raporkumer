<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import { showModal } from '$lib/components/global-modal.svelte';
	import ImportDatabaseModal from '$lib/components/modals/import-database-modal.svelte';
	import ResetDatabaseModal from '$lib/components/modals/reset-database-modal.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import { browser } from '$app/environment';

	// Database management (admin/kepala_sekolah). Backup & import mirror the
	// dashboard quick actions; reset wipes the whole database server-side.
	let downloadingBackup = $state(false);

	async function handleBackupDownload() {
		if (!browser || downloadingBackup) return;
		downloadingBackup = true;

		try {
			const response = await fetch('/api/database/backup');
			if (!response.ok) {
				const errorText = (await response.text()) || 'Gagal mengunduh backup database.';
				toast({ message: errorText, type: 'error' });
				return;
			}

			const blob = await response.blob();
			let filename = 'rapkumer-backup.sqlite3';
			const disposition = response.headers.get('content-disposition');
			const matched = disposition?.match(/filename="?([^";]+)"?/i);
			if (matched?.[1]) {
				filename = matched[1];
			} else {
				const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
				filename = `rapkumer-backup-${timestamp}.sqlite3`;
			}

			const blobUrl = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			document.body.appendChild(anchor);
			anchor.href = blobUrl;
			anchor.download = filename;
			anchor.click();
			document.body.removeChild(anchor);
			URL.revokeObjectURL(blobUrl);
			toast({ message: 'Backup database berhasil diunduh.', type: 'success' });
		} catch (error) {
			console.error(error);
			toast({ message: 'Gagal mengunduh backup database.', type: 'error' });
		} finally {
			downloadingBackup = false;
		}
	}

	function handleImportDatabase() {
		showModal({
			title: 'Import Database',
			body: ImportDatabaseModal,
			dismissible: true
		});
	}

	function handleResetDatabase() {
		showModal({
			title: 'Reset Data',
			body: ResetDatabaseModal,
			dismissible: true
		});
	}
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
	<header class="mb-4 space-y-2">
		<h2 class="text-xl font-semibold">Database</h2>
		<p class="text-base-content/70 text-sm">
			Kelola isi database aplikasi: unduh salinan backup, pulihkan dari berkas backup, atau
			kosongkan seluruh data untuk memulai dari awal.
		</p>
	</header>

	<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
		<button
			type="button"
			class="btn btn-soft btn-accent w-full shadow-none"
			onclick={handleBackupDownload}
			disabled={downloadingBackup}
			aria-busy={downloadingBackup}
		>
			{#if downloadingBackup}
				<span class="loading loading-spinner loading-sm"></span>
			{:else}
				<Icon name="database" />
			{/if}
			<span>{downloadingBackup ? 'Mengunduh…' : 'Backup Data'}</span>
		</button>

		<button
			type="button"
			class="btn btn-soft btn-accent w-full shadow-none"
			onclick={handleImportDatabase}
		>
			<Icon name="import" />
			Import Data
		</button>

		<button
			type="button"
			class="btn btn-soft btn-error w-full shadow-none"
			onclick={handleResetDatabase}
		>
			<Icon name="del" />
			Reset Data
		</button>
	</div>

	<p class="text-base-content/60 mt-4 text-xs">
		Reset Data mengosongkan seluruh isi database dan mengembalikan aplikasi ke kondisi awal.
	</p>
</section>
