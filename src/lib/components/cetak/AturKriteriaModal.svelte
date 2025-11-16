<script lang="ts">
	// Component rendered inside the global modal. Parent reads DOM inputs by id.
	export let cukupUpper: number = 85;
	export let baikUpper: number = 95;
</script>

<div class="space-y-4">
	<div class="grid grid-cols-1">
		<fieldset class="fieldset">
			<legend class="fieldset-legend">Perlu Bimbingan</legend>
			<div class="form-control mt-2">
				<input
					id="krit-perlu"
					class="input input-bordered w-full"
					disabled
					value={'< KKM'}
					aria-label="Perlu Bimbingan"
				/>
				<p class="text-base-content/60 mt-1 text-xs">
					Nilai kurang dari KKM dianggap perlu bimbingan.
				</p>
			</div>
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Cukup</legend>
			<div class="form-control mt-2">
				<input
					id="krit-cukup"
					type="number"
					class="input input-bordered dark:bg-base-200 w-full dark:border-none"
					value={cukupUpper}
					min="0"
					max="100"
					aria-label="Batas atas nilai cukup"
				/>
				<p class="text-base-content/60 mt-1 text-xs">KKM ≤ nilai ≤ nilai ini dianggap 'Cukup'.</p>
			</div>
		</fieldset>

		<fieldset class="fieldset">
			<legend class="fieldset-legend">Baik</legend>
			<div class="form-control mt-2">
				<input
					id="krit-baik"
					type="number"
					class="input input-bordered dark:bg-base-200 w-full dark:border-none"
					value={baikUpper}
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
			<legend class="fieldset-legend">Sangat Baik</legend>
			<div class="form-control mt-2">
				<input
					id="krit-sangat"
					class="input input-bordered w-full"
					disabled
					value={`≥ ${baikUpper + 1}`}
					aria-label="Sangat Baik"
				/>
				<p class="text-base-content/60 mt-1 text-xs">
					Diambil otomatis sebagai nilai di atas batas 'Baik'.
				</p>
			</div>
		</fieldset>
	</div>
</div>
