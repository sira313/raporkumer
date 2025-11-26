<script lang="ts">
	import { invalidate } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { jenisKelamin } from '$lib/statics';

	import { onDestroy } from 'svelte';
	let { data } = $props();
	let activeTab = $state(0);
	let fotoPreview = $state<string | null>(
		data.murid?.foto ? `/api/murid-photo/${data.murid.id}` : null
	);
	let deleting = $state(false);

	function handleFotoChange(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) {
			fotoPreview = null;
			return;
		}
		const allowed = ['image/png', 'image/jpeg'];
		if (!allowed.includes(file.type)) {
			input.value = '';
			alert('Format file tidak didukung; hanya JPG dan PNG yang diizinkan');
			fotoPreview = null;
			return;
		}
		if (file.size > 500 * 1024) {
			input.value = '';
			alert('Ukuran file foto tidak boleh lebih dari 500KB');
			fotoPreview = null;
			return;
		}
		const reader = new FileReader();
		reader.onload = () => (fotoPreview = reader.result as string);
		reader.readAsDataURL(file);
	}

	async function deleteFoto() {
		if (!data.murid?.id) return;
		if (!confirm('Hapus foto murid? Tindakan ini tidak dapat dibatalkan.')) return;
		deleting = true;
		try {
			const res = await fetch(`/api/murid-photo/${data.murid.id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error(await res.text());
			// update UI
			fotoPreview = null;
			if (data.murid) data.murid.foto = null;
			// clear file input if present
			const input = document.querySelector<HTMLInputElement>('input[name="foto"]');
			if (input) input.value = '';
			// refresh parent lists if needed
			await invalidate('app:murid');
			alert('Foto berhasil dihapus');
		} catch (err) {
			console.error(err);
			alert('Gagal menghapus foto');
		} finally {
			deleting = false;
		}
	}
</script>

<FormEnhance
	action="?/save"
	enctype="multipart/form-data"
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
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">NIS</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: 0030"
								name="nis"
							/>
						</fieldset>
						<!-- NISN -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">NISN</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: 8371612"
								name="nisn"
							/>
						</fieldset>
					</div>

					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Nama Murid -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Nama Murid</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: Chairil Anwar"
								name="nama"
							/>
						</fieldset>

						<!-- Kelas -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Kelas</legend>
							<select
								class="select bg-base-200 dark:bg-base-300 dark:border-none"
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
						</fieldset>
					</div>

					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Tempat lahir -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Tempat Lahir</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: Kembayan"
								name="tempatLahir"
							/>
						</fieldset>
						<!-- Tanggal Lahir -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Tanggal Lahir</legend>
							<input
								type="date"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								name="tanggalLahir"
								required
							/>
						</fieldset>
					</div>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Jenis Kelamin -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Jenis Kelamin</legend>
							<select
								class="select validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								name="jenisKelamin"
								required
							>
								<option value="" disabled selected>Pilih Jenis Kelamin</option>
								{#each Object.entries(jenisKelamin) as [value, label] (value)}
									<option {value}>{label}</option>
								{/each}
							</select>
						</fieldset>
						<!-- Agama -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Agama</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: Islam"
								name="agama"
							/>
						</fieldset>
					</div>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Pendidikan Sebelumnya -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Pendidikan Sebelumnya</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: TK Kencana Pertiwi"
								name="pendidikanSebelumnya"
							/>
						</fieldset>
						<!-- Tanggal Masuk Sekolah Ini -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Tanggal masuk sekolah ini</legend>
							<input
								type="date"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								name="tanggalMasuk"
								required
							/>
						</fieldset>
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
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Nama Ayah</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: Agus"
								name="ayah.nama"
							/>
						</fieldset>
						<!-- Nama Ibu -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Nama Ibu</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: Ratih"
								name="ibu.nama"
							/>
						</fieldset>
					</div>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Pekerjaan Ayah -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Pekerjaan Ayah</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: Tani"
								name="ayah.pekerjaan"
							/>
						</fieldset>
						<!-- Pekerjaan Ibu -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Pekerjaan Ibu</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: IRT"
								name="ibu.pekerjaan"
							/>
						</fieldset>
					</div>
					<!-- Kontak -->
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Kontak</legend>
						<input
							required
							type="text"
							class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
							placeholder="Nomor telepon atau WhatsApp"
							name="ayah.kontak"
						/>
					</fieldset>
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
					<fieldset class="fieldset">
						<legend class="fieldset-legend">Jalan</legend>
						<input
							required
							type="text"
							class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
							placeholder="Contoh: Jalan Raya Noyan, Dusun Periji"
							name="alamat.jalan"
						/>
					</fieldset>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Kelurahan/Desa -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Kelurahan/Desa</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: Sungai Dangin"
								name="alamat.desa"
							/>
						</fieldset>
						<!-- Kecamatan -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Kecamatan</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: Noyan"
								name="alamat.kecamatan"
							/>
						</fieldset>
					</div>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Kabupaten -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Kabupaten</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: Sanggau"
								name="alamat.kabupaten"
							/>
						</fieldset>
						<!-- Provinsi -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Provinsi</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: Kalimantan Barat"
								name="alamat.provinsi"
							/>
						</fieldset>
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
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Nama Wali</legend>
							<input
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: Hendra"
								name="wali.nama"
							/>
						</fieldset>
						<!-- Pekerjaan Wali -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Pekerjaan Wali</legend>
							<input
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: PNS"
								name="wali.pekerjaan"
							/>
						</fieldset>
					</div>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Alamat Wali -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Alamat Wali</legend>
							<input
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Contoh: Jalan Raya Noyan, Dusun Periji"
								name="wali.alamat"
							/>
						</fieldset>
						<!-- Kontak Wali -->
						<fieldset class="fieldset flex-1">
							<legend class="fieldset-legend">Kontak</legend>
							<input
								type="text"
								class="input validator bg-base-200 dark:bg-base-300 w-full dark:border-none"
								placeholder="Nomor telepon atau WhatsApp"
								name="wali.kontak"
							/>
						</fieldset>
					</div>
				</div>

				<!-- Foto Murid -->
				<input type="radio" bind:group={activeTab} value={4} class="tab" aria-label="Foto Murid" />
				<div class="tab-content bg-base-100 p-4">
					<div class="flex flex-col gap-4 sm:flex-row">
						<div class="flex-1 sm:max-w-xs">
							<div
								class="bg-base-200 flex aspect-3/4 w-full items-center justify-center overflow-hidden rounded-lg"
							>
								{#if fotoPreview}
									<img
										src={fotoPreview}
										alt="Preview foto murid"
										class="h-full w-full object-cover"
									/>
								{:else}
									<div class="p-4 text-center opacity-60">
										<p class="text-sm">Foto belum dipilih</p>
									</div>
								{/if}
							</div>
						</div>
						<div class="flex-1">
							<fieldset class="fieldset">
								<legend class="fieldset-legend">Upload Foto Murid</legend>
								<input
									name="foto"
									type="file"
									accept="image/png,image/jpeg"
									class="file-input file-input-ghost w-full"
									onchange={handleFotoChange}
								/>
								<p class="mt-2 text-sm text-gray-500">Maksimum ukuran 500KB. Hanya JPG / PNG.</p>
							</fieldset>
							<button
								type="button"
								class="btn btn-outline btn-error mt-2"
								onclick={deleteFoto}
								disabled={!data.murid?.foto || deleting}
								aria-label="Hapus Foto Murid"
							>
								Hapus Foto
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="border-base-200 mt-4 flex flex-col gap-2 sm:flex-row">
			<button class="btn btn-soft shadow-none" type="button" onclick={() => history.back()}>
				<Icon name="close-sm" />
				Batal
			</button>

			{#if invalid}
				<button
					class="btn btn-primary shadow-none"
					type="button"
					onclick={() => (activeTab = (activeTab + 1) % 5)}
				>
					<Icon name="double-arrow" class="h-4 w-4" />
					Selanjutnya
				</button>
			{/if}

			<button
				class="btn shadow-none {data.murid?.id ? 'btn-secondary' : 'btn-primary'} sm:ml-auto"
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
