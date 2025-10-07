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
	const jenjangHeading = $derived.by(() => {
		switch (sekolah?.jenjang) {
			case 'sd':
				return 'SEKOLAH DASAR ( SD )';
			case 'smp':
				return 'SEKOLAH MENENGAH PERTAMA ( SMP )';
			case 'sma':
				return 'SEKOLAH MENENGAH ATAS ( SMA )';
			default:
				return sekolah ? 'SEKOLAH' : '';
		}
	});
	const biodataRows = $derived.by(() => {
		if (!sekolah) return [];
		return [
			{ label: 'Nama Sekolah', value: sekolah.nama },
			{ label: 'NPSN', value: sekolah.npsn },
			{ label: 'Alamat Sekolah', value: sekolah.alamat.jalan },
			{ label: 'Kode Pos', value: sekolah.alamat.kodePos },
			{ label: 'Desa / Kelurahan', value: sekolah.alamat.desa },
			{ label: 'Kecamatan', value: sekolah.alamat.kecamatan },
			{ label: 'Kabupaten / Kota', value: sekolah.alamat.kabupaten },
			{ label: 'Provinsi', value: sekolah.alamat.provinsi },
			{ label: 'Website', value: sekolah.website },
			{ label: 'E-mail', value: sekolah.email }
		];
	});

	function displayValue(value: string | null | undefined): string {
		if (!value) return '—';
		const trimmed = value.trim();
		return trimmed ? trimmed : '—';
	}

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
		class="bg-base-100 text-base-content mx-auto flex w-full max-w-[210mm] flex-col overflow-auto print:bg-transparent print:overflow-visible"
		bind:this={printable}
	>
		<div class="flex h-[297mm] flex-col">
			<div class="flex flex-1 flex-col p-[20mm]">
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
						<p class="text-center text-lg font-bold">KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH</p>
						<p class="text-center text-lg font-bold">REPUBLIK INDONESIA</p>
					</div>
				</div>
			</div>
		</div>
		<div class="mt-8 flex h-[297mm] flex-col break-before-page print:mt-0">
			<div class="flex flex-1 flex-col p-[20mm]">
				<div class="flex flex-col items-center gap-1 text-center uppercase">
					<p class="text-2xl font-bold">LAPORAN</p>
					<p class="text-xl font-semibold">HASIL BELAJAR MURID</p>
					{#if jenjangHeading}
						<p class="text-xl font-semibold">{jenjangHeading}</p>
					{/if}
				</div>
				<div class="mt-16 flex justify-start">
					<table class="w-full max-w-[160mm] text-lg leading-8">
						<tbody>
							{#each biodataRows as row}
								<tr class="align-top">
									<th class="w-[70mm] pb-2 text-left font-normal">{row.label}</th>
									<td class="w-6 pb-2 font-normal">:</td>
									<td class="pb-2 font-semibold">{displayValue(row.value)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	</div>
</div>
