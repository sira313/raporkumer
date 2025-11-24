<script lang="ts">
	import Icon from '../icon.svelte';

	// Component rendered inside the global modal. Parent reads DOM inputs by id.
	export let cukupUpper: number = 85;
	export let baikUpper: number = 95;
	// local state so UI updates while user types
	let localCukup: number | string = cukupUpper;
	let localBaik: number | string = baikUpper;
</script>

<div class="space-y-4">
	<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Batas atas Perlu Bimbingan</legend>
			<div class="form-control mt-2">
				<input
					id="krit-perlu"
					class="input input-bordered w-full"
					disabled
					value="< KKM"
					aria-label="Perlu Bimbingan"
				/>
				<p class="text-base-content/60 mt-1 text-xs">
					Nilai kurang dari KKM dianggap perlu bimbingan.
				</p>
			</div>
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Batas atas Cukup</legend>
			<div class="form-control mt-2">
				<input
					id="krit-cukup"
					type="number"
					class="input input-bordered dark:bg-base-200 w-full dark:border-none"
					bind:value={localCukup}
					min="0"
					max="100"
					aria-label="Batas atas nilai cukup"
				/>
				<p class="text-base-content/60 mt-1 text-xs">KKM ≤ nilai ≤ nilai ini dianggap 'Cukup'.</p>
			</div>
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Batas atas Baik</legend>
			<div class="form-control mt-2">
				<input
					id="krit-baik"
					type="number"
					class="input input-bordered dark:bg-base-200 w-full dark:border-none"
					bind:value={localBaik}
					min="0"
					max="100"
					aria-label="Batas atas nilai baik"
				/>
				<p class="text-base-content/60 mt-1 text-xs">
					(nilai di atas batas Cukup hingga nilai ini dianggap 'Baik').
				</p>
			</div>
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Batas atas Sangat Baik</legend>
			<div class="form-control mt-2">
				<input
					id="krit-sangat"
					class="input input-bordered w-full"
					disabled
					value={`≥ ${Number(localBaik || 0) + 1}`}
					aria-label="Sangat Baik"
				/>
				<p class="text-base-content/60 mt-1 text-xs">
					Diambil otomatis sebagai nilai di atas batas 'Baik'.
				</p>
			</div>
		</fieldset>
	</div>

	<div class="mt-4 flex items-center justify-between">
		<button
			type="button"
			class="btn btn-sm btn-outline"
			on:click={() => {
				localCukup = 85;
				localBaik = 95;
				// update DOM inputs (they're bound so this suffices)
			}}
		>
			Reset ke default
		</button>
	</div>
	<div role="alert" class="alert alert-warning">
		<Icon name="warning" class="text-xl" />
		<span
			>Hati-hati dalam menentukan <strong>batas atas nilai Cukup</strong>, jika bentrok dengan nilai
			KKM akan menyebabkan error.</span
		>
	</div>
	<div role="alert" class="alert alert-info">
		<Icon name="info" class="text-xl" />
		<span>
			Pengaturan ini akan disimpan di server untuk sekolah aktif. Perubahan akan berlaku untuk semua
			pengguna yang mengakses sekolah ini (tergantung izin server).</span
		>
	</div>
</div>
