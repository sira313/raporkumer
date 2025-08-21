<script lang="ts">
	import { invalidate } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';
	import { autoSubmit } from '$lib/utils';

	let { data } = $props();
	let deleteEkskulData = $state<Ekstrakurikuler>();
</script>

<div class="card bg-base-100 rounded-box mx-auto w-full max-w-4xl border border-none p-4 shadow-md">
	<h2 class="mb-6 text-xl font-bold">Daftar Extrakurikuler</h2>

	<!-- Select Kelas akan dihapus dan dipindahkan ke navbar -->
	<!-- <form data-sveltekit-keepfocus data-sveltekit-replacestate use:autoSubmit>
		<select
			class="select bg-base-200 mb-2 w-full dark:border-none"
			name="kelas_id"
			title="Pilih kelas"
			value={data.kelasId || ''}
		>
			<option value="" disabled selected> Pilih Kelas </option>
			{#each data.daftarKelas as kelas}
				<option value={kelas.id + ''}>Kelas: {kelas.nama} - Fase: {kelas.fase}</option>
			{:else}
				<option value="" disabled selected> Belum ada data kelas </option>
			{/each}
		</select>
	</form> -->

	<FormEnhance
		action="?/add"
		onsuccess={({ form }) => {
			(form.elements.namedItem('nama') as HTMLInputElement).value = '';
			invalidate('app:ekstrakurikuler');
		}}
	>
		{#snippet children({ submitting })}
			<div class="mb-2 flex w-full flex-col gap-2 sm:flex-row">
				<input name="kelasId" value={data.kelasId} hidden />
				<!-- input ekstrakurikuler -->
				<input
					class="input bg-base-200 w-full dark:border-none"
					placeholder="Ketik nama ekstrakurikuler"
					name="nama"
					required
				/>
				<!-- tambah extrakurikuler -->
				<!-- request feature: tombol berubah menjadi del saat user checklist mapel extrakurikuler -->
				<button class="btn shadow-none" disabled={submitting || !data.kelasId}>
					{#if submitting}
						<div class="loading loading-spinner"></div>
					{:else}
						<Icon name="plus" />
					{/if}
					Tambah
				</button>
			</div>
		{/snippet}
	</FormEnhance>

	<div class="bg-base-100 dark:bg-base-200 overflow-x-auto rounded-md shadow-md dark:shadow-none">
		<!-- Tabel data -->
		<table class="border-base-200 table border dark:border-none">
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th style="width: 50px; min-width: 40px;"><input type="checkbox" class="checkbox" /></th>
					<th style="width: 50px; min-width: 40px;">No</th>
					<th class="w-full" style="min-width: 150px;">Ekstrakurikuler</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#each data.ekskul as eks, index (eks)}
					<tr>
						<td><input type="checkbox" class="checkbox" /></td>
						<td>{index + 1}</td>
						<td>{eks.nama}</td>
						<td>
							<div class="flex flex-row gap-2">
								<button
									class="btn btn-sm btn-error btn-soft shadow-none"
									type="button"
									title="Hapus"
									onclick={() => (deleteEkskulData = eks)}
								>
									<Icon name="del" />
								</button>
							</div>
						</td>
					</tr>
				{:else}
					<tr>
						<td class="text-center italic opacity-50" colspan="4">Belum ada data</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#if deleteEkskulData}
	<dialog class="modal" open onclose={() => (deleteEkskulData = undefined)}>
		<div class="modal-box">
			<FormEnhance
				action="?/delete"
				onsuccess={() => {
					deleteEkskulData = undefined;
					invalidate('app:ekstrakurikuler');
				}}
			>
				{#snippet children({ submitting })}
					<input name="id" value={deleteEkskulData?.id} hidden />

					<h3 class="mb-4 text-xl font-bold">Hapus ekstrakurikuler?</h3>
					<p>"{deleteEkskulData?.nama}"</p>

					<div class="mt-4 flex justify-end gap-2">
						<button
							class="btn shadow-none"
							type="button"
							onclick={() => (deleteEkskulData = undefined)}
						>
							Batal
						</button>

						<button class="btn btn-error btn-soft shadow-none" disabled={submitting}>
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
		<form method="dialog" class="modal-backdrop">
			<button>close</button>
		</form>
	</dialog>
{/if}
