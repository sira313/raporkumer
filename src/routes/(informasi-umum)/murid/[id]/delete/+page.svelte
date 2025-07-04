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
		<p>Hapus data murid:</p>
		<p>NIS: {data.murid.nis}</p>
		<p>NISN: {data.murid.nisn}</p>
		<p>Nama: {data.murid.nama}</p>

		<div class="flex gap-3">
			<a class="btn" href="/murid">
				<Icon name="close" />
				Batal
			</a>

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
