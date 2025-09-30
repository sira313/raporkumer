<script lang="ts">
	import { goto, invalidate } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { agamaMapelNames, agamaParentName, jenisMapel } from '$lib/statics';

	const AGAMA_MAPEL_NAME_SET = new Set<string>(agamaMapelNames);

	let { data }: { data: any } = $props();
	const mode: 'add' | 'edit' = data?.mode === 'edit' ? 'edit' : 'add';
	const mapel = (data?.mapel as (MataPelajaran & { kelas?: Kelas | null }) | undefined) ?? null;
	const kelasAktif = data?.kelasAktif ?? mapel?.kelas ?? null;
	const kelasAktifLabel = kelasAktif
		? kelasAktif.fase
			? `${kelasAktif.nama} - ${kelasAktif.fase}`
			: kelasAktif.nama
		: 'Belum ada kelas aktif';
	const isAgamaGroup = !!mapel && AGAMA_MAPEL_NAME_SET.has(mapel.nama);
	const isAgamaParent = !!mapel && mapel.nama === agamaParentName;
	const disableNama = !kelasAktif || (mode === 'edit' && isAgamaGroup);
	const disableJenis = !kelasAktif || (mode === 'edit' && isAgamaGroup);
	const formAction = mode === 'edit' ? '?/update' : '?/add';
	const invalidateTargets = mode === 'edit' ? ['app:mapel', 'app:mapel_tp-rl'] : ['app:mapel'];
	const formInit = mode === 'edit' && mapel
		? {
			nama: mapel.nama,
			kkm: mapel.kkm ?? '',
			jenis: mapel.jenis
		}
		: undefined;
	const heading = mode === 'edit' ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran';
</script>

<FormEnhance
	action={formAction}
	init={formInit}
	onsuccess={async () => {
		await Promise.all(invalidateTargets.map((token) => invalidate(token)));
		if (typeof window !== 'undefined' && window.history?.state?.modal) {
			history.back();
		} else {
			await goto('/intrakurikuler', { replaceState: true });
		}
	}}
>
 	{#snippet children({ submitting, invalid })}
		<p class="mb-6 text-xl font-bold">{heading}</p>
		{#if !kelasAktif}
			<div class="alert bg-warning/10 border border-dashed border-warning text-warning-content mb-4 flex items-center gap-2">
				<Icon name="info" />
				<span>Pilih kelas di navbar sebelum {mode === 'edit' ? 'mengubah' : 'menambah'} mata pelajaran.</span>
			</div>
		{/if}
		{#if mode === 'edit'}
			<input name="id" value={mapel?.id ?? ''} hidden />
		{/if}
		{#if mode === 'edit' && disableNama}
			<input name="nama" value={mapel?.nama ?? ''} hidden />
		{/if}
		{#if mode === 'edit' && disableJenis}
			<input name="jenis" value={mapel?.jenis ?? ''} hidden />
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
			disabled={disableNama}
		/>
		<legend class="fieldset-legend">KKM</legend>
		<input
			type="number"
			class="input validator bg-base-200 w-full dark:border-none"
			placeholder="Contoh: 76"
			name="kkm"
			required
			disabled={!kelasAktif}
			min="0"
		/>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Jenis Mata Pelajaran</legend>
			<select class="select bg-base-200 w-full dark:border-none" name="jenis" required disabled={disableJenis}>
				<option disabled selected>Pilih Jenis Mata Pelajaran</option>
				{#each Object.entries(jenisMapel) as [value, label] (value)}
					<option {value}>{label}</option>
				{/each}
			</select>
		</fieldset>
		{#if mode === 'edit' && isAgamaParent}
			<p class="mt-2 text-sm text-base-content/70">
				Perubahan KKM akan diterapkan ke semua varian mata pelajaran Pendidikan Agama dan Budi Pekerti.
			</p>
		{/if}
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
