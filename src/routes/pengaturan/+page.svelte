<script>
	import Icon from '$lib/components/icon.svelte';
</script>

<div class="card bg-base-100 mx-auto w-full max-w-4xl rounded-lg border border-none p-4 shadow-md">
	<h2 class="mb-4 text-xl font-bold">Pengaturan E-rapor Kurikulum Merdeka</h2>
	<fieldset class="fieldset">
		<legend class="fieldset-legend">Kelas yang akan dikerjakan</legend>
		<select class="select bg-base-200 w-full dark:border-none">
			<option disabled selected>Pilih Kelas</option>
			<option>Kelas I</option>
			<option>Kelas II</option>
		</select>
	</fieldset>
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Semester</legend>
			<select class="select bg-base-200 w-full dark:border-none">
				<option disabled selected>Pilih Semester</option>
				<option>Ganjil</option>
				<option>Genap</option>
			</select>
		</fieldset>
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Tahun Ajaran</legend>
			<input
				type="text"
				class="input bg-base-200 validator w-full dark:border-none"
				placeholder="Contoh: 2025/2026"
			/>
		</fieldset>
		<!-- can we use cally for this? -->
		<!-- https://daisyui.com/components/calendar/#cally-date-picker-example -->
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Tanggal bagi rapor semester ganjil</legend>
			<input type="date" class="input bg-base-200 w-full dark:border-none" />
		</fieldset>

		<!-- input disabled bila user pilih semester ganjil -->
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Tanggal bagi rapor semester genap</legend>
			<input disabled type="date" class="input bg-base-200 w-full dark:border-none" />
		</fieldset>
		<div class="col-span-1 mt-6 flex justify-end md:col-span-2">
			<button class="btn btn-primary shadow-none">
				<Icon name="save" />
				Simpan
			</button>
		</div>
	</div>
</div>
