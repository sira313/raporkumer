<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import Icon from '$lib/components/icon.svelte';

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
		if (!confirm('Hapus foto murid? Tindakan ini tidak dapat dibatalkan.')) return;
		deleting = true;
		try {
			const res = await fetch(`/api/murid-photo/${muridId}`, { method: 'DELETE' });
			if (!res.ok) throw new Error(await res.text());
			preview = null;
			dispatch('deleted');
			alert('Foto berhasil dihapus');
		} catch (err) {
			console.error(err);
			alert('Gagal menghapus foto');
		} finally {
			deleting = false;
		}
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
			class="btn btn-outline btn-error mt-2"
			on:click={deleteFoto}
			disabled={!preview || deleting}
			aria-label="Hapus Foto Murid"
		>
			Hapus Foto
		</button>
	</div>
</div>
