<script lang="ts">
	import { invalidate } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';

	type KelasCard = Omit<Kelas, 'sekolah'> & {
		jumlahMurid: number;
		jumlahMapel: number;
		jumlahEkstrakurikuler: number;
		jumlahKokurikuler: number;
	};

	let { data } = $props();
	const daftarKelas = $derived((data.daftarKelas ?? []) as KelasCard[]);
	const academicContext = $derived(data.academicContext ?? null);
	const activeSemester = $derived.by(() => {
		const context = academicContext;
		if (!context?.activeSemesterId) return null;
		for (const tahun of context.tahunAjaranList ?? []) {
			const match = tahun.semester.find((item) => item.id === context.activeSemesterId);
			if (match) {
				return {
					...match,
					tahunAjaranNama: tahun.nama
				};
			}
		}
		return null;
	});
	let deleteKelasData = $state<KelasCard | null>(null);
	let purgeAck = $state(false);

	const needsPurgeAck = $derived.by(() => {
		const target = deleteKelasData;
		if (!target) return false;
		return (
			(target.jumlahMurid ?? 0) > 0 ||
			(target.jumlahMapel ?? 0) > 0 ||
			(target.jumlahEkstrakurikuler ?? 0) > 0 ||
			(target.jumlahKokurikuler ?? 0) > 0 ||
			Boolean(target.waliKelas)
		);
	});

	$effect(() => {
		deleteKelasData;
		purgeAck = false;
	});

	const faseBadgeColors: Record<string, string> = {
		'Fase A': 'badge-primary',
		'Fase B': 'badge-secondary',
		'Fase C': 'badge-accent',
		'Fase D': 'badge-info',
		'Fase E': 'badge-success',
		'Fase F': 'badge-warning'
	};

	const faseBadgeClass = (fase?: string | null) => faseBadgeColors[fase ?? ''] ?? 'badge-neutral';

	function openDeleteModal(kelas: KelasCard) {
		deleteKelasData = kelas;
	}

	function closeDeleteModal() {
		deleteKelasData = null;
		purgeAck = false;
	}

	async function handleDeleteSuccess() {
		await invalidate('app:kelas');
		deleteKelasData = null;
		purgeAck = false;
	}
</script>

