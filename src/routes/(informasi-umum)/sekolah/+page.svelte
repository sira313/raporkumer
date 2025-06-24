<script lang="ts">
	import { goto } from '$app/navigation';
	import { pageMeta } from '$lib/state.svelte';
	import { onMount } from 'svelte';

	let sekolah = $derived(pageMeta.sekolah);

	function plainAlamat(alamat?: Alamat) {
		if (!alamat) return '-';
		return `${alamat.jalan || '-'}, ${alamat.desa || '-'}, ${alamat.kabupaten || '-'}, ${alamat.kecamatan || '-'}, ${alamat.provinsi || '-'}, ${alamat.kodePos || '-'}`;
	}

	onMount(() => {
		// arahkan ke form jika belum ada data sekolah
		if (!sekolah) goto('/sekolah/form');
	});
</script>

<div
	class="bg-base-100 rounded-box relative mx-auto mt-8 flex max-w-3xl flex-col items-center gap-8 p-6 shadow sm:flex-row sm:p-10"
>
	<!-- Logo -->
	<div class="flex-shrink-0">
		<div
			class="bg-base-200 flex h-36 w-36 items-center justify-center overflow-hidden rounded-full shadow-lg"
		>
			<img
				src={sekolah?.logoURL || '/sekolah.png'}
				alt="Logo sekolah"
				class="h-32 w-32 object-contain"
			/>
		</div>
	</div>
	<!-- Data Sekolah -->
	<div class="space-y-4">
		<h2 class="text-base-content mb-4 text-2xl font-bold">{sekolah?.nama}</h2>
		<div class="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
			<div class="text-base-content/70 text-sm font-semibold">Jenjang Pendidikan</div>
			<div class="text-base-content sm:col-span-2">{sekolah?.jenjangPendidikan}</div>
		</div>
		<div class="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
			<div class="text-base-content/70 text-sm font-semibold">NPSN</div>
			<div class="text-base-content sm:col-span-2">{sekolah?.npsn}</div>
		</div>
		<div class="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
			<div class="text-base-content/70 text-sm font-semibold">Kepala Sekolah</div>
			<div class="text-base-content sm:col-span-2">
				<div class="tooltip" data-tip={sekolah?.kepalaSekolah?.nip}>
					{sekolah?.kepalaSekolah?.nama}
				</div>
			</div>
		</div>
		<div class="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
			<div class="text-base-content/70 text-sm font-semibold">Alamat</div>
			<div class="text-base-content leading-relaxed sm:col-span-2">
				{plainAlamat(sekolah?.alamat)}
			</div>
		</div>
		<div class="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
			<div class="text-base-content/70 text-sm font-semibold">Website Sekolah</div>
			<div class="text-primary break-all underline sm:col-span-2">
				<a href={sekolah?.website || '#'} target="_blank">{sekolah?.website || '-'}</a>
			</div>
		</div>
		<div class="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
			<div class="text-base-content/70 text-sm font-semibold">Email Sekolah</div>
			<div class="link link-accent break-all sm:col-span-2">
				{#if sekolah?.email}
					<a href="mailto:{sekolah.email}" target="_blank">{sekolah.email}</a>
				{:else}
					-
				{/if}
			</div>
		</div>
	</div>
	<!-- Edit -->
	<a
		href="/sekolah/form"
		class="btn btn-primary absolute right-4 bottom-4 shadow-none"
		aria-label="Edit data sekolah"
	>
		Edit
	</a>
</div>
