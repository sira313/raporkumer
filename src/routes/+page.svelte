<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import { setPageTitle } from '$lib/state.svelte';

	setPageTitle('Beranda');
</script>

<!-- Kontainer Utama Grid -->
<div class="mx-auto grid max-w-4xl grid-cols-1 gap-6 md:grid-cols-2">
	<!-- Kolom 1: Data Utama & Progress -->
	<div class="flex flex-col gap-6">
		<!-- Widget Data Sekolah -->
		<div class="card bg-base-100 rounded-box dark:border-none">
			<div class="card-body">
				<div class="flex items-center gap-4">
					<div class="avatar">
						<div class="w-24 rounded">
							<img src="/sekolah.png" alt="Logo Sekolah" />
						</div>
					</div>
					<div>
						<h2 class="card-title">Data Sekolah</h2>
						<p class="text-lg font-bold">SD Negeri 19 Periji</p>
						<p class="text-sm">NPSN: 69856875</p>
					</div>
				</div>
			</div>
		</div>

		<!-- Statistik Angka -->
		<div class="stats stats-vertical lg:stats-horizontal bg-base-100 rounded-box w-full">
			<div class="stat">
				<div class="stat-figure">
					<span class="text-accent text-3xl">
						<Icon name="user" />
					</span>
				</div>
				<div class="stat-title">Jumlah Kelas</div>
				<div class="stat-value">6</div>
				<div class="stat-desc">6 kelas X, 6 kelas XI, 6 kelas XII</div>
			</div>

			<div class="stat">
				<div class="stat-figure text-secondary">
					<span class="text-3xl">
						<Icon name="users" />
					</span>
				</div>
				<div class="stat-title">Jumlah Murid</div>
				<div class="stat-value">79</div>
				<div class="stat-desc">Aktif</div>
			</div>
		</div>

		<div class="stats stats-vertical lg:stats-horizontal rounded-box bg-base-100 w-full">
			<div class="stat">
				<div class="stat-figure text-primary">
					<span class="text-3xl">
						<Icon name="layers" />
					</span>
				</div>
				<div class="stat-title">Mata Pelajaran</div>
				<div class="stat-value">25</div>
				<div class="stat-desc">18 Wajib & 7 Mulok</div>
			</div>

			<div class="stat">
				<div class="stat-figure text-warning">
					<span class="text-3xl">
						<Icon name="activity" />
					</span>
				</div>
				<div class="stat-title">Ekstrakurikuler</div>
				<div class="stat-value">12</div>
				<div class="stat-desc">Pilihan</div>
			</div>
		</div>
	</div>

	<!-- Kolom 2: Progress & Aksi -->
	<div class="flex flex-col gap-6">
		<!-- Widget Progress Pengisian -->
		<div class="card bg-base-100 rounded-box bg-base-100">
			<div class="card-body">
				<h2 class="card-title mb-4">
					<span class="text-xl">
						<Icon name="bar-chart" />
					</span>
					Progress Pengisian Data
				</h2>

				<!-- Progress Nilai Akademik -->
				<div class="mb-4">
					<label class="label" for="progress-akademik">
						<span class="label-text">Nilai Akademik</span>
						<span class="label-text-alt font-semibold">85%</span>
					</label>
					<progress
						id="progress-akademik"
						class="progress progress-success w-full"
						value="85"
						max="100"
					></progress>
				</div>

				<!-- Progress Absensi -->
				<div class="mb-4">
					<label class="label" for="progress-absensi">
						<span class="label-text">Absensi Siswa</span>
						<span class="label-text-alt font-semibold">98%</span>
					</label>
					<progress id="progress-absensi" class="progress progress-info w-full" value="98" max="100"
					></progress>
				</div>

				<!-- Progress Nilai Ekstrakurikuler -->
				<div>
					<label class="label" for="progress-ekskul">
						<span class="label-text">Nilai Ekstrakurikuler</span>
						<span class="label-text-alt font-semibold">70%</span>
					</label>
					<progress
						id="progress-ekskul"
						class="progress progress-warning w-full"
						value="70"
						max="100"
					></progress>
				</div>
			</div>
		</div>

		<!-- Widget Aksi -->
		<div class="card bg-base-100 rounded-box">
			<div class="card-body">
				<h2 class="card-title mb-4">
					<span class="text-xl">
						<Icon name="gear" />
					</span>
					Tindakan Cepat
				</h2>
				<div class="grid grid-cols-1 gap-4">
					<!-- Tombol Export Data -->
					<button class="btn btn-primary w-full shadow-none">
						<Icon name="export" />
						Export Dapodik
					</button>
					<!-- Tombol Backup Data -->
					<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
						<button class="btn btn-outline btn-accent w-full shadow-none">
							<Icon name="database" />
							Backup Data
						</button>
						<button class="btn btn-outline btn-accent w-full shadow-none">
							<Icon name="import" />
							Import Data
						</button>
					</div>
				</div>
				<p class="mt-4 text-xs text-gray-400">
					Pastikan semua data sudah terisi lengkap sebelum melakukan export.
				</p>
			</div>
		</div>
	</div>
</div>
