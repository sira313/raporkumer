<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import ImportDatabaseModal from '$lib/components/modals/import-database-modal.svelte';
	import { showModal } from '$lib/components/global-modal.svelte';
	import { toast } from '$lib/components/toast.svelte';

	let { data } = $props();
	const sekolah = (data.sekolah ?? null) as Sekolah | null;
	const sekolahLogo = $derived(sekolah?.id ? `/sekolah/logo/${sekolah.id}` : '/sekolah.png');
	const sekolahNama = $derived(sekolah?.nama ?? 'Belum ada sekolah aktif');
	const sekolahNpsn = $derived(sekolah?.npsn ?? '-');
	const statistikDashboard = $derived(
		data.statistikDashboard ?? {
			rombel: { total: 0, perFase: [] },
			murid: { total: 0 },
			mapel: { total: 0, wajib: 0, mulok: 0, lainnya: 0 },
			ekstrakurikuler: { total: 0 },
			progress: {
				akademik: { percentage: 0, completed: 0, total: 0 },
				absensi: { percentage: 0, completed: 0, total: 0 },
				ekstrakurikuler: { percentage: 0, completed: 0, total: 0 }
			}
		}
	);
	const rombelBadges = $derived.by(() => statistikDashboard.rombel.perFase);
	const mapelStats = $derived(
		statistikDashboard.mapel ?? { total: 0, wajib: 0, mulok: 0, lainnya: 0 }
	);
	const progressStats = $derived(
		statistikDashboard.progress ?? {
			akademik: { percentage: 0, completed: 0, total: 0 },
			absensi: { percentage: 0, completed: 0, total: 0 },
			ekstrakurikuler: { percentage: 0, completed: 0, total: 0 }
		}
	);
	const ekstrakurikulerStats = $derived(
		statistikDashboard.ekstrakurikuler ?? { total: 0 }
	);
	let downloadingBackup = $state(false);

	const handleExportInfo = () => {
		showModal({
			title: 'Export Dapodik',
			body: 'Fitur belum tersedia, masih dalam tahap pengembangan.',
			dismissible: true,
			onPositive: {
				label: 'Mengerti',
				action: ({ close }) => close()
			}
		});
	};

	const handleBackupDownload = async () => {
		if (typeof window === 'undefined' || downloadingBackup) return;
		downloadingBackup = true;
		try {
			const response = await fetch('/api/database/backup');
			if (!response.ok) {
				const errorText = (await response.text()) || 'Gagal mengunduh backup database.';
				toast(errorText, 'error');
				return;
			}

			const blob = await response.blob();
			let filename = 'raporkumer-backup.sqlite3';
			const disposition = response.headers.get('content-disposition');
			const matched = disposition?.match(/filename="?([^";]+)"?/i);
			if (matched?.[1]) {
				filename = matched[1];
			} else {
				const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
				filename = `raporkumer-backup-${timestamp}.sqlite3`;
			}

			const blobUrl = URL.createObjectURL(blob);
			const anchor = document.createElement('a');
			document.body.appendChild(anchor);
			anchor.href = blobUrl;
			anchor.download = filename;
			anchor.click();
			document.body.removeChild(anchor);
			URL.revokeObjectURL(blobUrl);
			toast('Backup database berhasil diunduh.', 'success');
		} catch (error) {
			console.error(error);
			toast('Gagal mengunduh backup database.', 'error');
		} finally {
			downloadingBackup = false;
		}
	};

	const handleImport = () => {
		showModal({
			title: 'Import Database',
			body: ImportDatabaseModal,
			dismissible: true
		});
	};
</script>

