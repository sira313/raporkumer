<script lang="ts">
	import CoverPreview from '$lib/components/cetak/preview/CoverPreview.svelte';
	import { downloadCoverPDF } from '$lib/utils/pdf/cover-pdf-generator';
	import { toast } from '$lib/components/toast.svelte';

	let { data } = $props();

	let showBgLogo = $state(false);

	async function handleDownloadPDF() {
		if (!data.coverData) {
			toast('Data cover tidak tersedia.', 'error');
			return;
		}

		try {
			toast('Membuat PDF...', 'info');

			await downloadCoverPDF({
				sekolah: {
					nama: data.coverData.sekolah.nama,
					jenjang: data.coverData.sekolah.jenjang,
					jenjangVariant: data.coverData.sekolah.jenjangVariant,
					npsn: data.coverData.sekolah.npsn,
					naungan: data.coverData.sekolah.naungan,
					alamat: data.coverData.sekolah.alamat,
					website: data.coverData.sekolah.website,
					email: data.coverData.sekolah.email,
					logoUrl: data.coverData.sekolah.logoUrl
				},
				murid: data.coverData.murid,
				showBgLogo
			});
			toast('PDF berhasil dibuat!', 'success');
		} catch (error) {
			console.error('Error downloading PDF:', error);
			toast('Gagal membuat PDF', 'error');
		}
	}
</script>

<svelte:head>
	<title>{data?.meta?.title ?? 'Cover Rapor'}</title>
</svelte:head>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<!-- Footer Info -->
	<div class="mb-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
		<p>
			{#if data.coverData}
				Cover Rapor untuk <strong>{data.coverData.murid.nama}</strong>
			{:else}
				Data cover tidak tersedia.
			{/if}
		</p>
		<div class="flex flex-col gap-2 sm:flex-row sm:justify-end">
			<label class="label cursor-pointer gap-2">
				<span class="label-text">Logo Background</span>
				<input
					type="checkbox"
					class="toggle toggle-sm"
					bind:checked={showBgLogo}
					title="Tampilkan logo sebagai background watermark"
				/>
			</label>
		</div>
	</div>

	<!-- Download PDF Button -->
	{#if data.coverData}
		<div class="mt-4 flex justify-center">
			<button type="button" class="btn btn-primary gap-2" onclick={handleDownloadPDF}>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="h-5 w-5"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				Download PDF
			</button>
		</div>
	{/if}

	<CoverPreview {data} {showBgLogo} />
</div>
