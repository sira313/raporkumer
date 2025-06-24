<script lang="ts">
	import { showModal } from '$lib/components/global-modal.svelte';
	import { toast } from '$lib/components/toast/state.svelte';
	import db from '$lib/data/db';
	import iconDel from '$lib/icons/del.svg?raw';
	import IconDownload from '$lib/icons/download.svg?raw';
	import iconExport from '$lib/icons/export.svg?raw';
	import iconEye from '$lib/icons/eye.svg?raw';
	import iconImport from '$lib/icons/import.svg?raw';
	import IconPlus from '$lib/icons/plus.svg?raw';
	import IconSearch from '$lib/icons/search.svg?raw';
	import { onMount } from 'svelte';
	import DetilMurid from './detil-murid.svelte';
	import FormMurid from './form-murid.svelte';

	let formMuridShown = $state(false);
	let formMuridData = $state<Murid>();
	let detailMuridData = $state<Murid>();

	let murid = $state<Murid[]>([]);
	let loading = $state(false);
	let limit = $state(50);

	async function load() {
		try {
			loading = true;
			const result = await db.murid.limit(limit).toArray();
			murid = result;
		} catch (error) {
			console.error(error);
			toast('Terjadi kesalahan saat memuat data murid', 'error');
		} finally {
			loading = false;
		}
	}

	async function deleteMurid(murid: Murid) {
		showModal({
			title: 'Hapus Murid',
			body: `Anda yakin untuk menghapus data murid ini? <br />
				NIS: <strong>${murid.nis}</strong> <br />
				Nama: <strong>${murid.nama}</strong> <br /><br />
				<em>Tidak ada opsi undo</em>`.replaceAll('\t', ''),
			dismissible: true,
			onNeutral: {
				label: 'Batal',
				action({ close }) {
					close();
				}
			},
			onNegative: {
				label: 'Ya, yakin',
				async action({ close }) {
					try {
						await db.murid.delete(murid.nis);
						close();
						load();
						toast('Data murid telah dihapus');
					} catch (error) {
						console.log(error);
						toast('Gagal menghapus data murid', 'error');
					}
				}
			}
		});
	}

	onMount(() => {
		load();
	});
</script>

<fieldset class="fieldset bg-base-100 w-full rounded-lg border border-none p-4 shadow-md">
	<legend class="fieldset-legend">Formulir Dan Tabel Isian Data Murid</legend>
	<div class="mb-4 flex flex-col gap-2 sm:flex-row">
		<!-- Tombol Tambah Manual -->
		<button class="btn flex items-center shadow-none" onclick={() => (formMuridShown = true)}>
			<span>{@html IconPlus}</span>
			Tambah Murid
		</button>

		<!-- Tombol Download template excel -->
		<button class="btn shadow-none sm:ml-auto">
			<span>{@html IconDownload}</span>
			Download Template
		</button>
		<!-- Tombol Import file template yang sudah diisi -->
		<button class="btn shadow-none">
			<span>{@html iconImport}</span>
			Import
		</button>
		<!-- Tombol Export daftar murid dalam bentuk excel -->
		<button class="btn shadow-none">
			<span>{@html iconExport}</span>
			Export
		</button>
	</div>

	<div class="flex flex-col items-center gap-2 sm:flex-row">
		<!-- Cari nama murid -->
		<label class="input bg-base-200 dark:border-none">
			<span>{@html IconSearch}</span>
			<input type="search" required placeholder="Cari nama murid..." />
		</label>

		{#if loading}
			<em class="opacity-50">Loading...</em>
		{/if}

		<!-- pagination -->
		<div class="join sm:ml-auto">
			<button class="join-item btn btn-active">1</button>
			<button class="join-item btn">2</button>
			<button class="join-item btn">3</button>
			<button class="join-item btn">4</button>
		</div>
	</div>

	<!-- Tabel daftar murid -->
	<div
		class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
	>
		<table class="border-base-200 table border dark:border-none">
			<!-- head -->
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th><input type="checkbox" checked={false} class="checkbox" /></th>
					<th style="width: 50px; min-width: 40px;">No</th>
					<th style="width: 60%;">Nama</th>
					<th>Tempat Lahir</th>
					<th>Tanggal Lahir</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#each murid as m, index (m)}
					<tr>
						<td><input type="checkbox" checked={false} class="checkbox" /></td>
						<td>{index + 1}</td>
						<td>{m.nama}</td>
						<td>{m.tempatLahir}</td>
						<td>{m.tanggalLahir}</td>
						<td>
							<div class="flex flex-row gap-2">
								<button
									class="btn btn-sm btn-ghost btn-circle"
									type="button"
									onclick={() => (detailMuridData = m)}
								>
									<span>{@html iconEye}</span>
								</button>

								<button
									class="btn btn-sm btn-ghost btn-circle"
									type="button"
									onclick={() => deleteMurid(m)}
								>
									<span class="text-error">{@html iconDel}</span>
								</button>
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="text-center p-7" colspan="6">
							<em class="opacity-50">Belum ada data murid</em>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</fieldset>

{#if formMuridShown}
	<FormMurid
		murid={formMuridData}
		onDismiss={() => {
			formMuridData = undefined;
			formMuridShown = false;
			load();
		}}
	/>
{/if}

{#if detailMuridData}
	<DetilMurid
		murid={detailMuridData}
		onDismiss={() => (detailMuridData = undefined)}
		onEdit={(m) => {
			formMuridData = m;
			formMuridShown = true;
			detailMuridData = undefined;
		}}
	/>
{/if}
