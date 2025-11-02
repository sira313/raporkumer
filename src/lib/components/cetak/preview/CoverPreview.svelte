<script lang="ts">
	import PrintCardPage from '$lib/components/cetak/rapor/PrintCardPage.svelte';
	import { jenjangPendidikanSederajat } from '$lib/statics';

	type CoverData = NonNullable<App.PageData['coverData']>;
	type ComponentData = {
		coverData?: CoverData | null;
		meta?: { title?: string | null } | null;
	};

	let { data = {}, onPrintableReady = () => {} } = $props<{
		data?: ComponentData;
		onPrintableReady?: (node: HTMLDivElement | null) => void;
	}>();

	const coverData = $derived.by(() => data?.coverData ?? null);
	const sekolah = $derived.by(() => coverData?.sekolah ?? null);
	const murid = $derived.by(() => coverData?.murid ?? null);

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
	// formatted jenjang pendidikan (label) for the cover — e.g. "SD (Sekolah Dasar)"
	const schoolJenjang = $derived.by(() => {
		// some preview payloads use `jenjang` as the key while the canonical model
		// uses `jenjangPendidikan`. Support both and fall back to the raw value
		// (uppercased) if there's no mapping.
		const sekolahRecord = sekolah as Record<string, unknown> | null;
		const raw = sekolahRecord?.['jenjangPendidikan'] ?? sekolahRecord?.['jenjang'] ?? null;
		const variantKey = sekolahRecord?.['jenjangVariant'] ?? sekolahRecord?.['variant'] ?? null;

		if (!raw) return null;

		const key = String(raw) as keyof typeof jenjangPendidikanSederajat;

		// prefer explicit variant label when available
		if (variantKey) {
			const variants = jenjangPendidikanSederajat[key] ?? [];
			const found = variants.find((v) => v.key === String(variantKey));
			if (found) return formatUpper(found.label);
		}

		// fallback to the first variant's label for the jenjang (e.g. "Sekolah Dasar (SD)")
		const mapped = (jenjangPendidikanSederajat[key] ?? [])[0]?.label;
		return mapped ? formatUpper(mapped) : formatUpper(String(raw));
	});
	const coverHeadings = $derived.by(() => [
		{ text: 'LAPORAN', class: 'text-4xl font-bold tracking-wide uppercase' },
		{ text: 'HASIL BELAJAR MURID', class: 'text-2xl font-bold uppercase' },
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

	let printable: HTMLDivElement | null = null;

	$effect(() => {
		onPrintableReady?.(printable);
	});
</script>

<div
	class="bg-base-300 dark:bg-base-200 card preview w-full overflow-x-auto rounded-md border border-black/20 shadow-md print:border-none print:bg-transparent print:p-0"
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
					{#each coverHeadings as heading (heading.text)}
						<p class={heading.class}>{heading.text}</p>
					{/each}
				</div>
			</div>

			<div class="flex flex-col gap-6">
				{#each identityFields as field (field.label)}
					<div class="flex flex-col gap-2">
						<p class="text-lg font-bold">{field.label}</p>
						<p class="border py-2 text-lg font-bold">{field.value}</p>
					</div>
				{/each}
				<div class="flex flex-col gap-2">
					{#each ministryLines as line (line)}
						<p class="text-lg font-bold">{line}</p>
					{/each}
				</div>
			</div>
		</PrintCardPage>

		<PrintCardPage cardClass="shadow-md" contentClass="justify-start gap-12 text-[1rem]">
			<div class="flex flex-col items-center gap-1 text-center uppercase">
				<p class="text-2xl font-bold tracking-[0.5em]">R A P O R</p>
				<p class="text-xl font-semibold">HASIL BELAJAR MURID</p>
				{#if schoolJenjang}
					<p class="text-xl font-semibold">{schoolJenjang}</p>
				{/if}
			</div>
			<div class="flex justify-start">
				<table class="w-full max-w-[160mm] text-lg leading-8">
					<tbody>
						{#each biodataRows as row (row.label)}
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
