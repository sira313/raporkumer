<script lang="ts">
	import { onMount } from 'svelte';
	import PrintTip from '$lib/components/alerts/print-tip.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import { printElement } from '$lib/utils';

	let { data } = $props();
	let printable: HTMLDivElement | null = null;

	const rapor = $derived.by(() => data.raporData ?? null);
	const sekolah = $derived.by(() => rapor?.sekolah ?? null);
	const murid = $derived.by(() => rapor?.murid ?? null);
	const rombel = $derived.by(() => rapor?.rombel ?? null);
	const periode = $derived.by(() => rapor?.periode ?? null);
	const waliKelas = $derived.by(() => rapor?.waliKelas ?? null);
	const kepalaSekolah = $derived.by(() => rapor?.kepalaSekolah ?? null);
	const ttd = $derived.by(() => rapor?.ttd ?? null);
	const printTitle = $derived.by(() => data.meta?.title ?? 'Rapor Murid');

	const intrakurikuler = $derived.by(() => {
		const items = rapor?.nilaiIntrakurikuler ?? [];
		return items.map((entry, index) => ({ nomor: index + 1, entry }));
	});

	function formatValue(value: string | null | undefined) {
		if (!value) return '—';
		const trimmed = value.trim();
		return trimmed.length ? trimmed : '—';
	}

	function formatUpper(value: string | null | undefined) {
		const formatted = formatValue(value);
		return formatted === '—' ? formatted : formatted.toUpperCase();
	}

	function formatHari(value: number | null | undefined) {
		if (value === null || value === undefined) return '—';
		return `${value} hari`;
	}

	function handlePrint() {
		const ok = printElement(printable, {
			title: printTitle,
			pageMargin: '0'
		});
		if (!ok) {
			toast('Elemen rapor belum siap untuk dicetak. Coba muat ulang halaman.', 'warning');
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

<PrintTip onPrint={handlePrint} buttonLabel="Cetak rapor" />

<div class="flex flex-col gap-4 print:gap-0" bind:this={printable}>
	<div
		class="card bg-base-100 rounded-lg border border-none shadow-md print:shadow-none print:border-none print:bg-transparent"
		style="break-inside: avoid-page; break-after: page;"
	>
		<div class="min-w-[210mm] max-w-[210mm] min-h-[297mm] max-h-[297mm] mx-auto bg-base-100 text-base-content flex flex-col">
			<div class="m-[20mm] flex flex-1 flex-col text-[12px]">
				<header class="text-center">
					<h1 class="text-2xl font-bold uppercase tracking-wide">Laporan Hasil Belajar</h1>
					<h2 class="font-semibold uppercase tracking-wide">(Rapor)</h2>
				</header>

				<section class="mt-6">
					<table class="w-full border-collapse">
						<tbody>
							<tr>
								<td class="align-top" style="width: 170px;">Nama Peserta Didik</td>
								<td class="align-top" style="width: 0.75rem;">:</td>
								<td class="font-semibold uppercase">{formatUpper(murid?.nama)}</td>
								<td class="align-top" style="width: 110px;">Kelas</td>
								<td class="align-top" style="width: 0.75rem;">:</td>
								<td class="font-semibold">{formatValue(rombel?.nama)}</td>
							</tr>
							<tr>
								<td class="align-top">NISN / NIS</td>
								<td class="align-top">:</td>
								<td class="font-semibold">{formatValue(murid?.nisn)} / {formatValue(murid?.nis)}</td>
								<td class="align-top">Fase</td>
								<td class="align-top">:</td>
								<td class="font-semibold uppercase">{formatUpper(rombel?.fase)}</td>
							</tr>
							<tr>
								<td class="align-top">Sekolah</td>
								<td class="align-top">:</td>
								<td class="font-semibold uppercase">{formatUpper(sekolah?.nama)}</td>
								<td class="align-top">Semester</td>
								<td class="align-top">:</td>
								<td class="font-semibold">{formatValue(periode?.semester)}</td>
							</tr>
							<tr>
								<td class="align-top">Alamat</td>
								<td class="align-top">:</td>
								<td>{formatValue(sekolah?.alamat)}</td>
								<td class="align-top">Tahun Pelajaran</td>
								<td class="align-top">:</td>
								<td class="font-semibold align-top">{formatValue(periode?.tahunPelajaran)}</td>
							</tr>
						</tbody>
					</table>
				</section>

				<section class="mt-8">
					<table class="w-full border border-base-300">
						<thead class="bg-base-300">
							<tr>
								<th class="border border-base-300 px-3 py-2 text-left">No.</th>
								<th class="border border-base-300 px-3 py-2 text-left">Muatan Pelajaran</th>
								<th class="border border-base-300 px-3 py-2 text-center">Nilai Akhir</th>
								<th class="border border-base-300 px-3 py-2 text-left">Capaian Kompetensi</th>
							</tr>
						</thead>
						<tbody>
							{#if intrakurikuler.length === 0}
								<tr>
									<td class="border border-base-300 px-3 py-2 text-center" colspan="4">Belum ada data intrakurikuler.</td>
								</tr>
							{:else}
								{#each intrakurikuler as row}
									<tr>
										<td class="border border-base-300 px-3 py-2 align-top">{row.nomor}</td>
										<td class="border border-base-300 px-3 py-2 align-top">
											<span class="font-semibold">{row.entry.mataPelajaran}</span>
											{#if row.entry.kelompok}
												<div class="text-xs text-base-content/70">{formatValue(row.entry.kelompok)}</div>
											{/if}
										</td>
										<td class="border border-base-300 px-3 py-2 align-top text-center font-semibold">{formatValue(row.entry.nilaiAkhir)}</td>
										<td class="border border-base-300 px-3 py-2 align-top whitespace-pre-line">{formatValue(row.entry.deskripsi)}</td>
									</tr>
								{/each}
							{/if}
						</tbody>
					</table>
				</section>
			</div>
		</div>
	</div>

	<div
		class="card bg-base-100 rounded-lg border border-none shadow-md print:shadow-none print:border-none print:bg-transparent"
		style="break-inside: avoid-page;"
	>
		<div class="min-w-[210mm] max-w-[210mm] min-h-[297mm] max-h-[297mm] mx-auto bg-base-100 text-base-content flex flex-col">
			<div class="m-[20mm] flex flex-1 flex-col text-[12px]">
				<section>
					<table class="w-full border border-base-300">
						<thead class="bg-base-300">
							<tr>
								<th class="border border-base-300 px-3 py-2 text-left">Kokurikuler</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="border border-base-300 px-3 py-3 whitespace-pre-line">
									{formatValue(rapor?.kokurikuler)}
								</td>
							</tr>
						</tbody>
					</table>
				</section>

				<section class="mt-6">
					<table class="w-full border border-base-300">
						<thead class="bg-base-300">
							<tr>
								<th class="border border-base-300 px-3 py-2 text-left" style="width: 40px;">No.</th>
								<th class="border border-base-300 px-3 py-2 text-left">Ekstrakurikuler</th>
								<th class="border border-base-300 px-3 py-2 text-left">Keterangan</th>
							</tr>
						</thead>
						<tbody>
							{#if (rapor?.ekstrakurikuler?.length ?? 0) === 0}
								<tr>
									<td class="border border-base-300 px-3 py-2 text-center" colspan="3">Belum ada data ekstrakurikuler.</td>
								</tr>
							{:else}
								{#each rapor?.ekstrakurikuler ?? [] as ekskul, index}
									<tr>
										<td class="border border-base-300 px-3 py-2 align-top">{index + 1}</td>
										<td class="border border-base-300 px-3 py-2 align-top">{formatValue(ekskul.nama)}</td>
										<td class="border border-base-300 px-3 py-2 align-top whitespace-pre-line">{formatValue(ekskul.deskripsi)}</td>
									</tr>
								{/each}
						{/if}
						</tbody>
					</table>
				</section>

				<section class="mt-8 grid gap-6 print:grid-cols-2 md:grid-cols-2">
					<table class="w-full border border-base-300">
						<thead class="bg-base-300">
							<tr>
								<th class="border border-base-300 px-3 py-2 text-left" colspan="2">Ketidakhadiran</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="border border-base-300 px-3 py-2">Sakit</td>
								<td class="border border-base-300 px-3 py-2 text-center">{formatHari(rapor?.ketidakhadiran?.sakit)}</td>
							</tr>
							<tr>
								<td class="border border-base-300 px-3 py-2">Izin</td>
								<td class="border border-base-300 px-3 py-2 text-center">{formatHari(rapor?.ketidakhadiran?.izin)}</td>
							</tr>
							<tr>
								<td class="border border-base-300 px-3 py-2">Tanpa Keterangan</td>
								<td class="border border-base-300 px-3 py-2 text-center">{formatHari(rapor?.ketidakhadiran?.tanpaKeterangan)}</td>
							</tr>
						</tbody>
					</table>
					<table class="w-full border border-base-300">
						<thead class="bg-base-300">
							<tr>
								<th class="border border-base-300 px-3 py-2 text-left">Catatan Wali Kelas</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="border border-base-300 px-3 py-3 min-h-[80px] whitespace-pre-line">
									{formatValue(rapor?.catatanWali)}
								</td>
							</tr>
						</tbody>
					</table>
				</section>

				<section class="mt-6">
					<table class="w-full border border-base-300">
						<thead class="bg-base-300">
							<tr>
								<th class="border border-base-300 px-3 py-2 text-left">Tanggapan Orang Tua/Wali Murid</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="border border-base-300 px-3 py-4 align-top">
									<div class="min-h-[70px] whitespace-pre-line">
										{rapor?.tanggapanOrangTua?.trim() || ''}
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</section>

				<footer class="pt-12">
					<div class="flex flex-col gap-10">
						<div class="grid gap-8 print:grid-cols-2 md:grid-cols-2">
							<div class="flex flex-col items-center text-center">
								<p>Orang Tua/Wali Murid</p>
								<div
									class="mt-16 h-[1px] w-full max-w-[220px] border-b border-dashed border-base-300"
									aria-hidden="true"
								></div>
								<div class="mt-1 text-sm text-base-content/70">Nama Orang Tua/Wali</div>
							</div>
							<div class="relative flex flex-col items-center text-center">
								<p class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
									{formatValue(ttd?.tempat)}, {formatValue(ttd?.tanggal)}
								</p>
								<p>Wali Kelas</p>
								<div class="mt-16 font-semibold uppercase tracking-wide">{formatUpper(waliKelas?.nama)}</div>
								<div class="mt-1">NIP. {formatValue(waliKelas?.nip)}</div>
							</div>
						</div>
						<div class="text-center">
							<p>Kepala Sekolah</p>
							<div class="mt-16 font-semibold uppercase tracking-wide">{formatUpper(kepalaSekolah?.nama)}</div>
							<div class="mt-1">NIP. {formatValue(kepalaSekolah?.nip)}</div>
						</div>
					</div>
				</footer>
			</div>
		</div>
	</div>
</div>

			<style>
				@media print {
					:global(body) {
						margin: 0 !important;
						padding: 0 !important;
					}
				}
			</style>
