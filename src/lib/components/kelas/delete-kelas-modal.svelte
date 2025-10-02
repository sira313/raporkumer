<script lang="ts">
	import { invalidate } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import type { KelasCard } from './types';

	let dialogEl: HTMLDialogElement | null = null;
	let targetKelas = $state<KelasCard | null>(null);
	let purgeAck = $state(false);

	const needsPurgeAck = $derived.by(() => {
		const kelas = targetKelas;
		if (!kelas) return false;
		return (
			(kelas.jumlahMurid ?? 0) > 0 ||
			(kelas.jumlahMapel ?? 0) > 0 ||
			(kelas.jumlahEkstrakurikuler ?? 0) > 0 ||
			(kelas.jumlahKokurikuler ?? 0) > 0 ||
			Boolean(kelas.waliKelas)
		);
	});

	function resetState() {
		targetKelas = null;
		purgeAck = false;
	}

	export function open(kelas: KelasCard) {
		targetKelas = kelas;
		purgeAck = false;
		requestAnimationFrame(() => dialogEl?.showModal());
	}

	export function close() {
		dialogEl?.close();
		resetState();
	}

	async function handleDeleteSuccess() {
		await invalidate('app:kelas');
		close();
	}
</script>

<dialog
	class="modal"
	bind:this={dialogEl}
	aria-modal="true"
	role="alertdialog"
	onclose={resetState}
>
	{#if targetKelas}
		{@const kelas = targetKelas as KelasCard}
		<div class="modal-box p-4">
			<FormEnhance action="?/delete" onsuccess={handleDeleteSuccess}>
				{#snippet children({ submitting })}
					<input name="id" value={kelas.id} hidden />

					<h3 class="mb-4 text-xl font-bold">Hapus kelas?</h3>
					<p>Kelas: {kelas.nama}</p>
					<p>Fase: {kelas.fase ?? '-'}</p>
					<p>Tahun Ajaran: {kelas.tahunAjaran?.nama ?? '-'}</p>
					<p>Semester: {kelas.semester?.nama ?? '-'}</p>

					<div class="grid gap-3 py-4 sm:grid-cols-2">
						<div class="bg-base-200/70 dark:bg-base-300/60 rounded-lg border border-base-300/60 p-3">
							<p class="text-xs font-semibold uppercase tracking-wide text-base-content/60">Jumlah Murid</p>
							<p class="text-lg font-bold text-base-content">{kelas.jumlahMurid}</p>
						</div>
						<div class="bg-base-200/70 dark:bg-base-300/60 rounded-lg border border-base-300/60 p-3">
							<p class="text-xs font-semibold uppercase tracking-wide text-base-content/60">Mata Pelajaran</p>
							<p class="text-lg font-bold text-base-content">{kelas.jumlahMapel}</p>
						</div>
						<div class="bg-base-200/70 dark:bg-base-300/60 rounded-lg border border-base-300/60 p-3">
							<p class="text-xs font-semibold uppercase tracking-wide text-base-content/60">Ekstrakurikuler</p>
							<p class="text-lg font-bold text-base-content">{kelas.jumlahEkstrakurikuler}</p>
						</div>
						<div class="bg-base-200/70 dark:bg-base-300/60 rounded-lg border border-base-300/60 p-3">
							<p class="text-xs font-semibold uppercase tracking-wide text-base-content/60">Kokurikuler</p>
							<p class="text-lg font-bold text-base-content">{kelas.jumlahKokurikuler}</p>
						</div>
					</div>

					{#if needsPurgeAck}
						<div class="alert alert-warning">
							<Icon name="warning" />
							<span>
								Kelas masih memiliki relasi data. Centang persetujuan untuk menghapus seluruh data berikut secara permanen.
							</span>
						</div>
						<div class="bg-base-200/70 dark:bg-base-300/60 space-y-3 rounded-lg border border-base-300/60 p-4 text-sm text-base-content/70">
							<ul class="ml-5 list-disc space-y-1">
								<li>Seluruh murid dalam kelas</li>
								<li>Semua mata pelajaran termasuk Pendidikan Agama dan Budi Pekerti</li>
								<li>Tujuan pembelajaran, ekstrakurikuler, dan kokurikuler</li>
								<li>Wali kelas (pegawai) jika tidak digunakan di kelas atau sekolah lain</li>
								<li>Data orang tua/wali murid beserta alamat yang hanya dimiliki kelas ini</li>
							</ul>
							<label class="flex items-start gap-3 rounded-lg bg-error/5 p-3 text-error">
								<input
									type="checkbox"
									class="checkbox checkbox-error mt-1"
									name="forceDelete"
									value="true"
									bind:checked={purgeAck}
									required
								/>
								<span>Saya paham semua data terkait kelas ini akan dihapus permanen.</span>
							</label>
						</div>
					{:else}
						<p class="text-sm text-base-content/70">
							Tindakan ini akan menghapus data kelas secara permanen, termasuk wali kelas, data orang tua/wali murid, serta alamat yang hanya dimiliki kelas ini.
						</p>
					{/if}

					<div class="flex justify-end gap-2 pt-4">
						<button class="btn shadow-none" type="button" onclick={close}>
							Batal
						</button>
						<button class="btn btn-error btn-soft shadow-none" disabled={submitting || (needsPurgeAck && !purgeAck)}>
							{#if submitting}
								<div class="loading loading-spinner"></div>
							{:else}
								<Icon name="del" />
							{/if}
							Hapus
						</button>
					</div>
				{/snippet}
			</FormEnhance>
		</div>
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	{/if}
</dialog>
