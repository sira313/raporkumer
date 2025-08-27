<script lang="ts">
	import { invalidate } from '$app/navigation';
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';

	let { data } = $props();
	let deleteKelasData = $state<Omit<Kelas, 'sekolah'>>();
</script>

<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
	{#each data.daftarKelas as kelas (kelas)}
		<div class="card bg-base-100 rounded-box shadow-md">
			<div class="card-body">
				<div class="flex items-start justify-between">
					<h2 class="card-title text-xl font-bold">{kelas.nama}</h2>
					<div class="badge badge-accent">{kelas.fase}</div>
				</div>
				<div class="divider m-0"></div>
				<div class="card-actions border-base-200 mt-auto items-center justify-start pt-4">
					<div class="avatar">
						<Icon name="user" class="text-4xl" />
					</div>
					<div class="ml-3">
						<div class="text-base-content/60 text-sm">Wali Kelas</div>
						<div class="text-xl font-semibold">{kelas.waliKelas?.nama}</div>
						<p class="text-base-content/70 text-sm">NIP {kelas.waliKelas?.nip}</p>
					</div>
				</div>
				<div class="mt-6 flex justify-end gap-2">
					<button
						class="btn btn-error btn-soft shadow-none"
						type="button"
						onclick={() => (deleteKelasData = kelas)}
					>
						<Icon name="del" />
						Hapus
					</button>
					<a href="/kelas/form/{kelas.id}" class="btn btn-soft shadow-none">
						<Icon name="edit" />
						Edit
					</a>
				</div>
			</div>
		</div>
	{:else}
		<div class="card bg-base-100 rounded-box flex items-center justify-center min-h-40">
			<div class="p-6 text-center items-center justify-center">
				<em class="opacity-50">Belum ada data kelas</em>
			</div>
		</div>
	{/each}
	<a
		href="/kelas/form"
		class="card bg-base-100 rounded-box border-base-300 hover:bg-base-200 flex min-h-40 border-2 border-dashed transition-colors duration-300"
	>
		<div class="my-auto items-center justify-center text-center">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="text-base-content/30 mx-auto h-12 w-12"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="1"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
			</svg>
			<p class="text-base-content/50 mt-2">Tambah Kelas Baru</p>
		</div>
	</a>
</div>

{#if deleteKelasData}
	<dialog class="modal" open onclose={() => (deleteKelasData = undefined)}>
		<div class="modal-box p-4">
			<FormEnhance
				action="?/delete"
				onsuccess={() => {
					deleteKelasData = undefined;
					invalidate('app:kelas');
				}}
			>
				{#snippet children({ submitting })}
					<input name="id" value={deleteKelasData?.id} hidden />

					<h3 class="mb-4 text-xl font-bold">Hapus kelas?</h3>
					<p>Kelas: {deleteKelasData?.nama}</p>
					<p class="mb-4">Fase: {deleteKelasData?.fase}</p>

					<div class="flex justify-end gap-2">
						<button
							class="btn shadow-none"
							type="button"
							onclick={() => (deleteKelasData = undefined)}
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
