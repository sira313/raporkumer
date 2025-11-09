<script lang="ts">
	import Icon from '$lib/components/icon.svelte';
	import { showModal } from '$lib/components/global-modal.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import { deletePiagamBg } from '$lib/components/piagam-bg.client';
	import PiagamBgUploadBody from '$lib/components/PiagamBgUploadBody.svelte';

	let {
		hasMurid = false,
		muridCount = 0,
		isPiagamSelected = false,
		selectedTemplate = '1',
		onBgRefresh
	}: {
		hasMurid: boolean;
		muridCount: number;
		isPiagamSelected: boolean;
		selectedTemplate: '1' | '2';
		onBgRefresh: () => void;
	} = $props();

	async function handleDeleteBg() {
		showModal({
			title: 'Hapus Background Piagam',
			body: `Hapus background piagam template ${selectedTemplate}?<br />Ini akan mengembalikan background ke default.`,
			dismissible: true,
			onNegative: {
				label: 'Batal',
				action: ({ close }) => close()
			},
			onPositive: {
				label: 'Hapus',
				icon: 'del',
				action: async ({ close }) => {
					try {
						await deletePiagamBg(selectedTemplate);
						onBgRefresh();
						toast('Background piagam dikembalikan ke default.', 'success');
					} catch (err) {
						console.error(err);
						toast('Gagal menghapus background piagam.', 'error');
					} finally {
						close();
					}
				}
			}
		});
	}

	function handleUploadBg() {
		showModal({
			title: `Unggah Background Piagam — Template ${selectedTemplate}`,
			body: PiagamBgUploadBody,
			bodyProps: {
				template: selectedTemplate,
				onUploaded: onBgRefresh
			},
			dismissible: true
		});
	}
</script>

<div class="mt-4 flex flex-col gap-3 text-sm sm:flex-row sm:items-start sm:justify-between">
	{#if hasMurid}
		<p>
			Terdapat <strong>{muridCount}</strong> murid di kelas ini. Preview dan cetak dokumen dilakukan
			per murid.
		</p>
	{:else}
		<p class="text-warning">
			Belum ada data murid yang bisa dipreview. Tambahkan murid terlebih dahulu pada menu Informasi
			Umum › Murid.
		</p>
	{/if}
	<div class="flex items-center gap-2 self-end sm:self-auto">
		{#if isPiagamSelected}
			<button
				class="btn btn-sm btn-error btn-soft shadow-none"
				type="button"
				onclick={handleDeleteBg}
			>
				<Icon name="del" />
				Hapus BG
			</button>

			<button class="btn btn-sm btn-soft shadow-none" type="button" onclick={handleUploadBg}>
				<Icon name="image" />
				Ganti BG
			</button>
		{/if}
	</div>
</div>
