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
			<pre class="bg-base-200 rounded-xl px-2">Detail Data Murid</pre>
		</legend>
		<div class="max-h-[60vh] overflow-y-auto sm:max-h-none sm:overflow-y-visible">
			<div class="join join-vertical w-full max-w-full">
				<div class="tabs tabs-box">
					<!-- data Murid -->
					<input type="radio" name="tab-detil-murid" class="tab" aria-label="Data Murid" checked />
					<div class="tab-content bg-base-100 p-4">
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<span class="text-sm text-gray-500">NIS</span>
								<p class="font-medium">132455</p>
							</div>
							<div>
								<span class="text-sm text-gray-500">NISN</span>
								<p class="font-medium">67834556</p>
							</div>
							<div>
								<span class="text-sm text-gray-500">Nama</span>
								<p class="font-medium">Donald Trump</p>
							</div>
							<div>
								<span class="text-sm text-gray-500">Jenis Kelamin</span>
								<p class="font-medium">Laki-laki</p>
							</div>
							<div>
								<span class="text-sm text-gray-500">Tempat Lahir</span>
								<p class="font-medium">Terusan</p>
							</div>
							<div>
								<span class="text-sm text-gray-500">Tanggal Lahir</span>
								<p class="font-medium">15 Juni 2020</p>
							</div>
							<div>
								<span class="text-sm text-gray-500">Agama</span>
								<p class="font-medium">Katolik</p>
							</div>
						</div>
					</div>
					<!-- data Orang Tua -->
					<input type="radio" name="tab-detil-murid" class="tab" aria-label="Data Orang Tua" />
					<div class="tab-content bg-base-100 p-4">
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<span class="text-sm text-gray-500">Nama Ayah</span>
								<p class="font-medium">John StillInTheHouse</p>
							</div>
							<div>
								<span class="text-sm text-gray-500">Pekerjaan Ayah</span>
								<p class="font-medium">Youtuber</p>
							</div>
							<div>
								<span class="text-sm text-gray-500">Nama Ibu</span>
								<p class="font-medium">Prices</p>
							</div>
							<div>
								<span class="text-sm text-gray-500">Pekerjaan Ibu</span>
								<p class="font-medium">Pemancing</p>
							</div>
							<div class="sm:col-span-2">
								<span class="text-sm text-gray-500">Nomor Telepon</span>
								<p class="font-medium">3214136457</p>
							</div>
						</div>
					</div>
					<!-- data Alamat Murid -->
					<input type="radio" name="tab-detil-murid" class="tab" aria-label="Data Alamat Murid" />
					<div class="tab-content bg-base-100 p-4">
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div class="sm:col-span-2">
								<span class="text-sm text-gray-500">Jalan</span>
								<p class="font-medium">Jalan Polandia</p>
							</div>
							<div>
								<span class="text-sm text-gray-500">Kelurahan/Desa</span>
								<p class="font-medium">Chili</p>
							</div>
							<div>
								<span class="text-sm text-gray-500">Kecamatan</span>
								<p class="font-medium">Antartika</p>
							</div>
							<div>
								<span class="text-sm text-gray-500">Kabupaten/Kota</span>
								<p class="font-medium">Madagaskar</p>
							</div>
							<div>
								<span class="text-sm text-gray-500">Provinsi</span>
								<p class="font-medium">Hawai</p>
							</div>
						</div>
					</div>
					<!-- data Wali -->
					<input type="radio" name="tab-detil-murid" class="tab" aria-label="Data Wali" />
					<div class="tab-content bg-base-100 p-4">
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							<div>
								<span class="text-sm text-gray-500">Nama Wali</span>
								<p class="font-medium">Juan</p>
							</div>
							<div>
								<span class="text-sm text-gray-500">Pekerjaan Wali</span>
								<p class="font-medium">Tukang Bajak</p>
							</div>
							<div class="sm:col-span-2">
								<span class="text-sm text-gray-500">Alamat Wali</span>
								<p class="font-medium">Gak tau</p>
							</div>
							<div class="sm:col-span-2">
								<span class="text-sm text-gray-500">Kontak</span>
								<p class="font-medium">7312341</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
		<button class="btn btn-primary mt-4 border-none shadow-none sm:ml-auto">Edit</button>
	</fieldset>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
