<script lang="ts">
	import { invalidate } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';

	let { data } = $props();
	let tambahTpAktif = $state(false);
	let editTpId = $state<number>();
	let deleteTpData = $state<Omit<TujuanPembelajaran, 'mataPelajaran'>>();

	function closeForm() {
		tambahTpAktif = false;
		editTpId = undefined;
	}
</script>

<!-- Data Mapel Wajib -->
<div class="card bg-base-100 rounded-box mx-auto w-full max-w-4xl border border-none p-4 shadow-md">
	<!-- Judul IPAS bisa berubah dinamis sesuai mata pelajaran yang dipilih -->
	<h2 class="mb-6 text-xl font-bold">
		<span class="opacity-50">Mata Pelajaran:</span>
		{data.mapel.nama} &bullet; Kelas: {data.mapel.kelas.nama}
	</h2>

	<!-- tombol tambah Tujuan Pembelajaran -->
	<div class="flex flex-col gap-2 sm:flex-row">
		<button class="btn shadow-none" type="button" onclick={() => history.back()}>
			<Icon name="left" />
			Kembali
		</button>
		<button
			class="btn mb-2 shadow-none sm:max-w-40"
			onclick={() => (tambahTpAktif = true)}
			type="button"
			disabled={tambahTpAktif}
		>
			<Icon name="plus" />
			Tambah TP
		</button>
		<!-- Tombol ini hanya aktif bila user centang mapel untuk hapus -->
		<button disabled class="btn btn-error mb-2 shadow-none sm:ml-auto sm:max-w-40">
			<Icon name="del" />
			Hapus TP
		</button>
	</div>
	<div class="bg-base-100 dark:bg-base-200 overflow-x-auto rounded-md shadow-md dark:shadow-none">
		<table class="border-base-200 table border dark:border-none">
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th style="width: 50px; min-width: 40px;"><input type="checkbox" class="checkbox" /></th>
					<th style="width: 50px; min-width: 40px;">No</th>
					<th style="width: 50%;">Tujuan Pembelajaran</th>
					<th style="width: 50%">Lingkup Materi</th>
					<th>Aksi</th>
				</tr>
			</thead>
			<tbody>
				{#if tambahTpAktif}
					{@render form_tujuan_pembelajaran(data.tujuanPembelajaran.length)}
				{/if}

				{#each data.tujuanPembelajaran as tp, index (tp)}
					{#if editTpId == tp.id}
						{@render form_tujuan_pembelajaran(index, tp)}
					{:else}
						<tr>
							<td><input type="checkbox" class="checkbox" /></td>
							<td>{index + 1}</td>
							<td>{tp.deskripsi}</td>
							<td class="flex flex-row gap-2"> {tp.lingkupMateri} </td>
							<td>
								<div class="flex flex-row gap-2">
									<button
										class="btn btn-sm btn-soft shadow-none"
										type="button"
										title="Edit"
										onclick={() => (editTpId = tp.id)}
									>
										<Icon name="edit" />
									</button>
									<button
										class="btn btn-sm btn-soft btn-error shadow-none"
										type="button"
										title="Hapus"
										onclick={() => (deleteTpData = tp)}
									>
										<Icon name="del" />
									</button>
								</div>
							</td>
						</tr>
					{/if}
				{:else}
					<tr>
						<td class="italic text-center opacity-50" colspan="5">Belum ada data</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#snippet form_tujuan_pembelajaran(index: number, tp?: Omit<TujuanPembelajaran, 'mataPelajaran'>)}
	{@const formId = crypto.randomUUID()}
	<tr>
		<td><input type="checkbox" class="checkbox" disabled /></td>
		<td class="text-primary animate-pulse font-semibold">{index + 1}</td>
		<td>
			<textarea
				form={formId}
				class="textarea validator h-36 w-full"
				value={tp?.deskripsi || null}
				name="deskripsi"
				required
			></textarea>
		</td>
		<td>
			<textarea
				form={formId}
				class="textarea validator h-36 w-full"
				value={tp?.lingkupMateri || null}
				name="lingkupMateri"
				required
			></textarea>
		</td>
		<td>
			<FormEnhance
				id={formId}
				action="?/save"
				onsuccess={() => {
					closeForm();
					invalidate('app:mapel_tp-rl');
				}}
			>
				{#snippet children({ submitting })}
					{#if tp?.id}
						<input value={tp.id} name="id" hidden />
					{/if}
					<div class="flex gap-2">
						<button
							class="btn btn-sm btn-soft btn-primary shadow-none"
							title="Simpan"
							disabled={submitting}
						>
							{#if submitting}
								<div class="loading loading-spinner loading-xs"></div>
							{:else}
								<Icon name="save" />
							{/if}
						</button>
						<button
							class="btn btn-sm btn-soft shadow-none"
							type="button"
							title="Batal"
							onclick={closeForm}
						>
							<Icon name="close" />
						</button>
					</div>
				{/snippet}
			</FormEnhance>
		</td>
	</tr>
{/snippet}

{#if deleteTpData}
	<dialog class="modal" open onclose={() => (deleteTpData = undefined)}>
		<div class="modal-box">
			<FormEnhance
				action="?/delete"
				onsuccess={() => {
					deleteTpData = undefined;
					invalidate('app:mapel_tp-rl');
				}}
			>
				{#snippet children({ submitting })}
					<input name="id" value={deleteTpData?.id} hidden />

					<h3 class="mb-4 text-xl font-bold">Hapus tujuan pembelajaran?</h3>
					<p>"{deleteTpData?.deskripsi}"</p>

					<div class="mt-4 flex justify-end gap-2">
						<button
							class="btn shadow-none"
							type="button"
							onclick={() => (deleteTpData = undefined)}
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
