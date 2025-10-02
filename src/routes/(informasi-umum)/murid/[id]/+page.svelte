<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import { jenisKelamin } from '$lib/statics.js';
	import { modalRoute } from '$lib/utils.js';

	let { data } = $props();

	let kelas = `${data.murid.kelas?.nama || '-'} Fase ${data.murid.kelas?.fase || '-'}`;
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
				<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
					{@render field('NIS', data.murid.nis)}
					{@render field('NISN', data.murid.nisn)}
					{@render field('Nama', data.murid.nama)}
					{@render field('Kelas', kelas)}
					{@render field('Jenis Kelamin', jenisKelamin[data.murid.jenisKelamin])}
					{@render field('Tempat Lahir', data.murid.tempatLahir)}
					{@render field('Tanggal Lahir', data.murid.tanggalLahir)}
					{@render field('Agama', data.murid.agama)}
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

<div class="mt-4 flex flex-col sm:flex-row gap-2">
	<a class="btn border-none shadow-none" href="/murid">
		<Icon name="close" />
		Tutup
	</a>
	<div class="flex-1"></div>

	<a
		class="btn btn-primary border-none shadow-none"
		href="/murid/form/{data.murid.id}"
		use:modalRoute={'edit-murid'}
	>
		<Icon name="edit" />
		Edit
	</a>
</div>
