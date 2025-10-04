<script lang="ts">
	import { invalidate } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { jenisKelamin } from '$lib/statics';

	let { data } = $props();
	let activeTab = $state(0);
</script>

<FormEnhance
	action="?/save"
	init={data.murid}
	onsuccess={async () => {
		await invalidate('app:murid');
		history.back();
	}}
>
	{#snippet children({ submitting, invalid })}
		<p class="mb-6 text-xl font-bold">
			{data.murid?.id ? 'Formulir Edit Murid Manual' : 'Formulir Tambah Murid Manual'}
		</p>
		<div class="max-h-[60vh] overflow-y-auto sm:max-h-none sm:overflow-y-visible">
			<!-- Tab Isian -->
			<div class="tabs tabs-box">
				<!-- data Murid -->
				<input type="radio" bind:group={activeTab} value={0} class="tab" aria-label="Data Murid" />
				<div class="tab-content bg-base-100 p-4">
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- NIS -->
						<div class="flex-1">
							<legend class="fieldset-legend">NIS</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Contoh: 0030"
								name="nis"
							/>
						</div>
						<!-- NISN -->
						<div class="flex-1">
							<legend class="fieldset-legend">NISN</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Contoh: 8371612"
								name="nisn"
							/>
						</div>
					</div>

					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Nama Murid -->
						<div class="flex-1">
							<legend class="fieldset-legend">Nama Murid</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Chairil Anwar"
								name="nama"
							/>
						</div>

						<!-- Kelas -->
						<div class="flex-1">
							<legend class="fieldset-legend">Kelas</legend>
							<select
								class="select bg-base-200 dark:border-none"
								title="Pilih kelas"
								name="kelasId"
								required
							>
								<option value="" disabled selected> Pilih Kelas </option>
								{#each data.daftarKelas as kelas (kelas.id)}
									<option value={kelas.id}>
										{kelas.nama} &bullet; {kelas.fase}
									</option>
								{:else}
									<option value="" disabled selected> Belum ada data kelas </option>
								{/each}
							</select>
						</div>
					</div>

					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Tempat lahir -->
						<div class="flex-1">
							<legend class="fieldset-legend">Tempat Lahir</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Kembayan"
								name="tempatLahir"
							/>
						</div>
						<!-- Tanggal Lahir -->
						<div class="flex-1">
							<legend class="fieldset-legend">Tanggal Lahir</legend>
							<input
								type="date"
								class="input validator bg-base-200 w-full dark:border-none"
								name="tanggalLahir"
								required
							/>
						</div>
					</div>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Jenis Kelamin -->
						<div class="flex-1">
							<legend class="fieldset-legend">Jenis Kelamin</legend>
							<select
								class="select validator bg-base-200 w-full dark:border-none"
								name="jenisKelamin"
								required
							>
								<option value="" disabled selected>Pilih Jenis Kelamin</option>
								{#each Object.entries(jenisKelamin) as [value, label] (value)}
									<option {value}>{label}</option>
								{/each}
							</select>
						</div>
						<!-- Agama -->
						<div class="flex-1">
							<legend class="fieldset-legend">Agama</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Islam"
								name="agama"
							/>
						</div>
					</div>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Pendidikan Sebelumnya -->
						<div class="flex-1">
							<legend class="fieldset-legend">Pendidikan Sebelumnya</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Contoh: TK Kencana Pertiwi"
								name="pendidikanSebelumnya"
							/>
						</div>
						<!-- Tanggal Masuk Sekolah Ini -->
						<div class="flex-1">
							<legend class="fieldset-legend">Tanggal masuk sekolah ini</legend>
							<input
								type="date"
								class="input validator bg-base-200 w-full dark:border-none"
								name="tanggalMasuk"
								required
							/>
						</div>
					</div>
				</div>

				<!-- data Orang Tua -->
				<input
					type="radio"
					bind:group={activeTab}
					value={1}
					class="tab"
					aria-label="Data Orang Tua"
				/>
				<div class="tab-content bg-base-100 p-4">
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Nama Ayah -->
						<div class="flex-1">
							<legend class="fieldset-legend">Nama Ayah</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Agus"
								name="ayah.nama"
							/>
						</div>
						<!-- Nama Ibu -->
						<div class="flex-1">
							<legend class="fieldset-legend">Nama Ibu</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Ratih"
								name="ibu.nama"
							/>
						</div>
					</div>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Pekerjaan Ayah -->
						<div class="flex-1">
							<legend class="fieldset-legend">Pekerjaan Ayah</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Tani"
								name="ayah.pekerjaan"
							/>
						</div>
						<!-- Pekerjaan Ibu -->
						<div class="flex-1">
							<legend class="fieldset-legend">Pekerjaan Ibu</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Contoh: IRT"
								name="ibu.pekerjaan"
							/>
						</div>
					</div>
					<!-- Kontak -->
					<legend class="fieldset-legend">Kontak</legend>
					<input
						required
						type="text"
						class="input validator bg-base-200 w-full dark:border-none"
						placeholder="Nomor telepon atau WhatsApp"
						name="ayah.kontak"
					/>
				</div>

				<!-- data Alamat Murid -->
				<input
					type="radio"
					bind:group={activeTab}
					value={2}
					class="tab"
					aria-label="Data Alamat Murid"
				/>
				<div class="tab-content bg-base-100 p-4">
					<!-- Alamat Jalan -->
					<legend class="fieldset-legend">Jalan</legend>
					<input
						required
						type="text"
						class="input validator bg-base-200 w-full dark:border-none"
						placeholder="Contoh: Jalan Raya Noyan, Dusun Periji"
						name="alamat.jalan"
					/>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Kelurahan/Desa -->
						<div class="flex-1">
							<legend class="fieldset-legend">Kelurahan/Desa</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Sungai Dangin"
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
								placeholder="Contoh: Noyan"
								name="alamat.kecamatan"
							/>
						</div>
					</div>
					<div class="flex flex-col gap-2 sm:flex-row">
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
					</div>
				</div>

				<!-- data Wali -->
				<input
					type="radio"
					bind:group={activeTab}
					value={3}
					class="tab"
					aria-label="Data Wali (Opsional)"
				/>
				<div class="tab-content bg-base-100 p-4">
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Nama Wali -->
						<div class="flex-1">
							<legend class="fieldset-legend">Nama Wali</legend>
							<input
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Hendra"
								name="wali.nama"
							/>
						</div>
						<!-- Pekerjaan Wali -->
						<div class="flex-1">
							<legend class="fieldset-legend">Pekerjaan Wali</legend>
							<input
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Contoh: PNS"
								name="wali.pekerjaan"
							/>
						</div>
					</div>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Alamat Wali -->
						<div class="flex-1">
							<legend class="fieldset-legend">Alamat Wali</legend>
							<input
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Jalan Raya Noyan, Dusun Periji"
								name="wali.alamat"
							/>
						</div>
						<!-- Kontak Wali -->
						<div class="flex-1">
							<legend class="fieldset-legend">Kontak</legend>
							<input
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Nomor telepon atau WhatsApp"
								name="wali.kontak"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="border-base-200 mt-4 flex flex-col gap-2 sm:flex-row">
			<button class="btn border-none shadow-none" type="button" onclick={() => history.back()}>
				<Icon name="close-sm" />
				Batal
			</button>

			{#if invalid}
				<button
					class="btn btn-neutral border-none shadow-none"
					type="button"
					onclick={() => (activeTab = (activeTab + 1) % 4)}
				>
					<Icon name="double-arrow" class="h-4 w-4" />
					Selanjutnya
				</button>
			{/if}

			<button
				class="btn {data.murid?.id ? 'btn-secondary' : 'btn-primary'} border-none shadow-none sm:ml-auto"
				type="submit"
				disabled={submitting || invalid}
			>
				{#if submitting}
					<span class="loading loading-spinner"></span>
				{:else}
					<Icon name="save" />
				{/if}
				Simpan
			</button>
		</div>
	{/snippet}
</FormEnhance>
