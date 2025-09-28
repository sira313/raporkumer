<script lang="ts">
	import { goto } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { jenisMapel } from '$lib/statics';

	let { data } = $props();
	let selectedKelasId = $state();
</script>

<FormEnhance
	action="?/add"
	onsuccess={async () => {
		await goto(`/intrakurikuler?kelas_id=${selectedKelasId}`, {
			invalidate: ['app:mapel']
		});
	}}
>
	{#snippet children({ submitting })}
		<p class="mb-6 text-xl font-bold">Tambah Mata Pelajaran</p>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Kelas</legend>
			<select
				class="select bg-base-200 w-full dark:border-none"
				name="kelasId"
				bind:value={selectedKelasId}
				required
			>
				<option disabled selected>Pilih Kelas</option>
				{#each data.daftarKelas as kelas (kelas.id)}
					<option value={kelas.id}>Kelas: {kelas.nama} - Fase: {kelas.fase}</option>
				{/each}
			</select>
		</fieldset>
		<legend class="fieldset-legend">Nama Mata Pelajaran</legend>
		<input
			type="text"
			class="input validator bg-base-200 w-full dark:border-none"
			placeholder="Contoh: IPAS"
			name="nama"
			required
		/>
		<legend class="fieldset-legend">KKM</legend>
		<input
			type="number"
			class="input validator bg-base-200 w-full dark:border-none"
			placeholder="Contoh: 76"
			name="kkm"
			required
		/>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Jenis Mata Pelajaran</legend>
			<select class="select bg-base-200 w-full dark:border-none" name="jenis" required>
				<option disabled selected>Pilih Jenis Mata Pelajaran</option>
				{#each Object.entries(jenisMapel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</select>
		</fieldset>
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
	{/snippet}
</FormEnhance>
