<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import { jenjangPendidikan } from '$lib/statics.js';

	let { data } = $props();
	let sekolah = data.sekolah;

	function plainAlamat(alamat?: Alamat) {
		if (!alamat) return '-';
		return `${alamat.jalan || '-'}, ${alamat.desa || '-'}, ${alamat.kecamatan || '-'}, ${alamat.kabupaten || '-'}, ${alamat.provinsi || '-'}, ${alamat.kodePos || '-'}`;
	}
</script>

<div class="card bg-base-100 rounded-box shadow-md">
	<div class="card-body p-0">
		<div class="flex items-center space-x-4 p-6">
			<div class="avatar">
				<div class="rounded-box w-18">
					<img src="/sekolah/logo" alt="Logo sekolah" />
				</div>
			</div>

			<div>
				<h2 class="card-title text-2xl font-bold">{sekolah?.nama}</h2>
				<p class="text-base-content/70">Data Pokok Sekolah</p>
			</div>
		</div>

		<div class="border-base-300 dark:border-base-200 border"></div>

		<div class="p-6">
			<div class="space-y-4">
				<div class="grid grid-cols-1 items-center gap-2 md:grid-cols-3">
					<span class="text-base-content/70 font-semibold">Jenjang Pendidikan</span>
					<span class="text-base-content md:col-span-2">
						{jenjangPendidikan[sekolah!.jenjangPendidikan]}
					</span>
				</div>

				<div class="grid grid-cols-1 items-center gap-2 md:grid-cols-3">
					<span class="text-base-content/70 font-semibold">NPSN</span>
					<span class="text-base-content md:col-span-2">{sekolah?.npsn}</span>
				</div>

				<div class="grid grid-cols-1 items-center gap-2 md:grid-cols-3">
					<span class="text-base-content/70 font-semibold">Kepala Sekolah</span>
					<div class="text-base-content sm:col-span-2">
						<div class="tooltip" data-tip={sekolah?.kepalaSekolah?.nip}>
							{sekolah?.kepalaSekolah?.nama}
						</div>
					</div>
				</div>

				<div class="grid grid-cols-1 items-start gap-2 md:grid-cols-3">
					<span class="text-base-content/70 font-semibold">Alamat</span>
					<span class="text-base-content md:col-span-2">
						{plainAlamat(sekolah?.alamat)}
					</span>
				</div>

				<div class="grid grid-cols-1 items-center gap-2 md:grid-cols-3">
					<span class="text-base-content/70 font-semibold">Website Sekolah</span>
					<div class="sm:col-span-2">
						{#if sekolah?.website}
							<a href={sekolah.website} target="_blank" class="text-primary break-all underline"
								>{sekolah.website}</a
							>
						{:else}
							<span class="text-base-content/70 break-all">-</span>
						{/if}
					</div>
				</div>

				<div class="grid grid-cols-1 items-center gap-2 md:grid-cols-3">
					<span class="text-base-content/70 font-semibold">Email Sekolah</span>
					<div class="link link-accent break-all sm:col-span-2">
						{#if sekolah?.email}
							<a href="mailto:{sekolah.email}" target="_blank">{sekolah.email}</a>
						{:else}
							-
						{/if}
					</div>
				</div>
			</div>

			<div class="card-actions mt-8 flex items-center justify-end gap-4">
				<!-- Kanan: Tombol Actions -->
				<div class="flex flex-col gap-2 md:flex-row">
					<a href="/sekolah/tahun-ajaran" class="btn shadow-none" aria-label="Lihat tahun ajaran">
						<Icon name="calendar" />
						Tahun Ajaran
					</a>
					<a href="/pengaturan" class="btn shadow-none" aria-label="Edit data sekolah">
						<Icon name="gear" />
						Pengaturan
					</a>
					<a href="/sekolah/form" class="btn shadow-none" aria-label="Edit data sekolah">
						<Icon name="edit" />
						Edit Sekolah
					</a>
				</div>
			</div>
		</div>
	</div>
</div>

<a
	href="/sekolah/form"
	class="card bg-base-100 rounded-box border-base-300 hover:bg-base-200 mt-6 flex min-h-40 border-2 border-dashed transition-colors duration-300"
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
