<script lang="ts">
	import { goto } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { jenjangPendidikan } from '$lib/statics';

	let { data } = $props();
</script>

{#if data.isInit}
	<div role="alert" class="alert alert-success alert-soft mx-auto mb-4 max-w-4xl">
		<!-- TODO: sesuaikan pesan saat pertama kali setup -->
		<Icon name="info" />
		<span>Selamat datang! Pertama-tama, isi formulir sekolah terlebih dahulu!</span>
	</div>
{/if}

<FormEnhance
	action="?/save"
	init={data.sekolah}
	enctype="multipart/form-data"
	onsuccess={() => goto('/sekolah')}
>
	{#snippet children({ submitting })}
		{#if data.sekolah?.id}
			<input name="id" value={data.sekolah.id} hidden />
		{/if}

		<fieldset
			class="fieldset bg-base-100 mx-auto w-full max-w-4xl rounded-lg border border-none p-4 shadow-md"
		>
			<legend class="fieldset-legend"> Formulir Isian Data Sekolah </legend>

			<!-- Jenjang Pendidikan -->
			<legend class="fieldset-legend">Jenjang Pendidikan</legend>
			<select
				class="select bg-base-200 validator w-full border dark:border-none"
				name="jenjangPendidikan"
				required
			>
				<option value="" disabled selected>Pilih Jenjang Pendidikan</option>
				{#each Object.entries(jenjangPendidikan) as [value, label]}
					<option {value}>{label}</option>
				{/each}
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

			<div class="flex-row gap-4 lg:flex">
				<!-- Nama Kepala Sekolah -->
				<div class="flex-1">
					<legend class="fieldset-legend">Nama Kepala Sekolah</legend>
					<input
						required
						type="text"
						class="input validator bg-base-200 w-full dark:border-none"
						placeholder="Contoh: Bruce Wayne, Bat"
						name="kepalaSekolah.nama"
					/>
				</div>

				<!-- NIP Kepala Sekolah -->
				<div class="flex-1">
					<legend class="fieldset-legend">NIP Kepala Sekolah</legend>
					<input
						required
						type="text"
						class="input validator bg-base-200 w-full dark:border-none"
						placeholder="Contoh: 19700305 199309 1 009"
						name="kepalaSekolah.nip"
					/>
				</div>
			</div>

			<div class="flex-row gap-4 lg:flex">
				<!-- Alamat Sekolah -->
				<div class="flex-1">
					<legend class="fieldset-legend">Alamat Sekolah</legend>
					<input
						required
						type="text"
						class="input validator bg-base-200 w-full dark:border-none"
						placeholder="Contoh: Jalan Raya Noyan, Dusun Periji"
						name="alamat.jalan"
					/>
				</div>

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
			</div>

			<div class="flex-row gap-4 lg:flex">
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

				<!-- Kabupaten -->
				<div class="flex-1">
					<legend class="fieldset-legend">Kabupaten</legend>
					<input
						required
						type="text"
						class="input validator bg-base-200 w-full dark:border-none"
						placeholder="Contoh: Kabupaten Sanggau"
						name="alamat.kabupaten"
					/>
				</div>
			</div>

			<div class="flex-row gap-4 lg:flex">
				<!-- Provinsi -->
				<div class="flex-1">
					<legend class="fieldset-legend">Provinsi</legend>
					<input
						required
						type="text"
						class="input validator bg-base-200 w-full dark:border-none"
						placeholder="Contoh: Kalimantan Barat"
						name="alamat.provinsi"
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

			<div class="flex-row gap-4 lg:flex">
				<!-- Website Sekolah -->
				<div class="flex-1">
					<legend class="fieldset-legend">Website Sekolah</legend>
					<label class="input bg-base-200 validator w-full dark:border-none">
						<span class="label">https://</span>
						<input type="text" placeholder="Kosongkan bila tidak ada" name="website" />
					</label>
				</div>

				<!-- Email Sekolah -->
				<div class="flex-1">
					<legend class="fieldset-legend">Email Sekolah</legend>
					<input
						required
						type="text"
						class="input validator bg-base-200 w-full dark:border-none"
						placeholder="Contoh: cs@sdn19periji.sch.id"
						name="email"
					/>
				</div>
			</div>

			<!-- Upload logo sekolah -->
			<legend class="fieldset-legend">Logo Sekolah</legend>
			<input type="file" class="file-input file-input-ghost" accept="image/*" name="logo" />
			<p class="label">Format png, tanpa latar belakang, maksimal 300KB</p>

			<!-- Save -->
			<button class="btn btn-primary ml-auto shadow-none" disabled={submitting}>
				{#if submitting}
					<span class="loading loading-spinner"></span>
				{/if}
				<Icon name="save" />
				Simpan
			</button>
		</fieldset>
	{/snippet}
</FormEnhance>
