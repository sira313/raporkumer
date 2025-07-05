<script lang="ts">
	import { goto } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';

	let { data } = $props();
</script>

<FormEnhance
	action="?/add"
	onsuccess={async () => {
		await goto(`/mata-pelajaran/${data.mapelId}/tp-rl`, {
			invalidate: ['app:mapel_tp-rl'],
			replaceState: true
		});
	}}
>
	{#snippet children({ submitting })}
		<fieldset class="fieldset">
			<legend class="fieldset-legend">
				<code class="bg-base-200 rounded-xl px-2">Tambah Tujuan Pembelajaran</code>
			</legend>

			<legend class="fieldset-legend">Tujuan Pembelajaran </legend>
			<textarea
				class="textarea validator bg-base-200 h-28 w-full dark:border-none"
				placeholder="Ketik tujuan pembelajaran"
				name="deskripsi"
			></textarea>

			<legend class="fieldset-legend">Lingkup materi</legend>
			<textarea
				class="textarea validator bg-base-200 h-28 w-full dark:border-none"
				placeholder="Ketik lingkup materi"
				name="lingkupMateri"
			></textarea>

			<div class="mt-4 flex justify-end gap-2">
				<button type="button" class="btn shadow-none" onclick={() => history.back()}>
					<Icon name="close-sm" />
					Batal
				</button>

				<button type="submit" class="btn btn-primary shadow-none" disabled={submitting}>
					{#if submitting}
						<div class="loading loading-spinner"></div>
					{:else}
						<Icon name="save" />
					{/if}
					Simpan
				</button>
			</div>
		</fieldset>
	{/snippet}
</FormEnhance>
