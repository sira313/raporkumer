<script lang="ts">
	import { goto } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { jenisMapel } from '$lib/statics';

	let { data } = $props();
	const kelasAktif = $derived.by(() => data.kelasAktif ?? null);
	const kelasAktifLabel = $derived.by(() => {
		if (!kelasAktif) return 'Belum ada kelas aktif';
		return kelasAktif.fase ? `${kelasAktif.nama} - ${kelasAktif.fase}` : kelasAktif.nama;
	});
</script>

<FormEnhance
	action="?/add"
	onsuccess={async () => {
		await goto(`/intrakurikuler`, { invalidate: ['app:mapel'] });
	}}
>
 	{#snippet children({ submitting, invalid })}
		<p class="mb-6 text-xl font-bold">Tambah Mata Pelajaran</p>
		{#if !kelasAktif}
			<div class="alert bg-warning/10 border border-dashed border-warning text-warning-content mb-4 flex items-center gap-2">
				<Icon name="info" />
				<span>Pilih kelas di navbar sebelum menambah mata pelajaran.</span>
			</div>
		{/if}
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Kelas Aktif</legend>
			<div class="bg-base-200 dark:bg-base-300 rounded-lg px-3 py-2 text-base-content/80">
				{kelasAktifLabel}
			</div>
		</fieldset>
		<legend class="fieldset-legend">Nama Mata Pelajaran</legend>
		<input
			type="text"
			class="input validator bg-base-200 w-full dark:border-none"
			placeholder="Contoh: IPAS"
			name="nama"
			required
			disabled={!kelasAktif}
		/>
		<legend class="fieldset-legend">KKM</legend>
		<input
			type="number"
			class="input validator bg-base-200 w-full dark:border-none"
			placeholder="Contoh: 76"
			name="kkm"
			required
			disabled={!kelasAktif}
		/>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Jenis Mata Pelajaran</legend>
			<select class="select bg-base-200 w-full dark:border-none" name="jenis" required disabled={!kelasAktif}>
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
			<button
				type="submit"
				class="btn btn-primary shadow-none"
				disabled={submitting || invalid || !kelasAktif}
			>
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
