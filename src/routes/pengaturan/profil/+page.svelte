<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- page uses links for internal navigation */
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { jenisKelamin } from '$lib/statics';
	import {
		golonganByStatus,
		jabatanByGolongan,
		pangkatByGolongan,
		statusKepegawaianOptions
	} from '$lib/profile';

	let { data } = $props();
	const profile = data.profile;

	const initialNama = profile?.pegawai?.nama ?? profile?.namaLengkap ?? '';
	const initialNip = profile?.pegawai?.nip ?? '';

	let namaLengkap = $state(initialNama);
	let nip = $state(initialNip);
	let tempatLahir = $state(profile?.tempatLahir ?? '');
	let tanggalLahir = $state(profile?.tanggalLahir ?? '');
	let jenisKelaminValue = $state(profile?.jenisKelamin ?? '');
	let ijazah = $state(profile?.ijazah ?? '');
	let tahunIjazah = $state(profile?.tahunIjazah != null ? String(profile.tahunIjazah) : '');
	let statusKepegawaian = $state(profile?.statusKepegawaian ?? '');
	let golongan = $state(profile?.golongan ?? '');
	let jabatan = $state(profile?.jabatan ?? '');
	let tanggalPangkat = $state(profile?.tanggalPangkat ?? '');
	let tanggalDiangkat = $state(profile?.tanggalDiangkat ?? '');
	let tanggalBekerja = $state(profile?.tanggalBekerja ?? '');
	let tanggalGajiBerkala = $state(profile?.tanggalGajiBerkala ?? '');

	const golonganOptions = $derived(golonganByStatus[statusKepegawaian] ?? []);
	const jabatanOptions = $derived(golongan ? (jabatanByGolongan[golongan] ?? []) : []);
	const isHonor = $derived(
		statusKepegawaian === 'Honor Pemda' || statusKepegawaian === 'Honorer Sekolah'
	);
	const isPppk = $derived(statusKepegawaian === 'PPPK');
	const isGajiBerkalaLocked = $derived(isHonor || isPppk);
	const pangkat = $derived(
		isGajiBerkalaLocked ? '-' : golongan ? (pangkatByGolongan[golongan] ?? '') : ''
	);

	$effect(() => {
		if (golonganOptions.length > 0) {
			if (!golonganOptions.includes(golongan)) golongan = golonganOptions[0];
		} else if (golongan) {
			golongan = '';
		}
	});

	$effect(() => {
		if (jabatanOptions.length > 0) {
			if (!jabatanOptions.includes(jabatan)) jabatan = jabatanOptions[0];
		} else if (jabatan) {
			jabatan = '';
		}
	});

	$effect(() => {
		if (isGajiBerkalaLocked) {
			tanggalPangkat = '-';
			tanggalGajiBerkala = '-';
		}
	});
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
	<div class="space-y-4">
		<header class="space-y-2">
			<h1 class="text-2xl font-bold">Edit Profil</h1>
			<p class="text-base-content/70 text-sm">
				Perbarui informasi profil pribadi Anda. Data tersimpan di akun {profile?.username ?? ''}.
			</p>
		</header>

		<FormEnhance action="?/save">
			{#snippet children({ submitting })}
				<div class="flex flex-col gap-2 sm:flex-row">
					<fieldset class="fieldset flex-1">
						<legend class="fieldset-legend">Nama Lengkap</legend>
						<input
							type="text"
							class="input validator bg-base-200 dark:bg-base-300 w-full border-base-300 dark:border-none"
							placeholder="Contoh: Drs. H. Arif Rahman"
							bind:value={namaLengkap}
							name="namaLengkap"
							required
						/>
						<p class="text-base-content/70 mt-1 text-xs">
							Terintegrasi dengan data pegawai pada halaman Manajemen Pengguna.
						</p>
					</fieldset>
					<fieldset class="fieldset flex-1">
						<legend class="fieldset-legend">NIP</legend>
						<input
							type="text"
							class="input validator bg-base-200 dark:bg-base-300 w-full border-base-300 dark:border-none"
							placeholder="Contoh: NIP. 196508101988031001"
							bind:value={nip}
							name="nip"
						/>
						<p class="text-base-content/70 mt-1 text-xs">
							Terintegrasi dengan data pegawai pada halaman Data Kelas.
						</p>
					</fieldset>
				</div>

				<div class="flex flex-col gap-2 sm:flex-row">
					<fieldset class="fieldset flex-1">
						<legend class="fieldset-legend">Tempat Lahir</legend>
						<input
							type="text"
							class="input validator bg-base-200 dark:bg-base-300 w-full border-base-300 dark:border-none"
							placeholder="Contoh: Pontianak"
							bind:value={tempatLahir}
							name="tempatLahir"
						/>
					</fieldset>
					<fieldset class="fieldset flex-1">
						<legend class="fieldset-legend">Tanggal Lahir</legend>
						<input
							type="date"
							class="input validator bg-base-200 dark:bg-base-300 w-full border-base-300 dark:border-none"
							bind:value={tanggalLahir}
							name="tanggalLahir"
						/>
					</fieldset>
				</div>

				<div class="flex flex-col gap-2 sm:flex-row">
					<fieldset class="fieldset flex-1">
						<legend class="fieldset-legend">Jenis Kelamin</legend>
						<select
							class="select validator bg-base-200 dark:bg-base-300 w-full truncate border-base-300 dark:border-none"
							bind:value={jenisKelaminValue}
							name="jenisKelamin"
						>
							<option value="" disabled>Pilih Jenis Kelamin</option>
							{#each Object.entries(jenisKelamin) as [value, label] (value)}
								<option {value}>{label}</option>
							{/each}
						</select>
					</fieldset>
					<fieldset class="fieldset flex-1">
						<legend class="fieldset-legend">Ijazah</legend>
						<input
							type="text"
							class="input validator bg-base-200 dark:bg-base-300 w-full border-base-300 dark:border-none"
							placeholder="Contoh: S1 PGSD"
							bind:value={ijazah}
							name="ijazah"
						/>
						<p class="text-base-content/70 mt-1 text-xs">Input ijazah terakhir</p>
					</fieldset>
				</div>

				<div class="flex flex-col gap-2 sm:flex-row">
					<fieldset class="fieldset flex-1">
						<legend class="fieldset-legend">Tahun</legend>
						<input
							type="number"
							min="1900"
							max="3000"
							inputmode="numeric"
							class="input validator bg-base-200 dark:bg-base-300 w-full border-base-300 dark:border-none"
							placeholder="Contoh: 2012"
							bind:value={tahunIjazah}
							name="tahunIjazah"
						/>
						<p class="text-base-content/70 mt-1 text-xs">Input tahun lulus ijazah terakhir</p>
					</fieldset>
					<fieldset class="fieldset flex-1">
						<legend class="fieldset-legend">Status Kepegawaian</legend>
						<select
							class="select validator bg-base-200 dark:bg-base-300 w-full truncate border-base-300 dark:border-none"
							bind:value={statusKepegawaian}
							name="statusKepegawaian"
						>
							<option value="" disabled>Pilih Status Kepegawaian</option>
							{#each statusKepegawaianOptions as option (option)}
								<option value={option}>{option}</option>
							{/each}
						</select>
					</fieldset>
				</div>

				<div class="flex flex-col gap-2 sm:flex-row">
					<fieldset class="fieldset flex-1">
						<legend class="fieldset-legend">Golongan</legend>
						<select
							class="select validator bg-base-200 dark:bg-base-300 w-full truncate border-base-300 dark:border-none"
							bind:value={golongan}
							name="golongan"
							disabled={golonganOptions.length === 0}
						>
							<option value="" disabled>Pilih Golongan</option>
							{#each golonganOptions as option (option)}
								<option value={option}>{option}</option>
							{/each}
						</select>
						<p class="text-base-content/70 mt-1 text-xs">
							Golongan otomatis menyesuaikan status kepegawaian.
						</p>
					</fieldset>
					<fieldset class="fieldset flex-1">
						<legend class="fieldset-legend">Jabatan</legend>
						<select
							class="select validator bg-base-200 dark:bg-base-300 w-full truncate border-base-300 dark:border-none"
							bind:value={jabatan}
							name="jabatan"
							disabled={jabatanOptions.length === 0}
						>
							<option value="" disabled>Pilih Jabatan</option>
							{#each jabatanOptions as option (option)}
								<option value={option}>{option}</option>
							{/each}
						</select>
					</fieldset>
					<fieldset class="fieldset flex-1">
						<legend class="fieldset-legend">Pangkat</legend>
						<input
							type="text"
							class="input validator bg-base-200 dark:bg-base-300 w-full border-base-300 dark:border-none"
							value={pangkat}
							placeholder="Otomatis dari golongan"
							disabled
							readonly
						/>
						<p class="text-base-content/70 mt-1 text-xs">
							Pangkat otomatis mengikuti golongan dan tersimpan saat profil disimpan.
						</p>
					</fieldset>
				</div>

				<div class="flex flex-col gap-2 sm:flex-row">
					<fieldset class="fieldset flex-1">
						<legend class="fieldset-legend">Diangkat</legend>
						<input
							type="date"
							class="input validator bg-base-200 dark:bg-base-300 w-full border-base-300 dark:border-none"
							bind:value={tanggalDiangkat}
							name="tanggalDiangkat"
						/>
						<p class="text-base-content/70 mt-1 text-xs">Pertama kali diangkat</p>
					</fieldset>
					<fieldset class="fieldset flex-1">
						<legend class="fieldset-legend">Kerja di Sekolah Ini</legend>
						<input
							type="date"
							class="input validator bg-base-200 dark:bg-base-300 w-full border-base-300 dark:border-none"
							bind:value={tanggalBekerja}
							name="tanggalBekerja"
						/>
						<p class="text-base-content/70 mt-1 text-xs">
							Tanggal bekerja di sekolah ini sesuai SK.
						</p>
					</fieldset>
				</div>

				<div class="flex flex-col gap-2 sm:flex-row">
					<fieldset class="fieldset flex-1">
						<legend class="fieldset-legend">Gaji Berkala</legend>
						<input
							type="date"
							class="input validator bg-base-200 dark:bg-base-300 w-full border-base-300 dark:border-none"
							bind:value={tanggalGajiBerkala}
							name="tanggalGajiBerkala"
							disabled={isGajiBerkalaLocked}
						/>
						<p class="text-base-content/70 mt-1 text-xs">Gaji berkala yang akan datang</p>
					</fieldset>
					<fieldset class="fieldset flex-1">
						<legend class="fieldset-legend">Tanggal Pangkat Terakhir</legend>
						<input
							type="date"
							class="input validator bg-base-200 dark:bg-base-300 w-full border-base-300 dark:border-none"
							bind:value={tanggalPangkat}
							name="tanggalPangkat"
							disabled={isGajiBerkalaLocked}
						/>
						<p class="text-base-content/70 mt-1 text-xs">Tanggal pangkat terakhir sesuai SK.</p>
					</fieldset>
				</div>

				<div class="mt-6 flex justify-end gap-2">
					<a class="btn btn-outline shadow-none" href="/pengaturan">Batal</a>
					<button class="btn btn-primary shadow-none" type="submit" disabled={submitting}>
						<Icon name="save" />
						{submitting ? 'Menyimpan…' : 'Simpan Profil'}
					</button>
				</div>
			{/snippet}
		</FormEnhance>
	</div>
</section>
