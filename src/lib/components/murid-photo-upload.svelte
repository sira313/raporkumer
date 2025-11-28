<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	// Icon not used in this component
	import { showModal } from '$lib/components/global-modal.svelte';
	import { toast } from '$lib/components/toast.svelte';

	const dispatch = createEventDispatcher();

	export let initialPreview: string | null = null;
	export let muridId: string | number | null = null;

	let preview: string | null = initialPreview;
	let deleting = false;

	function handleChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) {
			preview = null;
			dispatch('change', { file: null });
			return;
		}
		const allowed = ['image/png', 'image/jpeg'];
		if (!allowed.includes(file.type)) {
			input.value = '';
			alert('Format file tidak didukung; hanya JPG dan PNG yang diizinkan');
			preview = null;
			dispatch('change', { file: null });
			return;
		}
		if (file.size > 500 * 1024) {
			input.value = '';
			alert('Ukuran file foto tidak boleh lebih dari 500KB');
			preview = null;
			dispatch('change', { file: null });
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			preview = reader.result as string;
			dispatch('change', { file });
		};
		reader.readAsDataURL(file);
	}

	async function deleteFoto() {
		if (!muridId) return;
		showModal({
			title: 'Hapus foto murid',
			body: '<p>Hapus foto murid? Tindakan ini tidak dapat dibatalkan.</p>',
			onPositive: {
				label: 'Hapus',
				icon: 'del',
				action: async ({ close }: { close: () => void }) => {
					deleting = true;
					try {
						const res = await fetch(`/api/murid-photo/${muridId}`, { method: 'DELETE' });
						if (!res.ok) {
							let msg = 'Gagal menghapus foto';
							try {
								const json = await res.json().catch(() => null);
								if (json && typeof json.message === 'string') msg = json.message;
							} catch {
								void 0;
							}
							toast({ message: msg, type: 'warning' });
						} else {
							preview = null;
							dispatch('deleted');
							toast({ message: 'Foto berhasil dihapus', type: 'success' });
							close();
						}
					} catch (err) {
						console.error(err);
						toast({ message: 'Gagal menghapus foto', type: 'error' });
					} finally {
						deleting = false;
					}
				}
			},
			onNegative: { label: 'Batal', icon: 'close' },
			dismissible: true
		});
	}
</script>

<div class="flex flex-col gap-4 sm:flex-row">
	<div class="flex-1 sm:max-w-xs">
		<div
			class="bg-base-200 flex aspect-3/4 w-full items-center justify-center overflow-hidden rounded-lg"
		>
			{#if preview}
				<img src={preview} alt="Preview foto murid" class="h-full w-full object-cover" />
			{:else}
				<div class="p-4 text-center opacity-60">
					<p class="text-sm">Foto belum dipilih</p>
				</div>
			{/if}
		</div>
	</div>

	<div class="flex-1">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Upload Foto Murid</legend>
			<!-- name="foto" penting supaya FormEnhance mengirim file ini -->
			<input
				name="foto"
				type="file"
				accept="image/png,image/jpeg"
				class="file-input file-input-ghost w-full"
				on:change={handleChange}
			/>
			<p class="mt-2 text-sm text-gray-500">Maksimum ukuran 500KB. Hanya JPG / PNG.</p>
		</fieldset>

		<button
			type="button"
			class="btn btn-outline btn-sm btn-error mt-2 shadow-none"
			on:click={deleteFoto}
			disabled={!preview || deleting}
			aria-label="Hapus Foto Murid"
		>
			Hapus Foto
		</button>
	</div>
</div>
