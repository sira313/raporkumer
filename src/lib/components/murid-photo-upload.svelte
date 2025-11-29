<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let initialPreview: string | null = null;

	let preview: string | null = initialPreview;

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
	</div>
</div>
