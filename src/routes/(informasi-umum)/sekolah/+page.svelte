<script lang="ts">
	import { invalidate } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { jenjangPendidikan } from '$lib/statics.js';

	type ActiveTahunAjaran = {
		id: number;
		nama: string;
	};

	type ActiveSemester = {
		id: number;
		nama: string;
		tipe: Semester['tipe'];
		tanggalBagiRaport: string | null;
	};

	type SekolahCard = Sekolah & {
		tahunAjaranAktif: ActiveTahunAjaran | null;
		semesterAktif: ActiveSemester | null;
		jumlahRombel: number;
		jumlahMurid: number;
	};

	let { data } = $props();
	const sekolahList = $derived((data.sekolahList ?? []) as SekolahCard[]);
	const activeSekolahId = $derived(data.sekolah?.id ?? null);
	const sortedSekolahList = $derived.by(() => {
		const list = sekolahList;
		const aktifId = activeSekolahId;
		return [...list].sort((a, b) => {
			if (a.id === aktifId) return -1;
			if (b.id === aktifId) return 1;
			return list.indexOf(a) - list.indexOf(b);
		});
	});

	const formatDate = (value?: string | null) => {
		if (!value) return '-';
		return new Date(value).toLocaleDateString('id-ID', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	};

	function plainAlamat(alamat?: Alamat) {
		if (!alamat) return '-';
		return `${alamat.jalan || '-'}, ${alamat.desa || '-'}, ${alamat.kecamatan || '-'}, ${alamat.kabupaten || '-'}, ${alamat.provinsi || '-'}, ${alamat.kodePos || '-'}`;
	}

	let deleteTarget = $state<SekolahCard | null>(null);

	function openDeleteModal(sekolah: SekolahCard) {
		deleteTarget = sekolah;
	}

	function closeDeleteModal() {
		deleteTarget = null;
	}

	async function handleDeleteSuccess() {
		await invalidate('app:sekolah');
		deleteTarget = null;
	}
</script>

<div class="flex flex-col gap-6">
	{#if sortedSekolahList.length}
		{#each sortedSekolahList as sekolah (sekolah.id)}
			<div class="card bg-base-100 rounded-box shadow-md">
				<div class="card-body p-0">
					<div class="p-6 pb-2">
						<div class="flex items-start justify-between gap-4">
							<div class="flex items-center gap-4">
								<div class="avatar">
									<div class="rounded-box w-18">
										<img src={`/sekolah/logo/${sekolah.id}`} alt={`Logo ${sekolah.nama}`} />
									</div>
								</div>

								<div>
									<h2 class="card-title text-2xl font-bold">{sekolah.nama}</h2>
									<p class="text-base-content/70">Data Pokok Sekolah</p>
								</div>
							</div>
							{#if sekolah.id === activeSekolahId}
								<span class="badge badge-primary badge-soft self-start">Aktif</span>
							{/if}
						</div>
					</div>
					<div class="px-6 pb-2">
						{#if sekolah.tahunAjaranAktif}
							<div class="text-base-content/80 flex flex-wrap items-center gap-2 text-sm">
								<span class="badge badge-primary badge-soft">
									Tahun ajaran: {sekolah.tahunAjaranAktif.nama}
								</span>
								{#if sekolah.semesterAktif}
									<span class="badge badge-info badge-soft">
										Semester: {sekolah.semesterAktif.nama}
									</span>
									{#if sekolah.semesterAktif.tanggalBagiRaport}
										<span class="text-base-content/60 text-xs">
											Bagi rapor: {formatDate(sekolah.semesterAktif.tanggalBagiRaport)}
										</span>
									{/if}
								{:else}
									<span class="text-base-content/60 text-xs">Belum ada semester aktif</span>
								{/if}
							</div>
						{:else}
							<div
								class="border-warning/60 bg-warning/10 text-warning flex items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm"
							>
								<span aria-hidden="true">
									<Icon name="warning" class="h-4 w-4" />
								</span>
								<span>Belum ada tahun ajaran aktif. Atur melalui tombol "Tahun Ajaran".</span>
							</div>
						{/if}
					</div>

					<div class="border-base-300 dark:border-base-200 border"></div>

					<div class="p-6">
						<div class="space-y-4">
							<div class="grid grid-cols-1 items-center gap-2 md:grid-cols-3">
								<span class="text-base-content/70 font-semibold">Jenjang Pendidikan</span>
								<span class="text-base-content md:col-span-2">
									{jenjangPendidikan[sekolah.jenjangPendidikan]}
								</span>
							</div>

							<div class="grid grid-cols-1 items-center gap-2 md:grid-cols-3">
								<span class="text-base-content/70 font-semibold">NPSN</span>
								<span class="text-base-content md:col-span-2">{sekolah.npsn}</span>
							</div>

							<div class="grid grid-cols-1 items-center gap-2 md:grid-cols-3">
								<span class="text-base-content/70 font-semibold">Kepala Sekolah</span>
								<div class="text-base-content sm:col-span-2">
									<div class="tooltip" data-tip={sekolah.kepalaSekolah?.nip}>
										{sekolah.kepalaSekolah?.nama ?? '-'}
									</div>
								</div>
							</div>

							<div class="grid grid-cols-1 items-start gap-2 md:grid-cols-3">
								<span class="text-base-content/70 font-semibold">Alamat</span>
								<span class="text-base-content md:col-span-2">
									{plainAlamat(sekolah.alamat)}
								</span>
							</div>

							<div class="grid grid-cols-1 items-center gap-2 md:grid-cols-3">
								<span class="text-base-content/70 font-semibold">Website Sekolah</span>
								<div class="sm:col-span-2">
									{#if sekolah.website}
										<a
											href={sekolah.website}
											target="_blank"
											class="text-primary break-all underline">{sekolah.website}</a
										>
									{:else}
										<span class="text-base-content/70 break-all">-</span>
									{/if}
								</div>
							</div>

							<div class="grid grid-cols-1 items-center gap-2 md:grid-cols-3">
								<span class="text-base-content/70 font-semibold">Email Sekolah</span>
								<div class="link link-accent break-all sm:col-span-2">
									{#if sekolah.email}
										<a href={`mailto:${sekolah.email}`} target="_blank">{sekolah.email}</a>
									{:else}
										-
									{/if}
								</div>
							</div>
						</div>

						<div class="mt-8 flex flex-col justify-end gap-2 md:flex-row">
							<button
								type="button"
								class="btn shadow-none btn-error btn-soft"
								aria-label="hapus sekolah"
								onclick={() => openDeleteModal(sekolah)}
							>
								<Icon name="del" />
								Hapus Sekolah
							</button>
							<a
								href={`/sekolah/tahun-ajaran?sekolahId=${sekolah.id}`}
								class="btn shadow-none"
								aria-label="Lihat tahun ajaran"
							>
								<Icon name="calendar" />
								Tahun Ajaran
							</a>
							<a href="/sekolah/form" class="btn shadow-none" aria-label="Edit data sekolah">
								<Icon name="edit" />
								Edit Sekolah
							</a>
						</div>
					</div>
				</div>
			</div>
		{/each}
	{:else}
		<div class="alert alert-info">Belum ada data sekolah. Tambahkan sekolah untuk memulai.</div>
	{/if}

	<a
		href="/sekolah/form?mode=new"
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
			<p class="text-base-content/50 mt-2">Tambah sekolah baru</p>
		</div>
	</a>
</div>

	{#if deleteTarget}
		{@const targetSekolah = deleteTarget}
		<dialog class="modal" open onclose={closeDeleteModal} aria-modal="true" role="alertdialog">
			<div class="modal-box sm:w-full sm:max-w-lg">
				<FormEnhance action="?/delete" onsuccess={handleDeleteSuccess}>
					{#snippet children({ submitting })}
						<input type="hidden" name="sekolahId" value={targetSekolah.id} />
						<section class="space-y-6">
							<header class="flex items-start gap-3">
								<span
									class="bg-error/10 text-error flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full"
									aria-hidden="true"
								>
									<Icon name="warning" class="text-2xl" />
								</span>
								<div>
									<h3 class="text-xl font-bold">Hapus data sekolah?</h3>
									<p class="text-sm text-base-content/70">
										Anda akan menghapus <b>{targetSekolah.nama}</b> dari daftar sekolah secara permanen.
									</p>
								</div>
							</header>

							<div class="grid gap-3 sm:grid-cols-2">
								<div class="bg-base-200/70 dark:bg-base-300/60 rounded-lg border border-base-300/60 p-3">
									<p class="text-xs font-semibold uppercase tracking-wide text-base-content/60">
										Total Rombel
									</p>
									<p class="text-lg font-bold text-base-content">
										{targetSekolah.jumlahRombel}
									</p>
								</div>
								<div class="bg-base-200/70 dark:bg-base-300/60 rounded-lg border border-base-300/60 p-3">
									<p class="text-xs font-semibold uppercase tracking-wide text-base-content/60">
										Total Murid
									</p>
									<p class="text-lg font-bold text-base-content">
										{targetSekolah.jumlahMurid}
									</p>
								</div>
							</div>

							{#if targetSekolah.jumlahRombel || targetSekolah.jumlahMurid}
								<div class="alert alert-warning">
									<Icon name="warning" />
									<span>
										Sekolah masih memiliki rombel atau murid. Hapus seluruh data terkait terlebih dahulu sebelum melanjutkan.
									</span>
								</div>
							{:else}
								<p class="text-sm text-base-content/70">
									Tindakan ini akan menghapus data sekolah secara permanen dan tidak dapat dibatalkan.
								</p>
							{/if}

							<footer class="flex justify-end gap-2">
								<button
									type="button"
									class="btn btn-ghost shadow-none"
									onclick={closeDeleteModal}
									disabled={submitting}
								>
									<Icon name="close" />
									Batal
								</button>
								<button
									type="submit"
									class="btn btn-error btn-soft shadow-none"
									disabled={submitting}
								>
									{#if submitting}
										<span class="loading loading-spinner" aria-hidden="true"></span>
										<span class="sr-only">Menghapus sekolah...</span>
									{:else}
										<Icon name="del" />
									{/if}
									Hapus Sekolah
								</button>
							</footer>
						</section>
					{/snippet}
				</FormEnhance>
			</div>
			<form method="dialog" class="modal-backdrop" onsubmit={closeDeleteModal}>
				<button>close</button>
			</form>
		</dialog>
	{/if}
