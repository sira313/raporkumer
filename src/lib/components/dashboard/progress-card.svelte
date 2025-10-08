<script lang="ts">
	import Icon from '$lib/components/icon.svelte';

	type ProgressItem = {
		percentage: number;
		completed: number;
		total: number;
	};

	let { progress } = $props<{
		progress: {
			akademik: ProgressItem;
			absensi: ProgressItem;
			ekstrakurikuler: ProgressItem;
		};
	}>();
</script>

<div class="card bg-base-100 rounded-box shadow-md">
	<div class="card-body">
		<h2 class="card-title mb-4">
			<span class="text-xl">
				<Icon name="bar-chart" />
			</span>
			Progress Pengisian Data
		</h2>

		<div class="mb-4">
			<label class="label" for="progress-akademik">
				<span class="label-text">Nilai Akademik</span>
				<span class="label-text-alt font-semibold">{progress.akademik.percentage}%</span>
			</label>
			<progress
				id="progress-akademik"
				class="progress progress-success w-full"
				value={progress.akademik.percentage}
				max="100"
			></progress>
			<p class="mt-1 text-xs text-base-content/70">
				{progress.akademik.completed} dari {progress.akademik.total} penilaian sudah diinput.
			</p>
		</div>

		<div class="mb-4">
			<label class="label" for="progress-absensi">
				<span class="label-text">Absensi Siswa</span>
				<span class="label-text-alt font-semibold">{progress.absensi.percentage}%</span>
			</label>
			<progress
				id="progress-absensi"
				class="progress progress-info w-full"
				value={progress.absensi.percentage}
				max="100"
			></progress>
			<p class="mt-1 text-xs text-base-content/70">
				{progress.absensi.completed} dari {progress.absensi.total} murid telah memiliki rekap absensi.
			</p>
		</div>

		<div>
			<label class="label" for="progress-ekskul">
				<span class="label-text">Nilai Ekstrakurikuler</span>
				<span class="label-text-alt font-semibold">{progress.ekstrakurikuler.percentage}%</span>
			</label>
			<progress
				id="progress-ekskul"
				class="progress progress-warning w-full"
				value={progress.ekstrakurikuler.percentage}
				max="100"
			></progress>
			<p class="mt-1 text-xs text-base-content/70">
				{progress.ekstrakurikuler.completed} dari {progress.ekstrakurikuler.total} murid sudah dinilai.
			</p>
		</div>
	</div>
</div>
