<script lang>
	import { invalidate } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';

	let { data } = $props();
</script>

<FormEnhance
	action="?/delete"
	onsuccess={async () => {
		await invalidate('app:murid');
		history.back();
	}}
>
	{#snippet children({ submitting })}
		<h3 class="mb-4 text-xl font-bold">Hapus data murid?</h3>
		<p>NIS: {data.murid.nis}</p>
		<p>NISN: {data.murid.nisn}</p>
		<p>Nama: <b>{data.murid.nama}</b></p>

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
