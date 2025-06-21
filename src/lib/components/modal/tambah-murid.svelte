<script lang="ts">
	export let open = false;
	export let onClose: () => void = () => {};
	let dialogRef: HTMLDialogElement;

	$: if (open && dialogRef) dialogRef.showModal();
	$: if (!open && dialogRef) dialogRef.close();

	function handleBatal() {
		onClose();
	}
</script>

<dialog bind:this={dialogRef} class="modal" on:close={onClose}>
	<fieldset class="fieldset modal-box p-4 sm:w-full sm:max-w-2xl">
		<legend class="fieldset-legend">
			<pre class="bg-base-200 rounded-xl px-2">Formulir Tambah Murid Manual</pre>
		</legend>
		<div class="max-h-[60vh] overflow-y-auto sm:max-h-none sm:overflow-y-visible">
			<!-- Tab Isian -->
			<div class="tabs tabs-box">
				<!-- data Murid -->
				<input type="radio" name="my_tabs_3" class="tab" aria-label="Data Murid" checked />
				<div class="tab-content bg-base-100 p-4">
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- NIS -->
						<div class="flex-1">
							<legend class="fieldset-legend">NIS</legend>
							<input
								required
								type="text"
								class="input bg-base-200 w-full dark:border-none"
								placeholder="Contoh: 0030"
							/>
						</div>
						<!-- NISN -->
						<div class="flex-1">
							<legend class="fieldset-legend">NISN</legend>
							<input
								required
								type="text"
								class="input bg-base-200 w-full dark:border-none"
								placeholder="Contoh: 8371612"
							/>
						</div>
					</div>
					<!-- Nama Murid -->
					<legend class="fieldset-legend">Nama Murid</legend>
					<input
						required
						type="text"
						class="input bg-base-200 w-full dark:border-none"
						placeholder="Contoh: Chairil Anwar"
					/>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Tempat lahir -->
						<div class="flex-1">
							<legend class="fieldset-legend">Tempat Lahir</legend>
							<input
								required
								type="text"
								class="input bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Kembayan"
							/>
						</div>
						<!-- Tanggal Lahir -->
						<div class="flex-1">
							<legend class="fieldset-legend">Tanggal Lahir</legend>
							<input type="date" class="input bg-base-200 w-full dark:border-none" />
						</div>
					</div>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Jenis Kelamin -->
						<div class="flex-1">
							<legend class="fieldset-legend">Jenis Kelamin</legend>
							<select class="select bg-base-200 w-full dark:border-none">
								<option disabled selected>Pilih Jenis Kelamin</option>
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
								class="input bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Islam"
							/>
						</div>
					</div>
				</div>
				<!-- data Orang Tua -->
				<input type="radio" name="my_tabs_3" class="tab" aria-label="Data Orang Tua" />
				<div class="tab-content bg-base-100 p-4">
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Nama Ayah -->
						<div class="flex-1">
							<legend class="fieldset-legend">Nama Ayah</legend>
							<input
								required
								type="text"
								class="input bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Agus"
							/>
						</div>
						<!-- Nama Ibu -->
						<div class="flex-1">
							<legend class="fieldset-legend">Nama Ibu</legend>
							<input
								required
								type="text"
								class="input bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Ratih"
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
								class="input bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Tani"
							/>
						</div>
						<!-- Pekerjaan Ibu -->
						<div class="flex-1">
							<legend class="fieldset-legend">Pekerjaan Ibu</legend>
							<input
								required
								type="text"
								class="input bg-base-200 w-full dark:border-none"
								placeholder="Contoh: IRT"
							/>
						</div>
					</div>
					<!-- Kontak -->
					<legend class="fieldset-legend">Kontak</legend>
					<input
						required
						type="text"
						class="input bg-base-200 w-full dark:border-none"
						placeholder="Nomor telepon atau WhatsApp"
					/>
				</div>
				<!-- data Alamat Murid -->
				<input type="radio" name="my_tabs_3" class="tab" aria-label="Data Alamat Murid" />
				<div class="tab-content bg-base-100 p-4">
					<!-- Alamat Jalan -->
					<legend class="fieldset-legend">Jalan</legend>
					<input
						required
						type="text"
						class="input bg-base-200 w-full dark:border-none"
						placeholder="Contoh: Jalan Raya Noyan, Dusun Periji"
					/>
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Kelurahan/Desa -->
						<div class="flex-1">
							<legend class="fieldset-legend">Kelurahan/Desa</legend>
							<input
								required
								type="text"
								class="input bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Sungai Dangin"
							/>
						</div>
						<!-- Kecamatan -->
						<div class="flex-1">
							<legend class="fieldset-legend">Kecamatan</legend>
							<input
								required
								type="text"
								class="input bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Noyan"
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
								class="input bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Sanggau"
							/>
						</div>
						<!-- Provinsi -->
						<div class="flex-1">
							<legend class="fieldset-legend">Provinsi</legend>
							<input
								required
								type="text"
								class="input bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Kalimantan Barat"
							/>
						</div>
					</div>
				</div>
				<!-- data Wali -->
				<input type="radio" name="my_tabs_3" class="tab" aria-label="Data Wali" />
				<div class="tab-content bg-base-100 p-4">
					<div class="flex flex-col gap-2 sm:flex-row">
						<!-- Nama Wali -->
						<div class="flex-1">
							<legend class="fieldset-legend">Nama Wali</legend>
							<input
								required
								type="text"
								class="input bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Hendra"
							/>
						</div>
						<!-- Pekerjaan Wali -->
						<div class="flex-1">
							<legend class="fieldset-legend">Pekerjaan Wali</legend>
							<input
								required
								type="text"
								class="input bg-base-200 w-full dark:border-none"
								placeholder="Contoh: PNS"
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
								class="input bg-base-200 w-full dark:border-none"
								placeholder="Contoh: Jalan Raya Noyan, Dusun Periji"
							/>
						</div>
						<!-- Kontak Wali -->
						<div class="flex-1">
							<legend class="fieldset-legend">Kontak</legend>
							<input
								required
								type="text"
								class="input bg-base-200 w-full dark:border-none"
								placeholder="Nomor telepon atau WhatsApp"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
		<div class="border-base-200 mt-4 flex flex-col gap-2 sm:flex-row">
			<button class="btn border-none shadow-none" on:click={handleBatal}>Batal</button>
			<button class="btn btn-primary border-none shadow-none sm:ml-auto">Simpan</button>
		</div>
	</fieldset>
</dialog>
