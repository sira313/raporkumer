<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { hideModal } from '$lib/components/global-modal.svelte';
</script>

<div role="alert" class="alert alert-warning alert-soft mb-3">
	<Icon name="warning" />
	<span>
		Data wali kelas yang terisi otomatis dari dapodik akan terhapus dan bapak/ibu harus mengisi
		manual (khusus guru yang belum ada di dapodik). Konfirmasi?
	</span>
</div>

<FormEnhance
	id="reset-walas-form"
	action="?/reset-walas"
	onsuccess={async () => {
		await invalidate('app:kelas');
		/* eslint-disable-next-line svelte/no-navigation-without-resolve -- kembali ke daftar kelas setelah reset */
		await goto('/kelas');
		hideModal();
	}}
>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">Nama Guru</legend>
		<input
			required
			type="text"
			class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
			placeholder="Contoh: Bruce Wayne, Bat"
			name="namaGuru"
			autocomplete="off"
		/>
	</fieldset>
</FormEnhance>
