<script lang="ts">
	import { page } from '$app/state';
	import Icon from '$lib/components/icon.svelte';
	import { autoSubmit, modalRoute, searchQueryMarker } from '$lib/utils';
	import DetailMurid from './[id]/+page.svelte';
	import DeleteMurid from './[id]/delete/+page.svelte';
	import FormMurid from './form/[[id]]/+page.svelte';

	let { data } = $props();
</script>

<div class="card bg-base-100 mx-auto w-full max-w-4xl rounded-lg border border-none p-4 shadow-md">
	<h2 class="mb-6 text-xl font-bold">Formulir Dan Tabel Isian Data Murid</h2>
	<div class="mb-4 flex flex-col gap-2 sm:flex-row">
		<!-- Tombol Tambah Manual -->
		<a class="btn flex items-center shadow-none" href="/murid/form" use:modalRoute={'add-murid'}>
			<Icon name="plus" />
			Tambah Murid
		</a>

		<!-- Tombol Download template excel -->
		<button class="btn shadow-none sm:ml-auto">
			<Icon name="download" />
			Download Template
		</button>
		<!-- Tombol Import file template yang sudah diisi -->
		<button class="btn shadow-none">
			<Icon name="import" />
			Import
		</button>
		<!-- Tombol Export daftar murid dalam bentuk excel -->
		<button class="btn shadow-none">
			<Icon name="export" />
			Export
		</button>
	</div>

	<form
		class="flex flex-col items-center gap-2 sm:flex-row"
		data-sveltekit-keepfocus
		data-sveltekit-replacestate
		use:autoSubmit
	>
		<!-- Cari nama murid -->
		<label class="input bg-base-200 dark:border-none">
			<Icon name="search" />
			<input
				type="search"
				name="q"
				value={data.page.search}
				spellcheck="false"
				placeholder="Cari nama murid..."
				autocomplete="name"
			/>
		</label>

		<select
			class="select bg-base-200 dark:border-none"
			title="Pilih kelas"
			name="kelas_id"
			value={data.page.kelasId}
		>
			<option value={null} disabled selected> Pilih Kelas </option>
			{#each data.daftarKelas as kelas (kelas)}
				<option value={kelas.id + ''}>
					Kelas: {kelas.nama} &bullet; Fase: {kelas.fase}
				</option>
			{:else}
				<option value={null} disabled selected> Belum ada data kelas </option>
			{/each}
		</select>

		<!-- pagination -->
		<div class="join sm:ml-auto">
			<button type="button" class="join-item btn btn-active">1</button>
			<button type="button" class="join-item btn">2</button>
			<button type="button" class="join-item btn">3</button>
			<button type="button" class="join-item btn">4</button>
		</div>
	</form>

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
				{#each data.daftarMurid as murid, index (murid)}
					<tr>
						<td><input type="checkbox" checked={false} class="checkbox" /></td>
						<td>{index + 1}</td>
						<td>{@html searchQueryMarker(data.page.search, murid.nama)}</td>
						<td>{murid.tempatLahir}</td>
						<td>{murid.tanggalLahir}</td>
						<td>
							<div class="flex flex-row gap-2">
								<a
									class="btn btn-sm btn-soft shadow-none"
									href="/murid/{murid.id}"
									use:modalRoute={'detail-murid'}
									title="Lihat detail murid"
								>
									<Icon name="eye" />
								</a>

								<a
									class="btn btn-sm btn-error btn-soft shadow-none"
									href="/murid/{murid.id}/delete"
									use:modalRoute={'delete-murid'}
									title="Hapus data murid"
								>
									<Icon name="del" />
								</a>
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
</div>

{#if ['add-murid', 'edit-murid'].includes(page.state.modal?.name)}
	<dialog class="modal" open>
		<div class="modal-box p-4 sm:w-full sm:max-w-2xl">
			<FormMurid data={page.state.modal?.data} />
		</div>
	</dialog>
{/if}

{#if page.state.modal?.name == 'detail-murid'}
	<dialog class="modal" onclose={() => history.back()} open>
		<div class="modal-box p-4 sm:w-full sm:max-w-2xl">
			<DetailMurid data={page.state.modal?.data} />
		</div>
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>
{/if}

{#if page.state.modal?.name == 'delete-murid'}
	<dialog class="modal" onclose={() => history.back()} open>
		<div class="modal-box">
			<DeleteMurid data={page.state.modal?.data} />
		</div>
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>
{/if}
