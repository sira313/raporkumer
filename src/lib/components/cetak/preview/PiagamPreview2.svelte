<script lang="ts">
	import PrintCardPage from '$lib/components/cetak/rapor/PrintCardPage.svelte';

	type PiagamData = NonNullable<App.PageData['piagamData']>;
	type ComponentData = {
		piagamData?: PiagamData | null;
		meta?: { title?: string | null } | null;
	};

	let {
		data = {},
		onPrintableReady = () => {},
		bgRefreshKey = 0,
		template = '2',
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		muridProp: _muridProp = null
	} = $props<{
		data?: ComponentData;
		onPrintableReady?: (node: HTMLDivElement | null) => void;
		bgRefreshKey?: number;
		template?: '1' | '2';
		muridProp?: { id?: number | null } | null;
	}>();

	let printable: HTMLDivElement | null = null;

	const piagam = $derived.by(() => data?.piagamData ?? null);
	const sekolah = $derived.by(() => piagam?.sekolah ?? null);
	const murid = $derived.by(() => piagam?.murid ?? null);
	const penghargaan = $derived.by(() => piagam?.penghargaan ?? null);
	const periode = $derived.by(() => piagam?.periode ?? null);
	const ttd = $derived.by(() => piagam?.ttd ?? null);
	const kepalaSekolah = $derived.by(() => ttd?.kepalaSekolah ?? null);
	const waliKelas = $derived.by(() => ttd?.waliKelas ?? null);

	function formatValue(value: string | null | undefined): string {
		if (!value) return '';
		const trimmed = value.trim();
		return trimmed.length ? trimmed : '';
	}

	function formatUpper(value: string | null | undefined): string {
		const formatted = formatValue(value);
		return formatted ? formatted.toUpperCase() : '';
	}

	function formatTitle(value: string | null | undefined): string {
		const formatted = formatValue(value);
		if (!formatted) return '';
		return formatted
			.toLowerCase()
			.split(/([\s-]+)/u)
			.map((part) => {
				if (/^[\s-]+$/u.test(part)) return part;
				return part.charAt(0).toUpperCase() + part.slice(1);
			})
			.join('')
			.trim();
	}

	const kabupaten = $derived.by(() => formatUpper(sekolah?.alamat?.kabupaten));

	// heading lines removed (not used in this template)

	// alamat and kode pos not used in this template

	// info lines removed (not used in this template)

	const rataRata = $derived.by(() => penghargaan?.rataRataFormatted ?? '—');
	const rankingLabel = $derived.by(() => penghargaan?.rankingLabel ?? 'Penerima Penghargaan');
	const achievementTitle = $derived.by(() => penghargaan?.judul ?? 'Piagam Penghargaan');
	const achievementSubtitle = $derived.by(() => penghargaan?.subjudul ?? 'Diberikan Kepada');
	const achievementMotivation = $derived.by(
		() =>
			penghargaan?.motivasi ??
			'Semoga prestasi yang diraih menjadi motivasi untuk meraih kesuksesan di masa yang akan datang.'
	);

	const periodeSemester = $derived.by(() => formatTitle(periode?.semester) || '—');
	const periodeTahun = $derived.by(() => formatUpper(periode?.tahunAjaran) || '—');

	const lokasiPenandatangan = $derived.by(() => {
		const explicit = formatTitle(ttd?.tempat);
		if (explicit) return explicit;
		const fallbackDesa = formatTitle(sekolah?.alamat?.desa);
		if (fallbackDesa) return fallbackDesa;
		const fallbackKecamatan = formatTitle(sekolah?.alamat?.kecamatan);
		if (fallbackKecamatan) return fallbackKecamatan;
		const fallbackKabupaten = formatTitle(sekolah?.alamat?.kabupaten);
		if (fallbackKabupaten) return fallbackKabupaten;
		return '';
	});
	const tanggalPenandatangan = $derived.by(() => ttd?.tanggal ?? '');

	const logoLeft = $derived.by(() => sekolah?.logoDinasUrl ?? '/garudaPancasila.png');
	const logoRight = $derived.by(() => sekolah?.logoUrl ?? '/tutwuri-bw.png');
	const logoKumer = '/logo-kumer.png';
	const dinasLogoAlt = $derived.by(() => (kabupaten ? `Logo Pemda ${kabupaten}` : 'Logo Pemda'));
	const sekolahLogoAlt = $derived.by(() =>
		sekolah ? `Logo ${formatUpper(sekolah.nama)}` : 'Logo sekolah'
	);

	const sekolahNamaDisplay = $derived.by(() => formatValue(sekolah?.nama) || 'Sekolah');
	const sekolahNamaUpper = $derived.by(() => formatUpper(sekolah?.nama) || 'SEKOLAH');
	const kepalaNamaDisplay = $derived.by(() => formatValue(kepalaSekolah?.nama) || '—');
	const waliNamaDisplay = $derived.by(() => formatValue(waliKelas?.nama) || '—');
	const muridNamaTitle = $derived.by(() => {
		const name = formatTitle(murid?.nama);
		return name || '—';
	});
	const kepalaNip = $derived.by(() => formatValue(kepalaSekolah?.nip));
	const waliNip = $derived.by(() => formatValue(waliKelas?.nip));
	const kepalaSekolahTitle = $derived.by(() => {
		const prefix = kepalaSekolah?.statusKepalaSekolah === 'plt' ? 'Plt. ' : '';
		return `${prefix}Kepala ${sekolahNamaDisplay}`;
	});

	$effect(() => {
		onPrintableReady?.(printable);
	});
