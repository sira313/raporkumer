<script lang>
	import { goto } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { jenisMapel } from '$lib/statics.js';

	let { data } = $props();
</script>

<FormEnhance
	action="?/delete"
	onsuccess={() => goto('/intrakurikuler', { invalidate: ['app:mapel_tp-rl'] })}
>
	{#snippet children({ submitting })}
		<h3 class="mb-4 text-xl font-bold">Hapus data mata pelajaran:</h3>
		<p>Nama: {data.mapel.nama}</p>
		<p>KKM: {data.mapel.kkm}</p>
		<p>Jenis: {jenisMapel[data.mapel.jenis]}</p>

		<div class="mt-4 flex justify-end gap-2">
			<button class="btn shadow-none" type="button" onclick={() => history.back()}>
				<Icon name="close" />
				Batal
			</button>

			<button class="btn btn-error btn-soft shadow-none" disabled={submitting}>
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
