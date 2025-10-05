<script lang="ts">
	import { onMount } from 'svelte';
	import { printElement } from '$lib/utils';
	import { toast } from '$lib/components/toast.svelte';
	import PrintTip from '$lib/components/alerts/print-tip.svelte';

	let { data } = $props();
	let printable: HTMLDivElement | null = null;

	const coverData = $derived.by(() => data.coverData ?? null);
	const sekolah = $derived.by(() => coverData?.sekolah ?? null);
	const murid = $derived.by(() => coverData?.murid ?? null);
	const printTitle = $derived.by(() => data.meta?.title ?? 'Cover Rapor');

	function handlePrint() {
		const ok = printElement(printable, {
			title: printTitle,
			pageMargin: '0'
		});
		if (!ok) {
			toast('Elemen cover belum siap untuk dicetak. Coba muat ulang halaman.', 'warning');
		}
	}

	onMount(() => {
		function onKeydown(event: KeyboardEvent) {
			if (!(event.ctrlKey || event.metaKey)) return;
			if (event.key.toLowerCase() !== 'p') return;
			event.preventDefault();
			handlePrint();
		}

		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});
</script>

<PrintTip onPrint={handlePrint} buttonLabel="Cetak cover" />

<div
	class="card bg-base-100 rounded-lg border border-none shadow-md print:border-none print:bg-transparent print:shadow-none"
>
	<div
		class="bg-base-100 text-base-content mx-auto flex max-h-[297mm] min-h-[297mm] max-w-[210mm] min-w-[210mm] flex-col"
		bind:this={printable}
	>
		<div class="m-[20mm] flex flex-1 flex-col overflow-auto">
			<div class="mb-2 flex justify-center">
				<div class="w-50">
					<img
						src={sekolah?.logoUrl ?? '/tutwuri-bw.png'}
						alt={`Logo ${sekolah?.nama ?? 'sekolah'}`}
						class="object-contain"
					/>
				</div>
			</div>

			<div class="mt-6 flex flex-col gap-4">
				<h1 class="text-center text-4xl font-bold">LAPORAN</h1>
				<h2 class="text-center text-2xl font-bold">HASIL CAPAIAN PEMBELAJARAN MURID</h2>
				<!-- nama sekolah -->
				<h3 class="text-center text-2xl font-bold">{(sekolah?.nama ?? '').toUpperCase() || '—'}</h3>
			</div>

			<div class="mt-auto flex flex-col gap-4">
				<div class="flex flex-col gap-2">
					<p class="text-center text-lg font-bold">Nama Murid</p>
					<!-- nama murid gunakan huruf kapital semua -->
					<p class="border py-2 text-center text-lg font-bold">
						{(murid?.nama ?? '').toUpperCase() || '—'}
					</p>
				</div>
				<div class="flex flex-col gap-2">
					<p class="text-center text-lg font-bold">NISN / NIS</p>
					<!-- NISN dan NIS murid -->
					<p class="border py-2 text-center text-lg font-bold">
						{#if murid?.nisn || murid?.nis}
							{[murid?.nisn, murid?.nis].filter(Boolean).join(' / ')}
						{:else}
							—
						{/if}
					</p>
				</div>
				<div class="flex flex-col gap-2">
					<p class="text-center text-lg font-bold">KEMENTRIAN PENEDIDIKAN DASAR DAN MENENGAH</p>
					<p class="text-center text-lg font-bold">REPUBLIK INDONESIA</p>
				</div>
			</div>
		</div>
	</div>
</div>
