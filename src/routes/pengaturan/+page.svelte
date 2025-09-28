<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	let { data } = $props();
	const sekolahList = (data.sekolahList ?? []) as Sekolah[];
	const activeSekolahId = data.activeSekolahId as number | null;
	let selectedSekolahId = $state(activeSekolahId ? String(activeSekolahId) : '');
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<h2 class="mb-4 text-xl font-bold">Pengaturan E-rapor Kurikulum Merdeka</h2>

	<!-- Pilih sekolah -->
	<fieldset class="fieldset">
		<legend class="fieldset-legend">Ganti sekolah</legend>
		<form
			method="POST"
			action="?/switch"
			class="flex flex-col gap-2 sm:flex-row sm:items-center"
		>
			<select
				class="select bg-base-200 w-full dark:border-none sm:flex-1"
				name="sekolahId"
				bind:value={selectedSekolahId}
				required
			>
				<option value="" disabled>Pilih Sekolah</option>
				{#if sekolahList.length === 0}
					<option disabled value="">Belum ada data sekolah</option>
				{:else}
					{#each sekolahList as item (item.id)}
						<option value={String(item.id)}>{item.nama}</option>
					{/each}
				{/if}
			</select>
			<button class="btn btn-primary shadow-none sm:w-auto" type="submit" disabled={!selectedSekolahId}>
				<Icon name="select" />
				Pilih
			</button>
		</form>
		<p class="text-base-content/70 mt-1 text-xs">
			Operator dapat memilih sekolah aktif di sini.
		</p>
	</fieldset>

	<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
		<!-- tahun ajaran secara otomatis memilih yang terbaru -->
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Tahun Ajaran</legend>
			<select class="select bg-base-200 w-full dark:border-none">
				<option disabled selected>Pilih Tahun Ajaran</option>
				<option>2024/2025</option>
				<option>2025/2026</option>
			</select>
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Semester</legend>
			<select class="select bg-base-200 w-full dark:border-none">
				<option disabled selected>Pilih Semester</option>
				<option>Ganjil</option>
				<option>Genap</option>
			</select>
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

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Atur port aplikasi</legend>
			<input
				type="text"
				class="input bg-base-200 join-item w-full dark:border-none"
				placeholder="Contoh: 5173"
			/>
			<p class="text-base-content/70 mt-1 text-xs">Kosongkan bila tidak diperlukan</p>
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Alamat aplikasi</legend>
			<div class="join">
				<input
					type="text"
					disabled
					class="input bg-base-200 join-item w-full dark:border-none"
					placeholder="192.168.8.100:5173"
					value="192.168.8.100:5173"
				/>
				<btn class="btn join-item shadow-none">Copy</btn>
			</div>
			<p class="text-base-content/70 mt-1 text-xs">
				Buka alamat ini pada perangkat lain di jaringan lokal yang sama
			</p>
		</fieldset>

		<!-- Kiri: File Upload -->
		<fieldset class="fieldset max-w-xs">
			<legend class="fieldset-legend">Import data siswa dan kelas</legend>
			<input type="file" class="file-input file-input-ghost" accept=".xlsx, .xls" name="data" />
			<p class="text-base-content/70 mt-1 text-xs">
				File daftar siswa dengan format excel dari dapodik. Pastikan file dapat dibuka sebelum
				import.
			</p>
		</fieldset>

		<div class="col-span-1 mt-6 flex justify-end md:col-span-2">
			<button class="btn btn-primary shadow-none">
				<Icon name="save" />
				Simpan
			</button>
		</div>
	</div>
</div>
