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

<div class="card bg-base-100 rounded-box mx-auto w-full max-w-4xl shadow-md">
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

			<div class="card-actions mt-8 justify-end">
				<a href="/sekolah/form" class="btn btn-primary shadow-none" aria-label="Edit data sekolah">
					<Icon name="edit" />
					Edit
				</a>
			</div>
		</div>
	</div>
</div>