{#if academicContext}
	{#if academicContext.activeSemesterId}
		<div class="alert alert-info mb-6 flex items-center gap-3">
			<Icon name="info" />
			<span>
				Menampilkan kelas untuk
				{#if activeSemester}
					<strong>{activeSemester.nama}</strong>
					({activeSemester.tahunAjaranNama})
				{:else}
					semester aktif
				{/if}.
			</span>
		</div>
	{:else}
		<div class="alert alert-warning mb-6 flex items-center gap-3">
			<Icon name="warning" />
			<span>Setel semester aktif di menu Rapor untuk mulai mengelola data kelas per periode.</span>
		</div>
	{/if}
{/if}

<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
	{#each daftarKelas as kelas (kelas.id)}
		<div class="card bg-base-100 rounded-box shadow-md">
			<div class="p-4">
				<div class="flex items-start justify-between gap-4">
					<div>
						<h2 class="card-title text-xl font-bold">{kelas.nama}</h2>
						<p class="text-base-content/60 text-sm">
							{kelas.tahunAjaran?.nama ?? 'Tahun ajaran belum ditetapkan'} •
							{kelas.semester?.nama ?? 'Semester belum ditetapkan'}
						</p>
					</div>
					<div class={`badge ${faseBadgeClass(kelas.fase)}`}>{kelas.fase || 'Belum ditetapkan'}</div>
				</div>
			</div>
			<div class="border-base-300 dark:border-base-200 m-0 border"></div>
			<div class="p-4">
				<div class="card-actions border-base-200 mt-auto items-center justify-start pt-4">
					<div class="avatar">
						<Icon name="user" class="text-4xl" />
					</div>
					<div class="ml-3">
						<div class="text-base-content/60 text-sm">Wali Kelas</div>
						<div class="text-xl font-semibold">{kelas.waliKelas?.nama}</div>
						<p class="text-base-content/70 text-sm">NIP {kelas.waliKelas?.nip}</p>
					</div>
				</div>
				<div class="mt-6 flex justify-end gap-2">
					<button
						class="btn btn-error btn-soft shadow-none"
						type="button"
						onclick={() => openDeleteModal(kelas)}
					>
						<Icon name="del" />
						Hapus
					</button>
					<a href={`/kelas/form/${kelas.id}`} class="btn btn-soft shadow-none">
						<Icon name="edit" />
						Edit
					</a>
				</div>
			</div>
		</div>
	{:else}
		<div class="card bg-base-100 rounded-box flex items-center justify-center min-h-40">
			<div class="p-6 text-center items-center justify-center">
				{#if academicContext && !academicContext.activeSemesterId}
					<em class="opacity-50">Tentukan semester aktif untuk melihat atau menambahkan data kelas.</em>
				{:else}
					<em class="opacity-50">Belum ada data kelas untuk semester ini</em>
				{/if}
			</div>
		</div>
	{/each}
	<a
		href="/kelas/form"
		class="card bg-base-100 rounded-box border-base-300 hover:bg-base-200 flex min-h-40 border-2 border-dashed transition-colors duration-300"
	>
		<div class="my-auto items-center justify-center text-center">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="text-base-content/30 mx-auto h-12 w-12"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="1"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
			</svg>
			<p class="text-base-content/50 mt-2">Tambah Kelas Baru</p>
		</div>
	</a>
</div>

{#if deleteKelasData}
	{@const targetKelas = deleteKelasData}
	<dialog class="modal" open onclose={closeDeleteModal} aria-modal="true" role="alertdialog">
		<div class="modal-box p-4">
			<FormEnhance action="?/delete" onsuccess={handleDeleteSuccess}>
				{#snippet children({ submitting })}
					<input name="id" value={targetKelas.id} hidden />

					<h3 class="mb-4 text-xl font-bold">Hapus kelas?</h3>
					<p>Kelas: {targetKelas.nama}</p>
					<p>Fase: {targetKelas.fase ?? '-'}</p>
					<p>Tahun Ajaran: {targetKelas.tahunAjaran?.nama ?? '-'}</p>
					<p>Semester: {targetKelas.semester?.nama ?? '-'}</p>

					<div class="grid gap-3 py-4 sm:grid-cols-2">
						<div class="bg-base-200/70 dark:bg-base-300/60 rounded-lg border border-base-300/60 p-3">
							<p class="text-xs font-semibold uppercase tracking-wide text-base-content/60">Jumlah Murid</p>
							<p class="text-lg font-bold text-base-content">{targetKelas.jumlahMurid}</p>
						</div>
						<div class="bg-base-200/70 dark:bg-base-300/60 rounded-lg border border-base-300/60 p-3">
							<p class="text-xs font-semibold uppercase tracking-wide text-base-content/60">Mata Pelajaran</p>
							<p class="text-lg font-bold text-base-content">{targetKelas.jumlahMapel}</p>
						</div>
						<div class="bg-base-200/70 dark:bg-base-300/60 rounded-lg border border-base-300/60 p-3">
							<p class="text-xs font-semibold uppercase tracking-wide text-base-content/60">Ekstrakurikuler</p>
							<p class="text-lg font-bold text-base-content">{targetKelas.jumlahEkstrakurikuler}</p>
						</div>
						<div class="bg-base-200/70 dark:bg-base-300/60 rounded-lg border border-base-300/60 p-3">
							<p class="text-xs font-semibold uppercase tracking-wide text-base-content/60">Kokurikuler</p>
							<p class="text-lg font-bold text-base-content">{targetKelas.jumlahKokurikuler}</p>
						</div>
					</div>

					{#if needsPurgeAck}
						<div class="alert alert-warning">
							<Icon name="warning" />
							<span>
								Kelas masih memiliki relasi data. Centang persetujuan untuk menghapus seluruh data berikut secara permanen.
							</span>
						</div>
						<div class="bg-base-200/70 dark:bg-base-300/60 space-y-3 rounded-lg border border-base-300/60 p-4 text-sm text-base-content/70">
							<ul class="ml-5 list-disc space-y-1">
								<li>Seluruh murid dalam kelas</li>
								<li>Semua mata pelajaran termasuk Pendidikan Agama dan Budi Pekerti</li>
								<li>Tujuan pembelajaran, ekstrakurikuler, dan kokurikuler</li>
								<li>Wali kelas (pegawai) jika tidak digunakan di kelas atau sekolah lain</li>
								<li>Data orang tua/wali murid beserta alamat yang hanya dimiliki kelas ini</li>
							</ul>
							<label class="flex items-start gap-3 rounded-lg bg-error/5 p-3 text-error">
								<input
									type="checkbox"
									class="checkbox checkbox-error mt-1"
									name="forceDelete"
									value="true"
									bind:checked={purgeAck}
									required
								/>
								<span>Saya paham semua data terkait kelas ini akan dihapus permanen.</span>
							</label>
						</div>
					{:else}
						<p class="text-sm text-base-content/70">
							Tindakan ini akan menghapus data kelas secara permanen, termasuk wali kelas, data orang tua/wali murid, serta alamat yang hanya dimiliki kelas ini.
						</p>
					{/if}

					<div class="flex justify-end gap-2 pt-4">
						<button
							class="btn shadow-none"
							type="button"
							onclick={closeDeleteModal}
						>
							Batal
						</button>

						<button
							class="btn btn-error btn-soft shadow-none"
							disabled={submitting || (needsPurgeAck && !purgeAck)}
						>
							{#if submitting}
								<div class="loading loading-spinner"></div>
							{:else}
								<Icon name="del" />
							{/if}
							Hapus
						</button>
					</div>
				{/snippet}
			</FormEnhance>
		</div>
		<form method="dialog" class="modal-backdrop" onsubmit={closeDeleteModal}>
			<button>close</button>
		</form>
	</dialog>
{/if}
