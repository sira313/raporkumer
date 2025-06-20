<fieldset class="fieldset bg-base-200 w-full rounded-lg border border-none p-4 shadow-lg">
	<legend class="fieldset-legend">Tabel Data Sekolah</legend>

	<!-- Jenjang Pendidikan -->
	<legend class="fieldset-legend">Jenjang Pendidikan</legend>
	<select class="select bg-base-100 w-full dark:border-none">
		<option disabled selected>Pilih Jenjang Pendidikan</option>
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
				class="input bg-base-100 w-full dark:border-none"
				placeholder="Contoh: SD Negeri 19 Periji"
			/>
		</div>

		<!-- NPSN -->
		<div class="flex-1">
			<legend class="fieldset-legend">NPSN</legend>
			<input
				required
				type="text"
				class="input bg-base-100 w-full dark:border-none"
				placeholder="Contoh: 69856875"
			/>
		</div>
	</div>

	<!-- Alamat Sekolah -->
	<legend class="fieldset-legend">Alamat Sekolah</legend>
	<input
		required
		type="text"
		class="input bg-base-100 w-full dark:border-none"
		placeholder="Contoh: Jalan Raya Noyan, Dusun Periji"
	/>

	<div class="flex-row gap-4 lg:flex">
		<!-- Nama desa atau kelurahan -->
		<div class="flex-1">
			<legend class="fieldset-legend">Desa atau Kelurahan</legend>
			<input
				required
				type="text"
				class="input bg-base-100 w-full dark:border-none"
				placeholder="Contoh: Desa Sungai Dangin atau Kelurahan Sungai Sengkuang"
			/>
		</div>

		<!-- Kecamatan -->
		<div class="flex-1">
			<legend class="fieldset-legend">Kecamatan</legend>
			<input
				required
				type="text"
				class="input bg-base-100 w-full dark:border-none"
				placeholder="Contoh: Kecamatan Noyan"
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
				class="input bg-base-100 w-full dark:border-none"
				placeholder="Contoh: Sanggau"
			/>
		</div>

		<!-- Kode Pos -->
		<div class="flex-1">
			<legend class="fieldset-legend">Kode POS</legend>
			<input
				required
				type="text"
				class="input bg-base-100 w-full dark:border-none"
				placeholder="Contoh: 78554"
			/>
		</div>
	</div>

	<!-- Upload logo sekolah -->
	<legend class="fieldset-legend">Logo Sekolah</legend>
	<input type="file" class="file-input file-input-primary dark:border-none" />
	<p class="label">Format png, tanpa latar belakang, maksimal 300KB</p>

	<!-- Save -->
	<button class="btn btn-secondary ml-auto">Simpan</button>
</fieldset>
