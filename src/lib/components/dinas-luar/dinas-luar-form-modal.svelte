<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { hideModal, updateModal } from '$lib/components/global-modal.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import { onMount } from 'svelte';

	let maksud = $state('');
	let file = $state<File | null>(null);
	let submitting = $state(false);

	onMount(() => {
		updateModal({
			onPositive: {
				label: 'Ajukan',
				class: 'btn-primary',
				action: () => void submit()
			},
			onNegative: undefined,
			onNeutral: { label: 'Batal', action: () => hideModal() },
			spreadActions: true
		});
	});

	function handleFileChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const selected = input.files?.[0] ?? null;
		if (!selected) {
			file = null;
			return;
		}
		if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
			toast('File undangan harus berupa PDF', 'warning');
			input.value = '';
			file = null;
			return;
		}
		file = selected;
	}

	async function submit() {
		if (submitting) return;

		if (!maksud.trim()) {
			toast('Maksud perjalanan dinas wajib diisi', 'warning');
			return;
		}

		submitting = true;
		try {
			const formData = new FormData();
			formData.set('maksud', maksud.trim());
			if (file) {
				formData.set('undangan', file);
			}
			const res = await fetch('/api/dinas-luar', {
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
			await invalidate('app:dinas-luar');
			toast(
				(data as { message?: string }).message ?? 'Permohonan perjalanan dinas berhasil disimpan',
				'success'
			);
		} catch (e) {
			toast(e instanceof Error ? e.message : 'Gagal menyimpan data', 'error');
		} finally {
			submitting = false;
		}
	}
</script>

<div class="not-prose flex flex-col gap-4">
	<fieldset class="fieldset">
		<legend class="fieldset-legend">Upload file undangan kegiatan perjalanan dinas</legend>
		<input
			type="file"
			class="file-input bg-base-200 w-full dark:border-none"
			accept=".pdf,application/pdf"
			onchange={handleFileChange}
			disabled={submitting}
		/>
		<p class="label-text-alt text-base-content/60">Opsional. Format PDF.</p>
	</fieldset>

	<fieldset class="fieldset">
		<legend class="fieldset-legend">
			Maksud Perjalanan Dinas
			<span class="text-error">*</span>
		</legend>
		<textarea
			class="textarea bg-base-200 w-full dark:border-none"
			bind:value={maksud}
			placeholder="Contoh: Menghadiri undangan rapat koordinasi, seminar, dsb."
			rows={3}
			disabled={submitting}></textarea>
	</fieldset>
</div>
