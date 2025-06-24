<script lang="ts">
	import { toast } from '$lib/components/toast/state.svelte';
	import db from '$lib/data/db';
	import { onMount } from 'svelte';

	interface Props {
		murid: Murid;
		onEdit: (m: Murid) => void;
		onDismiss: () => void;
	}

	let { murid, onEdit, onDismiss }: Props = $props();
	let kelas = $state<Kelas>();
	let kelasLoading = $state(false);

	async function loadKelas() {
		try {
			kelasLoading = true;
			const result = await db.kelas.get(murid.kelasId);
			kelas = result;
		} catch (error) {
			console.error(error);
			toast(`Gagal memuat data kelas dari murid "${murid.nama}"`, 'warning');
		} finally {
			kelasLoading = false;
		}
	}

	onMount(() => {
		loadKelas();
	});
</script>

{#snippet field(label: string, value: string)}
	<!-- use snippet for repeatable elements -->
	<div>
		<span class="text-sm text-gray-500">{label}</span>
		<p class="font-medium">{value}</p>
	</div>
{/snippet}

<dialog class="modal" onclose={() => onDismiss()} open>
	<fieldset class="fieldset modal-box p-4 sm:w-full sm:max-w-2xl">
		<legend class="fieldset-legend">
			<pre class="bg-base-200 rounded-xl px-2">Detail Data Murid</pre>
		</legend>
		<div class="max-h-[60vh] overflow-y-auto sm:max-h-none sm:overflow-y-visible">
			<div class="join join-vertical w-full max-w-full">
				<div class="tabs tabs-box">
					<!-- data Murid -->
					<input type="radio" name="tab-detil-murid" class="tab" aria-label="Data Murid" checked />
					<div class="tab-content bg-base-100 p-4">
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							{@render field('NIS', murid.nis)}
							{@render field('NISN', murid.nisn)}
							{@render field('Nama', murid.nama)}
							{@render field('Kelas', `${kelas?.nama || '-'} - ${kelas?.fase || '-'}`)}
							{@render field('Jenis Kelamin', murid.jenisKelamin)}
							{@render field('Tempat Lahir', murid.tempatLahir)}
							{@render field('Tanggal Lahir', murid.tanggalLahir)}
							{@render field('Agama', murid.agama)}
						</div>
					</div>
					<!-- data Orang Tua -->
					<input type="radio" name="tab-detil-murid" class="tab" aria-label="Data Orang Tua" />
					<div class="tab-content bg-base-100 p-4">
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							{@render field('Nama Ayah', murid.orangTua?.namaAyah || '-')}
							{@render field('Pekerjaan Ayah', murid.orangTua?.pekerjaanAyah || '-')}
							{@render field('Nama Ibu', murid.orangTua?.namaIbu || '-')}
							{@render field('Pekerjaan Ibu', murid.orangTua?.pekerjaanIbu || '-')}
							{@render field('Kontak', murid.orangTua?.kontak || '-')}
						</div>
					</div>
					<!-- data Alamat Murid -->
					<input type="radio" name="tab-detil-murid" class="tab" aria-label="Data Alamat Murid" />
					<div class="tab-content bg-base-100 p-4">
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							{@render field('Jalan', murid.alamat?.jalan || '-')}
							{@render field('Kelurahan/Desa', murid.alamat?.desa || '-')}
							{@render field('Kecamatan', murid.alamat?.kecamatan || '-')}
							{@render field('Kabupaten/Kota', murid.alamat?.kabupaten || '-')}
							{@render field('Provinsi', murid.alamat?.provinsi || '-')}
						</div>
					</div>
					<!-- data Wali -->
					<input type="radio" name="tab-detil-murid" class="tab" aria-label="Data Wali" />
					<div class="tab-content bg-base-100 p-4">
						<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
							{@render field('Nama Wali', murid.wali?.nama || '-')}
							{@render field('Pekerjaan Wali', murid.wali?.pekerjaan || '-')}
							{@render field('Alamat Wali', murid.wali?.alamat || '-')}
							{@render field('Kontak', murid.wali?.kontak || '-')}
						</div>
					</div>
				</div>
			</div>
		</div>
		<button
			class="btn btn-primary mt-4 border-none shadow-none sm:ml-auto"
			type="button"
			onclick={() => onEdit(murid)}
		>
			Edit
		</button>
	</fieldset>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
