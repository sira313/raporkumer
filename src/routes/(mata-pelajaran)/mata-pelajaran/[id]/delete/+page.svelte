<script lang>
	import { goto } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { jenisMapel } from '$lib/statics.js';

	let { data } = $props();
</script>

<FormEnhance
	action="?/delete"
	onsuccess={() => goto('/mata-pelajaran', { invalidate: ['app:mapel_tp-rl'] })}
>
	{#snippet children({ submitting })}
		<p>Hapus data Mata Pelajaran:</p>
		<p>Nama: {data.mapel.nama}</p>
		<p>KKM: {data.mapel.kkm}</p>
		<p>Jenis: {jenisMapel[data.mapel.jenis]}</p>

		<div class="flex gap-3">
			<button class="btn" type="button" onclick={() => history.back()}>
				<Icon name="close" />
				Batal
			</button>

			<button class="btn btn-error" disabled={submitting}>
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
