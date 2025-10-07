<script lang="ts">
	import { onMount } from 'svelte';
	import { printElement } from '$lib/utils';
	import { toast } from '$lib/components/toast.svelte';
	import PrintTip from '$lib/components/alerts/print-tip.svelte';
	import PrintCardPage from '$lib/components/cetak/rapor/PrintCardPage.svelte';

	let { data } = $props();
	let printable: HTMLDivElement | null = null;

	const coverData = $derived.by(() => data.coverData ?? null);
	const sekolah = $derived.by(() => coverData?.sekolah ?? null);
	const murid = $derived.by(() => coverData?.murid ?? null);
	const printTitle = $derived.by(() => data.meta?.title ?? 'Cover Rapor');

	function formatValue(value: string | null | undefined): string {
		if (!value) return '—';
		const trimmed = value.trim();
		return trimmed ? trimmed : '—';
	}

	function formatUpper(value: string | null | undefined): string {
		const formatted = formatValue(value);
		return formatted === '—' ? formatted : formatted.toUpperCase();
	}

	function formatStudentIds(nisn?: string | null, nis?: string | null): string {
		const values = [nisn, nis].map((val) => formatValue(val)).filter((v) => v !== '—');
		return values.length ? values.join(' / ') : '—';
	}

	const logoSrc = $derived.by(() => sekolah?.logoUrl ?? '/tutwuri-bw.png');
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
	const coverHeadings = $derived.by(() => [
		{ text: 'LAPORAN', class: 'text-4xl font-bold tracking-wide uppercase' },
		{ text: 'HASIL CAPAIAN PEMBELAJARAN MURID', class: 'text-2xl font-bold uppercase' },
		{ text: formatUpper(sekolah?.nama), class: 'text-2xl font-bold uppercase' }
	]);
	const identityFields = $derived.by(() => [
		{ label: 'Nama Murid', value: formatUpper(murid?.nama) },
		{ label: 'NISN / NIS', value: formatStudentIds(murid?.nisn, murid?.nis) }
	]);
	const ministryLines = ['KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH', 'REPUBLIK INDONESIA'];
	const biodataRows = $derived.by(() => {
		if (!sekolah) return [];
		return [
			{ label: 'Nama Sekolah', value: formatUpper(sekolah.nama) },
			{ label: 'NPSN', value: formatValue(sekolah.npsn) },
			{ label: 'Alamat Sekolah', value: formatValue(sekolah.alamat.jalan) },
			{ label: 'Kode Pos', value: formatValue(sekolah.alamat.kodePos) },
			{ label: 'Desa / Kelurahan', value: formatValue(sekolah.alamat.desa) },
			{ label: 'Kecamatan', value: formatValue(sekolah.alamat.kecamatan) },
			{ label: 'Kabupaten / Kota', value: formatValue(sekolah.alamat.kabupaten) },
			{ label: 'Provinsi', value: formatValue(sekolah.alamat.provinsi) },
			{ label: 'Website', value: formatValue(sekolah.website) },
			{ label: 'E-mail', value: formatValue(sekolah.email) }
		];
	});

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

<section>
	<div
		class="border border-black/20 bg-base-300 dark:bg-base-200 card w-full overflow-x-auto rounded-md shadow-md print:border-none print:bg-transparent print:p-0"
	>
		<div class="mx-auto flex w-fit flex-col gap-6 print:gap-0" bind:this={printable}>
			<PrintCardPage
				breakAfter
				cardClass="shadow-md"
				contentClass="justify-between gap-12 text-[1rem] text-center"
			>
				<div class="flex flex-col items-center gap-6">
					<div class="w-44">
						<img src={logoSrc} alt={`Logo ${sekolah?.nama ?? 'sekolah'}`} class="object-contain" />
					</div>
					<div class="flex flex-col gap-4">
						{#each coverHeadings as heading}
							<p class={heading.class}>{heading.text}</p>
						{/each}
					</div>
				</div>

				<div class="flex flex-col gap-6">
					{#each identityFields as field}
						<div class="flex flex-col gap-2">
							<p class="text-lg font-bold">{field.label}</p>
							<p class="border py-2 text-lg font-bold">{field.value}</p>
						</div>
					{/each}
					<div class="flex flex-col gap-2">
						{#each ministryLines as line}
							<p class="text-lg font-bold">{line}</p>
						{/each}
					</div>
				</div>
			</PrintCardPage>

			<PrintCardPage
				cardClass="shadow-md"
				contentClass="justify-start gap-12 text-[1rem]"
			>
				<div class="flex flex-col items-center gap-1 text-center uppercase">
					<p class="tracking-[0.5em] text-2xl font-bold">R A P O R</p>
					<p class="text-xl font-semibold">HASIL BELAJAR MURID</p>
					{#if jenjangHeading}
						<p class="text-xl font-semibold">{jenjangHeading}</p>
					{/if}
				</div>
				<div class="flex justify-start">
					<table class="w-full max-w-[160mm] text-lg leading-8">
						<tbody>
							{#each biodataRows as row}
								<tr class="align-top">
									<th class="w-[70mm] pb-2 text-left font-normal">{row.label}</th>
									<td class="w-6 pb-2 font-normal">:</td>
									<td class="pb-2 font-semibold">{row.value}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</PrintCardPage>
		</div>
	</div>
</section>
