<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- page uses href/goto intentionally for navigation */
	import Icon from '$lib/components/icon.svelte';
	import { jenisKelamin } from '$lib/statics.js';
	import { modalRoute } from '$lib/utils.js';
	import { onMount, onDestroy } from 'svelte';

	let { data } = $props();

	let kelas = `${data.murid.kelas?.nama || '-'} Fase ${data.murid.kelas?.fase || '-'}`;

	// compute a robust image src for the detail modal:
	// - if `data.murid.foto` is a URL or data URI, use it directly
	// - otherwise fallback to the internal API endpoint and add a cache-busting
	//   query param so updated photos are fetched instead of a cached image
	const photoSrc = $derived(
		!data?.murid?.foto
			? null
			: typeof data.murid.foto === 'string'
				? data.murid.foto.startsWith('http') ||
					data.murid.foto.startsWith('data:') ||
					data.murid.foto.startsWith('/')
					? data.murid.foto
					: `/api/murid-photo/${data.murid.id}?v=${encodeURIComponent(data.murid.foto)}`
				: `/api/murid-photo/${data.murid.id}?t=${Date.now()}`
	);

	let _muridUpdatedHandler: ((e: CustomEvent<Record<string, unknown>>) => void) | null = null;

	onMount(() => {
		_muridUpdatedHandler = (e: CustomEvent<Record<string, unknown>>) => {
			try {
				const detail = (e?.detail ?? null) as Record<string, unknown> | null;
				if (!detail) return;
				// match by id
				if (String(detail.id) === String(data?.murid?.id)) {
					// include timestamp in foto field to bust cache when filename unchanged
					const newFoto = detail?.foto ? `${detail.foto}${detail.t ? `?t=${detail.t}` : ''}` : null;
					// reassign `data` so runes reactivity picks up change
					data = { ...data, murid: { ...(data.murid ?? {}), foto: newFoto } };
				}
			} catch (err) {
				console.debug('murid:updated handler error', err);
			}
		};
		window.addEventListener('murid:updated', _muridUpdatedHandler as EventListener);
	});

	onDestroy(() => {
		if (_muridUpdatedHandler)
			window.removeEventListener('murid:updated', _muridUpdatedHandler as EventListener);
	});
</script>

{#snippet field(label: string, value?: string | null)}
	<!-- use snippet for repeatable elements -->
	<div>
		<span class="text-sm text-gray-500">{label}</span>
		<p class="font-medium">{value || '-'}</p>
	</div>
{/snippet}

<div class="mb-6 text-xl font-bold">Detail Data Murid</div>
<div class="max-h-[60vh] overflow-y-auto sm:max-h-none sm:overflow-y-visible">
	<div class="join join-vertical w-full max-w-full">
		<div class="tabs tabs-box">
			<!-- data Murid -->
			<input type="radio" name="tab-detil-murid" class="tab" aria-label="Data Murid" checked />
			<div class="tab-content bg-base-100 p-4">
				<div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
					<!-- Foto murid (placeholder) -->
					<div class="flex items-start sm:col-span-1 sm:pr-4">
						<div
							class="bg-base-200 flex aspect-3/4 w-full max-w-xs items-center justify-center overflow-hidden rounded-lg object-cover"
						>
							{#if photoSrc}
								<img src={photoSrc} alt="Foto murid" class="h-full w-full object-cover" />
							{:else}
								<!-- Simple placeholder: initials or icon -->
								<div class="p-4 text-center opacity-60">
									<Icon name="user" class="mx-auto text-6xl" />
									<p class="mt-2 text-sm">Foto belum tersedia</p>
								</div>
							{/if}
						</div>
					</div>
					<!-- Data fields (kept as two-column grid inside the right area) -->
					<div class="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-2">
						{@render field('NIS', data.murid.nis)}
						{@render field('NISN', data.murid.nisn)}
						{@render field('Nama', data.murid.nama)}
						{@render field('Kelas', kelas)}
						{@render field('Tempat Lahir', data.murid.tempatLahir)}
						{@render field('Tanggal Lahir', data.murid.tanggalLahir)}
						{@render field('Jenis Kelamin', jenisKelamin[data.murid.jenisKelamin])}
						{@render field('Agama', data.murid.agama)}
						{@render field('Pendidikan Sebelumnya', data.murid.pendidikanSebelumnya)}
						{@render field('Tanggal Masuk Sekolah Ini', data.murid.tanggalMasuk)}
					</div>
				</div>
			</div>
			<!-- data Orang Tua -->
			<input type="radio" name="tab-detil-murid" class="tab" aria-label="Data Orang Tua" />
			<div class="tab-content bg-base-100 p-4">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{@render field('Nama Ayah', data.murid.ayah?.nama)}
					{@render field('Pekerjaan Ayah', data.murid.ayah?.pekerjaan)}
					{@render field('Nama Ibu', data.murid.ibu?.nama)}
					{@render field('Pekerjaan Ibu', data.murid.ibu?.pekerjaan)}
					{@render field(
						'Kontak',
						data.murid.ayah?.kontak || data.murid.ibu?.kontak || data.murid.wali?.kontak
					)}
				</div>
			</div>
			<!-- data Alamat Murid -->
			<input type="radio" name="tab-detil-murid" class="tab" aria-label="Data Alamat Murid" />
			<div class="tab-content bg-base-100 p-4">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{@render field('Jalan', data.murid.alamat?.jalan)}
					{@render field('Kelurahan/Desa', data.murid.alamat?.desa)}
					{@render field('Kecamatan', data.murid.alamat?.kecamatan)}
					{@render field('Kabupaten/Kota', data.murid.alamat?.kabupaten)}
					{@render field('Provinsi', data.murid.alamat?.provinsi)}
				</div>
			</div>
			<!-- data Wali -->
			<input type="radio" name="tab-detil-murid" class="tab" aria-label="Data Wali" />
			<div class="tab-content bg-base-100 p-4">
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{@render field('Nama Wali', data.murid.wali?.nama)}
					{@render field('Pekerjaan Wali', data.murid.wali?.pekerjaan)}
					{@render field('Alamat Wali', data.murid.wali?.alamat)}
					{@render field('Kontak', data.murid.wali?.kontak)}
				</div>
			</div>
		</div>
	</div>
</div>

<div class="mt-4 flex flex-col gap-2 sm:flex-row">
	<a class="btn btn-soft shadow-none" href="/murid">
		<Icon name="close" />
		Tutup
	</a>
	<div class="flex-1"></div>

	<a
		class="btn btn-primary btn-soft shadow-none"
		href="/murid/form/{data.murid.id}"
		use:modalRoute={'edit-murid'}
	>
		<Icon name="edit" />
		Edit
	</a>
</div>
