<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import DeleteKelasModal from '$lib/components/kelas/delete-kelas-modal.svelte';
	import { faseBadgeClass } from '$lib/components/kelas/fase';
	import type { DeleteKelasModalHandle, KelasCard } from '$lib/components/kelas/types';

	let { data } = $props();
	const daftarKelas = $derived((data.daftarKelas ?? []) as KelasCard[]);
	let deleteModalRef: DeleteKelasModalHandle | null = null;
	const academicContext = $derived(data.academicContext ?? null);
	const activeSemester = $derived.by(() => {
		const context = academicContext;
		if (!context?.activeSemesterId) return null;
		for (const tahun of context.tahunAjaranList ?? []) {
			const match = tahun.semester.find((item) => item.id === context.activeSemesterId);
			if (match) {
				return {
					...match,
					tahunAjaranNama: tahun.nama
				};
			}
		}
		return null;
	});
</script>

{#if academicContext}
	{#if academicContext.activeSemesterId}
		<div class="alert alert-info alert-soft mb-6 flex items-center gap-3">
			<Icon name="info" />
			<span>
				Menampilkan kelas untuk
				{#if activeSemester}
					<strong>{activeSemester.nama}</strong>
					({activeSemester.tahunAjaranNama})
				{:else}
					semester aktif
				{/if}.
			</span>
		</div>
	{:else}
		<div class="alert alert-warning mb-6 flex items-center gap-3">
			<Icon name="warning" />
			<span>Setel semester aktif di menu Rapor untuk mulai mengelola data kelas per periode.</span>
		</div>
	{/if}
{/if}

<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
	{#each daftarKelas as kelas (kelas.id)}
		<div class="card bg-base-100 rounded-box shadow-md">
			<div class="p-4">
				<div class="flex items-start justify-between gap-4">
					<div>
						<h2 class="card-title text-xl font-bold">{kelas.nama}</h2>
						<p class="text-base-content/60 text-sm">
							{kelas.tahunAjaran?.nama ?? 'Tahun ajaran belum ditetapkan'} •
							{kelas.semester?.nama ?? 'Semester belum ditetapkan'}
						</p>
					</div>
					<div class={`badge badge-soft ${faseBadgeClass(kelas.fase)}`}>
						{kelas.fase || 'Belum diatur'}
					</div>
				</div>
			</div>
			<div class="border-base-300 dark:border-base-200 m-0 border"></div>
			<div class="p-4">
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
				<div class="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
					<button
						class="btn btn-error btn-soft shadow-none"
						type="button"
						onclick={() => deleteModalRef?.open(kelas)}
					>
						<Icon name="del" />
						Hapus
					</button>
					<a href={`/kelas/form/${kelas.id}`} class="btn btn-soft shadow-none">
						<Icon name="edit" />
						Edit
					</a>
				</div>
			</div>
		</div>
	{:else}
		<div class="card bg-base-100 rounded-box flex items-center justify-center min-h-40">
			<div class="p-6 text-center items-center justify-center">
				{#if academicContext && !academicContext.activeSemesterId}
					<em class="opacity-50"
						>Tentukan semester aktif untuk melihat atau menambahkan data kelas.</em
					>
				{:else}
					<em class="opacity-50">Belum ada data kelas untuk semester ini</em>
				{/if}
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
<DeleteKelasModal bind:this={deleteModalRef} />
