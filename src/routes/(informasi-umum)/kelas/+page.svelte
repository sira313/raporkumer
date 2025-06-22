<form>
	<fieldset
		class="fieldset bg-base-100 mx-auto w-full max-w-3xl rounded-lg border border-none p-4 shadow-md"
	>
		<legend class="fieldset-legend">Formulir Isian Data Kelas</legend>
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Nama Kelas -->
			<div>
				<legend class="fieldset-legend">Nama Kelas</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: VI (Kelas 6)"
					name="namaKelas"
				/>
			</div>

			<!-- Fase -->
			<div>
				<legend class="fieldset-legend">Fase</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: Fase C (Kelas 6)"
					name="fase"
				/>
			</div>

			<!-- Semester -->
			<div>
				<legend class="fieldset-legend">Semester</legend>
				<select
					class="select bg-base-200 validator w-full border dark:border-none"
					name="semester"
					required
				>
					<option value="" disabled selected>Pilih Semester</option>
					<option>Ganjil</option>
					<option>Genap</option>
				</select>
			</div>

			<!-- Tahun Ajaran -->
			<div>
				<legend class="fieldset-legend">Tahun Ajaran</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: 2025/2026"
					name="tahunAjaran"
				/>
			</div>
			<!-- Nama Kepala Sekolah -->
			<div>
				<legend class="fieldset-legend">Nama Kepala Sekolah</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: Bruce Wayne, Bat"
					name="namaKepalaSekolah"
				/>
			</div>

			<!-- NIP Kepala Sekolah -->
			<div>
				<legend class="fieldset-legend">NIP Kepala Sekolah</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: 19700305 199309 1 009"
					name="nipKepalaSekolah"
				/>
			</div>

			<!-- Wali Kelas -->
			<div>
				<legend class="fieldset-legend">Wali Kelas</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: Damian Wayne, Bat"
					name="waliKelas"
				/>
			</div>

			<!-- NIP Wali Kelas -->
			<div>
				<legend class="fieldset-legend">NIP Wali Kelas</legend>
				<input
					required
					type="text"
					class="input validator bg-base-200 w-full dark:border-none"
					placeholder="Contoh: 19940505 201803 1 008"
					name="nipWaliKelas"
				/>
			</div>
		</div>
		<button class="btn btn-primary mt-6 ml-auto shadow-none"> Simpan </button>
	</fieldset>
</form>
