<script lang>
	import { goto } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';

	let { data } = $props();
</script>

<FormEnhance
	action="?/delete"
	onsuccess={async () => await goto('/murid', { invalidate: ['app:murid'] })}
>
	{#snippet children({ submitting })}
		<h3 class="mb-4 text-xl font-bold">Hapus data murid?</h3>
		<p>NIS: {data.murid.nis}</p>
		<p>NISN: {data.murid.nisn}</p>
		<p>Nama: <b>{data.murid.nama}</b></p>

		<div class="mt-4 flex justify-end gap-2">
			<a class="btn shadow-none" href="/murid">
				<Icon name="close" />
				Batal
			</a>

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