<!-- Kontainer Utama Grid -->
<div class="grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-2">
	<!-- Kolom 1: Data Utama & Progress -->
	<div class="flex flex-col gap-5">
		<!-- Widget Data Sekolah -->
		<div class="card bg-base-100 rounded-box shadow-md dark:border-none">
			<div class="card-body">
				{#if sekolah}
					<div class="flex items-center gap-4">
						<div class="avatar">
							<div class="w-24 rounded">
								<img src={sekolahLogo} alt={`Logo ${sekolahNama}`} />
							</div>
						</div>
						<div class="space-y-1">
							<h2 class="card-title">Data Sekolah</h2>
							<p class="text-lg font-bold">{sekolahNama}</p>
							<p class="text-sm">NPSN: {sekolahNpsn}</p>
						</div>
					</div>
				{:else}
					<div class="flex flex-col gap-2">
						<h2 class="card-title">Data Sekolah</h2>
						<p class="text-base-content/70">
							Belum ada sekolah aktif. Silakan pilih atau buat data sekolah melalui menu Data
							Sekolah.
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Statistik Angka -->
		<div class="stats stats-vertical lg:stats-horizontal bg-base-100 rounded-box w-full shadow-md">
			<div class="stat justify-center">
				<div class="stat-figure">
					<span class="text-accent text-3xl">
						<Icon name="user" />
					</span>
				</div>
				<div class="stat-title">Jumlah Rombel</div>
				<div class="stat-value">{statistikDashboard.rombel.total}</div>
				<div class="stat-desc flex flex-wrap gap-1">
					{#if rombelBadges.length}
						{#each rombelBadges as badge (badge.label)}
							<div class="badge badge-sm badge-soft whitespace-nowrap">
								{badge.jumlah}
								{badge.label}
							</div>
						{/each}
					{:else}
						<div class="badge badge-sm badge-soft whitespace-nowrap">Belum ada data</div>
					{/if}
				</div>
			</div>

			<div class="stat">
				<div class="stat-figure text-secondary">
					<span class="text-3xl">
						<Icon name="users" />
					</span>
				</div>
				<div class="stat-title">Jumlah Murid</div>
				<div class="stat-value">{statistikDashboard.murid.total}</div>
				<div class="stat-desc">
					{statistikDashboard.murid.total ? 'Aktif' : 'Belum ada data'}
				</div>
			</div>
		</div>

		<div class="stats stats-vertical lg:stats-horizontal rounded-box bg-base-100 w-full shadow-md">
			<div class="stat">
				<div class="stat-figure text-primary">
					<span class="text-3xl">
						<Icon name="layers" />
					</span>
				</div>
				<div class="stat-title">Mata Pelajaran</div>
				<div class="stat-value">{mapelStats.total}</div>
				<div class="stat-desc">
					{mapelStats.wajib} Wajib & {mapelStats.mulok} Mulok
					{#if mapelStats.lainnya}
						& {mapelStats.lainnya} Pilihan
					{/if}
				</div>
			</div>

			<div class="stat">
				<div class="stat-figure text-warning">
					<span class="text-3xl">
						<Icon name="activity" />
					</span>
				</div>
				<div class="stat-title">Ekstrakurikuler</div>
				<div class="stat-value">{ekstrakurikulerStats.total}</div>
				<div class="stat-desc">
					{#if ekstrakurikulerStats.total}
						Total di kelas ini
					{:else}
						Belum ada data
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Kolom 2: Progress & Aksi -->
	<div class="flex flex-col gap-6">
		<!-- Widget Progress Pengisian -->
		<div class="card bg-base-100 rounded-box shadow-md">
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
						<span class="label-text-alt font-semibold">
							{progressStats.akademik.percentage}%
						</span>
					</label>
					<progress
						id="progress-akademik"
						class="progress progress-success w-full"
						value={progressStats.akademik.percentage}
						max="100"
					></progress>
					<p class="mt-1 text-xs text-base-content/70">
						{progressStats.akademik.completed} dari {progressStats.akademik.total} penilaian
						sudah diinput.
					</p>
				</div>

				<!-- Progress Absensi -->
				<div class="mb-4">
					<label class="label" for="progress-absensi">
						<span class="label-text">Absensi Siswa</span>
						<span class="label-text-alt font-semibold">
							{progressStats.absensi.percentage}%
						</span>
					</label>
					<progress
						id="progress-absensi"
						class="progress progress-info w-full"
						value={progressStats.absensi.percentage}
						max="100"
					></progress>
					<p class="mt-1 text-xs text-base-content/70">
						{progressStats.absensi.completed} dari {progressStats.absensi.total} murid
						telah memiliki rekap absensi.
					</p>
				</div>

				<!-- Progress Nilai Ekstrakurikuler -->
				<div>
					<label class="label" for="progress-ekskul">
						<span class="label-text">Nilai Ekstrakurikuler</span>
						<span class="label-text-alt font-semibold">
							{progressStats.ekstrakurikuler.percentage}%
						</span>
					</label>
					<progress
						id="progress-ekskul"
						class="progress progress-warning w-full"
						value={progressStats.ekstrakurikuler.percentage}
						max="100"
					></progress>
					<p class="mt-1 text-xs text-base-content/70">
						{progressStats.ekstrakurikuler.completed} dari {progressStats.ekstrakurikuler.total} murid
						sudah dinilai.
					</p>
				</div>
			</div>
		</div>

		<!-- Widget Aksi -->
		<div class="card bg-base-100 rounded-box shadow-md">
			<div class="card-body">
				<h2 class="card-title mb-4">
					<span class="text-xl">
						<Icon name="gear" />
					</span>
					Tindakan Cepat
				</h2>
				<div class="grid grid-cols-1 gap-2">
					<!-- Tombol Export Data -->
					<button
						type="button"
						onclick={handleExportInfo}
						class="btn btn-primary w-full shadow-none"
					>
						<Icon name="export" />
						Export Dapodik
					</button>
					<!-- Tombol Backup Data -->
					<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
						<button
							type="button"
							onclick={handleBackupDownload}
							class="btn btn-outline btn-accent w-full shadow-none"
							disabled={downloadingBackup}
							aria-busy={downloadingBackup}
						>
							{#if downloadingBackup}
								<span class="loading loading-spinner loading-sm"></span>
							{:else}
								<Icon name="database" />
							{/if}
							<span>{downloadingBackup ? 'Mengunduh…' : 'Backup Data'}</span>
						</button>
						<button
							type="button"
							onclick={handleImport}
							class="btn btn-outline btn-accent w-full shadow-none"
						>
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