</script>

<div
	class="bg-base-300 dark:bg-base-200 card preview w-full overflow-x-auto rounded-md border border-black/20 shadow-md print:border-none print:bg-transparent print:p-0"
>
	<div class="mx-auto flex w-fit flex-col gap-6 print:gap-0" bind:this={printable}>
		<PrintCardPage
			orientation="landscape"
			cardClass="shadow-md"
			paddingClass="p-0"
			contentClass="relative isolate overflow-hidden"
		>
			<div aria-hidden="true" class="pointer-events-none absolute inset-0">
				<img
					src={`/api/sekolah/piagam-bg/${template}?v=${bgRefreshKey}`}
					alt=""
					class="h-full w-full object-cover"
					draggable="false"
					loading="eager"
				/>
			</div>
			<div aria-hidden="true" class="pointer-events-none absolute inset-0 to-transparent"></div>

			<div
				class="relative z-10 flex min-h-0 flex-col justify-between gap-2 p-[14mm] text-[11px] print:gap-6 print:text-black"
			>
				<!-- Top logos centered -->
				<header class="mt-1 flex items-center justify-center gap-1">
					<img src={logoLeft} alt={dinasLogoAlt} class="h-14 w-14 object-contain" />
					<img src={logoRight} alt={sekolahLogoAlt} class="h-14 w-14 object-contain" />
					<img src={logoKumer} alt="Logo Kurikulum Merdeka" class="h-16 w-auto object-contain" />
				</header>

				<!-- School name between logos and title -->
				<div class="flex justify-center">
					<div class="text-center">
						<p class="text-3xl font-bold uppercase">{sekolahNamaUpper}</p>
					</div>
				</div>

				<!-- Main title area -->
				<section class="flex flex-col items-center text-center">
					<h1 class="text-3xl font-extrabold tracking-wide uppercase">
						{achievementTitle}
					</h1>
					<p class="mt-4 text-lg font-semibold">{achievementSubtitle}</p>

					<!-- Name in script-like style -->
					<h2
						class="mt-2 text-5xl leading-tight"
						style="font-family: 'Brush Script MT', 'Great Vibes', cursive;"
					>
						{muridNamaTitle}
					</h2>

					<p class="text-lg font-semibold tracking-wide">Sebagai</p>
					<p class="mt-2 text-xl font-bold uppercase">{rankingLabel}</p>
					<p class="mt-3 max-w-[480px] text-justify text-base leading-relaxed">
						Dengan total nilai rata-rata <strong>{rataRata}</strong> pada {periodeSemester}
						tahun ajaran {periodeTahun}.
					</p>
					<p class="max-w-[480px] text-justify text-base leading-relaxed">
						{achievementMotivation}
					</p>
				</section>

				<!-- Footer: QR & stamp at left, signature at right -->
				<footer class="mt-2 grid grid-cols-2 gap-6 text-sm">
					<div class="flex flex-col items-center gap-1.5 text-center">
						<p class="font-semibold uppercase">Mengetahui</p>
						<p class="text-base font-semibold">{kepalaSekolahTitle}</p>
						<div class="h-16 w-full"></div>
						<p class="text-sm font-semibold">{kepalaNamaDisplay}</p>
						<p class="text-xs">{kepalaNip || '—'}</p>
					</div>
					<div class="flex flex-col items-center gap-1.5 text-center">
						<p class="text-base">
							{#if lokasiPenandatangan}{lokasiPenandatangan}{#if tanggalPenandatangan},
								{/if}{/if}
							{#if tanggalPenandatangan}{tanggalPenandatangan}{/if}
						</p>
						<p class="font-semibold uppercase">Wali Kelas</p>
						<div class="h-16 w-full"></div>
						<p class="text-sm font-semibold">{waliNamaDisplay}</p>
						<p class="text-xs">{waliNip || '—'}</p>
					</div>
				</footer>
			</div>
		</PrintCardPage>
	</div>
</div>
