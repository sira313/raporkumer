<script lang="ts">
	import { toast } from '$lib/components/toast/state.svelte';
	import db from '$lib/data/db';
	import { flatten, populateForm, unflatten } from '$lib/utils';
	import { onMount } from 'svelte';

	const uid = $props.id();

	let { onDismiss, murid }: { onDismiss: () => void; murid?: Murid } = $props();
	let activeTab = $state<'murid' | 'orangTua' | 'alamat' | 'wali'>('murid');
	let nis = $state('');
	let saving = $state(false);
	let existingMuridNis = $state('');

	async function save(e: FormSubmitEvent) {
		e.preventDefault();
		try {
			saving = true;
			const formData = new FormData(e.currentTarget);

			if (existingMuridNis) {
				const partialMurid = unflatten<Partial<Murid>>(Object.fromEntries(formData.entries()));
				const murid = await db.murid.get(existingMuridNis);
				if (murid) {
					const muridToSave = { ...murid, ...partialMurid };
					const result = await db.murid.put(muridToSave, murid.nis);
					existingMuridNis = result;
				}
			} else {
				const murid = unflatten<Murid>(Object.fromEntries(formData.entries()));
				const result = await db.murid.add(murid);
				existingMuridNis = result;
			}
			toast('Data murid berhasil disimpan', 'success');
		} catch (error) {
			console.error(error);
			toast('Gagal menyimpan data murid', 'error');
		} finally {
			saving = false;
		}
	}

	async function load() {
		if (!murid) return;
		nis = murid.nis;
		existingMuridNis = murid.nis;
		const flatMurid = flatten(murid);
		for (const id of ['murid', 'orangTua', 'alamat', 'wali']) {
			const formId = `form-${uid}__${id}`;
			const form = <HTMLFormElement>document.getElementById(formId);
			populateForm(form, flatMurid);
		}
	}

	onMount(() => {
		load();
	});
</script>

<dialog class="modal" onclose={() => onDismiss()} open>
	<fieldset class="fieldset modal-box p-4 sm:w-full sm:max-w-2xl">
		<legend class="fieldset-legend">
			<pre class="bg-base-200 rounded-xl px-2">{existingMuridNis
					? 'Formulir Edit Murid Manual'
					: 'Formulir Tambah Murid Manual'}</pre>
		</legend>
		<div class="max-h-[60vh] overflow-y-auto sm:max-h-none sm:overflow-y-visible">
			<!-- Tab Isian -->
			<div class="tabs tabs-box">
				<!-- data Murid -->
				<input
					type="radio"
					bind:group={activeTab}
					value="murid"
					class="tab"
					aria-label="Data Murid"
					checked
				/>
				<form id="form-{uid}__murid" class="tab-content bg-base-100 p-4" onsubmit={save}>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- NIS -->
						<div class="flex-1">
							<legend class="fieldset-legend">NIS</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Contoh: 0030"
								bind:value={nis}
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
					<!-- Nama Murid -->
					<legend class="fieldset-legend">Nama Murid</legend>
					<input
						required
						type="text"
						class="input validator bg-base-200 w-full dark:border-none"
						placeholder="Contoh: Chairil Anwar"
						name="nama"
					/>
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
								<option>Laki-laki</option>
								<option>Perempuan</option>
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
				</form>

				<!-- data Orang Tua -->
				<input
					type="radio"
					bind:group={activeTab}
					value="orangTua"
					class="tab"
					aria-label="Data Orang Tua"
					disabled={!existingMuridNis}
				/>
				<form id="form-{uid}__orangTua" class="tab-content bg-base-100 p-4" onsubmit={save}>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Nama Ayah -->
						<div class="flex-1">
							<legend class="fieldset-legend">Nama Ayah</legend>
							<input
								required
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Agus"
								name="orangTua.namaAyah"
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
								name="orangTua.namaIbu"
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
								name="orangTua.pekerjaanAyah"
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
								name="orangTua.pekerjaanIbu"
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
						name="orangTua.kontak"
					/>
				</form>

				<!-- data Alamat Murid -->
				<input
					type="radio"
					bind:group={activeTab}
					value="alamat"
					class="tab"
					aria-label="Data Alamat Murid"
					disabled={!existingMuridNis}
				/>
				<form id="form-{uid}__alamat" class="tab-content bg-base-100 p-4" onsubmit={save}>
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
				</form>

				<!-- data Wali -->
				<input
					type="radio"
					bind:group={activeTab}
					value="wali"
					class="tab"
					aria-label="Data Wali"
					disabled={!existingMuridNis}
				/>
				<form id="form-{uid}__wali" class="tab-content bg-base-100 p-4" onsubmit={save}>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Nama Wali -->
						<div class="flex-1">
							<legend class="fieldset-legend">Nama Wali</legend>
							<input
								required
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
								required
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
								required
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
								required
								type="text"
								class="input validator bg-base-200 w-full dark:border-none"
								placeholder="Nomor telepon atau WhatsApp"
								name="wali.kontak"
							/>
						</div>
					</div>
				</form>
			</div>
		</div>
		<div class="border-base-200 mt-4 flex flex-col gap-2 sm:flex-row">
			<button class="btn border-none shadow-none" onclick={() => onDismiss()}>Batal</button>
			<button
				class="btn {existingMuridNis
					? 'btn-secondary'
					: 'btn-primary'} border-none shadow-none sm:ml-auto"
				form="form-{uid}__{activeTab}"
				disabled={!nis || saving}
			>
				{#if saving}
					<span class="loading loading-spinner"></span>
				{/if}
				Simpan
			</button>
		</div>
	</fieldset>
</dialog>
