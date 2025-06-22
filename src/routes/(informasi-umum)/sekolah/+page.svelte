<script lang="ts">
	import db from '$lib/data/db';
	import { setPageLogo } from '$lib/state.svelte';
	import { flatten, populateForm, unflatten } from '$lib/utils';
	import { onMount } from 'svelte';

	// TODO: replace alert() with Toast

	let form: HTMLFormElement;

	let loading = $state(false);
	let saving = $state(false);

	async function load() {
		try {
			loading = true;
			const sekolah = await db.sekolah.get(1);
			if (!sekolah) return;
			populateForm(form, flatten(sekolah));
		} catch (error) {
			alert(`Gagal memuat:` + JSON.stringify(error));
		} finally {
			loading = false;
		}
	}

	async function save(e: FormSubmitEvent) {
		e.preventDefault();
		try {
			saving = true;
			const formData = new FormData(e.currentTarget);
			const sekolah = unflatten<Sekolah>(Object.fromEntries(formData.entries()));
			sekolah.id = 1;
			await db.sekolah.put(sekolah);
			setPageLogo(sekolah.logo);
			alert('Data sekolah tersimpan');
		} catch (error) {
			alert(`Gagal simpan: ` + JSON.stringify(error));
		} finally {
			saving = false;
		}
	}

	onMount(() => {
		load();
	});
</script>

<form bind:this={form} onsubmit={save}>
	<fieldset class="fieldset bg-base-100 w-full rounded-lg border border-none p-4 shadow-md">
		<legend class="fieldset-legend">
			Formulir Isian Data Sekolah
			{#if loading}
				<em class="opacity-50">Loading...</em>
			{/if}
		</legend>

		<!-- Jenjang Pendidikan -->
		<legend class="fieldset-legend">Jenjang Pendidikan</legend>
		<select
			class="select bg-base-200 validator w-full border dark:border-none"
			name="jenjangSekolah"
			required
		>
			<option value="" disabled selected>Pilih Jenjang Pendidikan</option>
			<option>SD (Sekolah Dasar)</option>
			<option>SMP (Sekolah Menengah Pertama)</option>
			<option>SMA (Sekolah Menengah Atas)</option>
		</select>

		<div class="flex-row gap-4 lg:flex">
			<!-- Nama Sekolah -->
			<div class="flex-1">
				<legend class="fieldset-legend">Nama Sekolah</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: SD Negeri 19 Periji"
					name="nama"
				/>
			</div>

			<!-- NPSN -->
			<div class="flex-1">
				<legend class="fieldset-legend">NPSN</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: 69856875"
					name="npsn"
				/>
			</div>
		</div>

		<!-- Alamat Sekolah -->
		<legend class="fieldset-legend">Alamat Sekolah</legend>
		<input
			required
			type="text"
			class="input validator bg-base-200 w-full dark:border-none"
			placeholder="Contoh: Jalan Raya Noyan, Dusun Periji"
			name="alamat.jalan"
		/>

		<div class="flex-row gap-4 lg:flex">
			<!-- Nama desa atau kelurahan -->
			<div class="flex-1">
				<legend class="fieldset-legend">Desa atau Kelurahan</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: Desa Sungai Dangin atau Kelurahan Sungai Sengkuang"
					name="alamat.desa"
				/>
			</div>

			<!-- Kecamatan -->
			<div class="flex-1">
				<legend class="fieldset-legend">Kecamatan</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: Kecamatan Noyan"
					name="alamat.kecamatan"
				/>
			</div>
		</div>

		<div class="flex-row gap-4 lg:flex">
			<!-- Kabupaten -->
			<div class="flex-1">
				<legend class="fieldset-legend">Kabupaten</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: Sanggau"
					name="alamat.kabupaten"
				/>
			</div>

			<!-- Kode Pos -->
			<div class="flex-1">
				<legend class="fieldset-legend">Kode POS</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: 78554"
					name="alamat.kodePos"
				/>
			</div>
		</div>

		<!-- Upload logo sekolah -->
		<legend class="fieldset-legend">Logo Sekolah</legend>
		<input type="file" class="file-input file-input-ghost" accept="image/*" name="logo" />
		<p class="label">Format png, tanpa latar belakang, maksimal 300KB</p>

		<!-- Save -->
		<button class="btn btn-primary ml-auto shadow-none" disabled={saving || loading}>
			{#if saving}
				<span class="loading loading-spinner"></span>
			{/if}
			Simpan
		</button>
	</fieldset>
</form>
