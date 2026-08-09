<script lang="ts">
	/* eslint-disable svelte/no-navigation-without-resolve -- bukti links open in a new tab */
	import SppdDetailBody from '$lib/components/sppd/sppd-detail-body.svelte';
	import Icon from '$lib/components/icon.svelte';

	interface BuktiItem {
		id: number;
		jenis: 'pdf' | 'foto';
		namaFile: string;
	}

	interface SppdDetailData {
		id: number;
		maksud: string;
		nomorSuratTugas: string | null;
		tanggalSuratTugas: string | null;
		dasarSuratTugas: string | null;
		alatAngkut: string | null;
		tempatBerangkat: string | null;
		tempatTujuan: string | null;
		lamanya: string | null;
		tanggalBerangkat: string;
		tanggalKembali: string;
		keteranganPengikut: string | null;
		kodeRekening: string | null;
		tingkatBiaya: string | null;
		keteranganLain: string | null;
		jumlah: number;
		undanganFile: string | null;
		pegawai: { id: number; authUserId: number | null; nama: string }[];
		pengikut: { id: number; nama: string; tempatLahir: string; tanggalLahir: string }[];
		bukti: BuktiItem[];
	}

	let { sppd }: { sppd: SppdDetailData } = $props();

	const undanganUrl = $derived(
		sppd.undanganFile?.startsWith('undangan/')
			? `/api/dinas-luar/undangan/${sppd.undanganFile.slice('undangan/'.length)}`
			: null
	);
	const undanganName = $derived(sppd.undanganFile?.split('/').pop() ?? null);

	const pdfBukti = $derived(sppd.bukti.filter((b) => b.jenis === 'pdf'));
	const fotoBukti = $derived(sppd.bukti.filter((b) => b.jenis === 'foto'));

	function buktiUrl(item: BuktiItem): string {
		return `/api/dinas-luar/bukti/${item.namaFile}`;
	}
</script>

<SppdDetailBody {sppd} />

{#if undanganUrl && undanganName}
	<section class="not-prose mt-4">
		<a
			class="border-base-200 dark:border-base-300 flex items-center justify-between gap-3 rounded-box border p-3"
			href={undanganUrl}
			target="_blank"
			rel="noopener"
			title="Lihat file undangan kegiatan perjalanan dinas"
		>
			<span class="flex min-w-0 items-center gap-3">
				<span
					class="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
				>
					<Icon name="download" class="h-4 w-4" />
				</span>
				<span class="truncate text-sm font-medium">Undangan Kegiatan</span>
			</span>
			<span class="badge badge-soft badge-primary shrink-0">Lihat Undangan</span>
		</a>
	</section>
{/if}

<section class="not-prose mt-6 border-t border-base-300 pt-4">
	<h4
		class="text-base-content/50 mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest"
	>
		<Icon name="download" class="h-4 w-4" />
		Bukti Perjalanan Dinas
	</h4>

	{#if pdfBukti.length > 0 || fotoBukti.length > 0}
		<div class="space-y-2">
			{#each pdfBukti as item (item.id)}
				<a
					class="border-base-200 dark:border-none bg-base-200 flex items-center justify-between gap-3 rounded-box border p-2.5"
					href={buktiUrl(item)}
					target="_blank"
					rel="noopener"
					title="Lihat file PDF bukti"
				>
					<span class="flex min-w-0 items-center gap-3">
						<span
							class="bg-primary/10 text-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
						>
							<Icon name="book" class="h-4 w-4" />
						</span>
						<span class="truncate text-sm font-medium">
							{item.namaFile.split('/').pop()}
						</span>
					</span>
					<span class="badge badge-soft badge-info">PDF</span>
				</a>
			{/each}
		</div>

		{#if fotoBukti.length > 0}
			<div class="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
				{#each fotoBukti as item (item.id)}
					<a
						class="border-base-300 group relative block overflow-hidden rounded-md border"
						href={buktiUrl(item)}
						target="_blank"
						rel="noopener"
						title="Lihat foto bukti"
					>
						<img src={buktiUrl(item)} alt="Bukti foto" class="h-24 w-full object-cover" />
					</a>
				{/each}
			</div>
		{/if}
	{:else}
		<p class="text-base-content/60 text-sm">Belum ada bukti perjalanan dinas.</p>
	{/if}
</section>
