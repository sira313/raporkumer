<script lang="ts">
	import PrintCardPage from '$lib/components/cetak/rapor/PrintCardPage.svelte';

	type PiagamData = NonNullable<App.PageData['piagamData']>;
	type ComponentData = {
		piagamData?: PiagamData | null;
		meta?: { title?: string | null } | null;
	};

	let { data = {}, onPrintableReady = () => {} } = $props<{
		data?: ComponentData;
		onPrintableReady?: (node: HTMLDivElement | null) => void;
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

	const sekolahNamaUpper = $derived.by(() => formatUpper(sekolah?.nama) || 'Sekolah');
	const sekolahNamaDisplay = $derived.by(() => formatValue(sekolah?.nama) || 'Sekolah');
	const muridNamaUpper = $derived.by(() => formatUpper(murid?.nama) || '—');
	const kepalaNamaDisplay = $derived.by(() => formatValue(kepalaSekolah?.nama) || '—');
	const waliNamaDisplay = $derived.by(() => formatValue(waliKelas?.nama) || '—');
	const kepalaNip = $derived.by(() => formatValue(kepalaSekolah?.nip));
	const waliNip = $derived.by(() => formatValue(waliKelas?.nip));

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

	function buildSekolahHeading(jenjangLabel: string, sekolahNama: string) {
		const nameUpper = sekolahNama.trim();
		const jenjangUpper = jenjangLabel.trim();
		if (!nameUpper && !jenjangUpper) return '';
		if (!jenjangUpper) return nameUpper;
		if (!nameUpper) return jenjangUpper;

		const abbreviationPattern = /^(SD|SMP|SMA|SMK|SLB)\b/u;
		if (
			nameUpper.startsWith(jenjangUpper) ||
			nameUpper.includes(jenjangUpper) ||
			abbreviationPattern.test(nameUpper)
		) {
			return nameUpper;
		}

		return `${jenjangUpper} ${nameUpper}`.trim();
	}

	const kabupaten = $derived.by(() => formatUpper(sekolah?.alamat?.kabupaten));
	const kecamatan = $derived.by(() => formatUpper(sekolah?.alamat?.kecamatan));
	const jenjangLabel = $derived.by(() => {
		const jenjang = sekolah?.jenjang ?? '';
		switch (jenjang) {
			case 'sd':
				return 'SEKOLAH DASAR';
			case 'smp':
				return 'SEKOLAH MENENGAH PERTAMA';
			case 'sma':
				return 'SEKOLAH MENENGAH ATAS';
			default:
				return 'SEKOLAH';
		}
	});

	const headingLines = $derived.by(() => {
		const lines: string[] = [];
		if (kabupaten) {
			lines.push(`PEMERINTAH ${kabupaten}`);
		}
		lines.push('DINAS PENDIDIKAN DAN KEBUDAYAAN');
		if (kecamatan) {
			lines.push(`KOORDINATOR WILAYAH ${kecamatan}`);
		}
		const sekolahNama = formatUpper(sekolah?.nama);
		if (sekolahNama) {
			const heading = buildSekolahHeading(jenjangLabel, sekolahNama);
			if (heading) {
				lines.push(heading);
			}
		}
		return lines;
	});

	const alamatUtama = $derived.by(() => {
		const jalan = formatTitle(sekolah?.alamat?.jalan);
		const desaValue = formatTitle(sekolah?.alamat?.desa);
		const kecamatanValue = formatTitle(sekolah?.alamat?.kecamatan);
		const parts: string[] = [];
		if (jalan) parts.push(jalan);
		if (desaValue) parts.push(`Desa ${desaValue}`);
		if (kecamatanValue) parts.push(`Kecamatan ${kecamatanValue}`);
		return parts.join(', ');
	});

	const kodePos = $derived.by(() => formatValue(sekolah?.alamat?.kodePos));

	const infoLines = $derived.by(() => {
		const lines: string[] = [];
		const alamatSegments: string[] = [];
		if (alamatUtama) {
			alamatSegments.push(`Alamat: ${alamatUtama}.`);
		}
		if (kodePos) {
			alamatSegments.push(`Kode POS: ${kodePos}.`);
		}
		if (alamatSegments.length) {
			lines.push(alamatSegments.join(' '));
		}
		const contactParts = [
			sekolah?.npsn ? `NPSN: ${sekolah.npsn}` : null,
			sekolah?.website ? `Website: ${sekolah.website}` : null,
			sekolah?.email ? `Email: ${sekolah.email}` : null
		]
			.map((part) => formatValue(part))
			.filter(Boolean);
		if (contactParts.length) {
			lines.push(contactParts.join('  '));
		}
		return lines;
	});

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
	const dinasLogoAlt = $derived.by(() => (kabupaten ? `Logo Pemda ${kabupaten}` : 'Logo Pemda'));
	const sekolahLogoAlt = $derived.by(() =>
		sekolahNamaUpper ? `Logo ${sekolahNamaUpper}` : 'Logo sekolah'
	);

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
					src="/bg-certificate.png"
					alt=""
					class="h-full w-full object-cover"
					draggable="false"
					loading="eager"
				/>
			</div>
			<div
				aria-hidden="true"
				class="bg-base-100/30 dark:bg-base-100/30 pointer-events-none absolute inset-0 print:bg-white/30"
			></div>
			<div
				class="relative z-10 flex min-h-0 flex-1 flex-col justify-between gap-4 p-[16mm] text-[11px] print:gap-6"
			>
				<section class="flex flex-col gap-4">
					<header class="grid grid-cols-[80px_1fr_80px] items-center gap-3">
						<div class="flex justify-center">
							<img src={logoLeft} alt={dinasLogoAlt} class="h-20 w-20 object-contain" />
						</div>
						<div class="text-center">
							{#each headingLines as line, index (index)}
								<p
									class={`font-semibold uppercase ${
										index === headingLines.length - 1
											? 'text-lg font-extrabold tracking-wide'
											: index === 0
												? 'text-sm tracking-wide'
												: 'text-sm'
									}`}
								>
									{line}
								</p>
							{/each}
							{#each infoLines as infoLine, infoIndex (infoIndex)}
								<p class={`text-xs ${infoIndex === 0 ? 'mt-1.5 italic' : ''}`}>{infoLine}</p>
							{/each}
						</div>
						<div class="flex justify-center">
							<img src={logoRight} alt={sekolahLogoAlt} class="h-20 w-20 object-contain" />
						</div>
					</header>
					<div class="flex flex-col gap-[2px]" aria-hidden="true">
						<div class="bg-base-content/80 h-[2px] w-full print:bg-[#000]"></div>
						<div class="border-base-content/60 border-t print:border-[#000]"></div>
					</div>
				</section>

				<section class="flex flex-col items-center gap-2.5 text-center">
					<h1 class="text-2xl font-bold tracking-widest uppercase">{achievementTitle}</h1>
					<p class="text-base-content/80 text-sm tracking-wide uppercase">{achievementSubtitle}</p>
					<h2 class="text-xl font-extrabold tracking-wide uppercase">{muridNamaUpper}</h2>
					<p class="text-base-content/80 text-sm tracking-wide uppercase">Sebagai</p>
					<p class="text-xl font-bold uppercase">{rankingLabel}</p>
					<p class="mt-3 max-w-[480px] text-justify text-base leading-relaxed">
						Dengan total nilai rata-rata <strong>{rataRata}</strong> pada Semester {periodeSemester}
						tahun ajaran {periodeTahun}.
					</p>
					<p class="max-w-[480px] text-justify text-base leading-relaxed">
						{achievementMotivation}
					</p>
				</section>

				<footer class="mt-6 grid grid-cols-2 gap-6 text-sm">
					<div class="flex flex-col items-center gap-1.5 text-center">
						<p class="font-semibold uppercase">Mengetahui</p>
						<p class="text-base font-semibold">Kepala {sekolahNamaDisplay}</p>
						<div class="h-16 w-full"></div>
						<p class="text-sm font-semibold">{kepalaNamaDisplay}</p>
						<p class="text-xs">NIP {kepalaNip || '—'}</p>
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
						<p class="text-xs">NIP {waliNip || '—'}</p>
					</div>
				</footer>
			</div>
		</PrintCardPage>
	</div>
</div>
