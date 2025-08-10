<script>
	import Icon from '$lib/components/icon.svelte';
	let showModal = false;
</script>

<div class="card bg-base-100 mx-auto w-full max-w-4xl rounded-lg border border-none p-4 shadow-md">
	<h2 class="mb-6 text-xl font-bold">Daftar Kokurikuler</h2>

	<div class="mb-2 flex flex-col gap-2 sm:flex-row">
		<button class="btn shadow-none" on:click={() => (showModal = true)}>
			<Icon name="plus" />
			Tambah
		</button>
		<button class="btn shadow-none sm:ml-auto">
			<Icon name="del" />
			Hapus
		</button>
	</div>

	<div
		class="bg-base-100 dark:bg-base-200 mt-4 overflow-x-auto rounded-md shadow-md dark:shadow-none"
	>
		<table class="border-base-200 table border dark:border-none">
			<thead>
				<tr class="bg-base-200 dark:bg-base-300 text-base-content text-left font-bold">
					<th style="width: 50px; min-width: 40px;">
						<input type="checkbox" class="checkbox" />
					</th>
					<th>No</th>
					<th>8 DPL</th>
					<th class="w-full" style="min-width: 100px;">Tujuan Kokurikuler</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>
						<input type="checkbox" class="checkbox" />
					</td>
					<td>1</td>
					<td> Kolaborasi </td>
					<td>
						bekerja sama dengan sesama teman pada beberapa projek pembelajaran interdisipliner
					</td>
				</tr>
				<tr>
					<td>
						<input type="checkbox" class="checkbox" />
					</td>
					<td>2</td>
					<td> Kreativitas </td>
					<td>
						kemampuan menemukan dan mengembangkan alternatif solusi yang efektif pada pada tema
						konservasi energi
					</td>
				</tr>
			</tbody>
		</table>
	</div>
</div>

<!-- Modal tambah kokurikuler -->
{#if showModal}
	<div
		class="modal modal-open"
		tabindex="-1"
		role="dialog"
		aria-modal="true"
		on:keydown={(e) => {
			if (e.key === 'Escape') showModal = false;
		}}
	>
		<dialog class="modal-box relative z-10" open aria-modal="true">
			<h3 class="mb-2 text-lg font-bold">Tambah Kokurikuler</h3>
			<p class="py-4 font-bold">Pilih 8 Dimensi Profil Lulusan</p>
			<div class="mb-2 grid grid-cols-2 gap-2">
				<div class="flex flex-row gap-2">
					<input type="checkbox" class="checkbox" />
					Keimanan dan Ketakwaan kepada Tuhan Yang Maha Esa
				</div>
				<div class="flex flex-row gap-2">
					<input type="checkbox" class="checkbox" />
					Kewargaan
				</div>
				<div class="flex flex-row gap-2">
					<input type="checkbox" class="checkbox" />
					Penalaran kritis
				</div>
				<div class="flex flex-row gap-2">
					<input type="checkbox" class="checkbox" />
					Kreativitas
				</div>
				<div class="flex flex-row gap-2">
					<input type="checkbox" class="checkbox" />
					Kolaborasi
				</div>
				<div class="flex flex-row gap-2">
					<input type="checkbox" class="checkbox" />
					Kemandirian
				</div>
				<div class="flex flex-row gap-2">
					<input type="checkbox" class="checkbox" />
					Kesehatan
				</div>
				<div class="flex flex-row gap-2">
					<input type="checkbox" class="checkbox" />
					Komunikasi
				</div>
			</div>
			<p class="py-4 font-bold">Tujuan Kokurikuler</p>
			<textarea
				class="textarea dark:bg-base-200 h-24 w-full dark:border-none"
				placeholder="Ketik tujuan kokurikuler"
			></textarea>
			<div class="modal-action">
				<button class="btn shadow-none" on:click={() => (showModal = false)}>
					<Icon name="close" />
					Batal
				</button>
				<button class="btn shadow-none">
					<Icon name="save" />
					Simpan
				</button>
			</div>
		</dialog>
	</div>
{/if}
