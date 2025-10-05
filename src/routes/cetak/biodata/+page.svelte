<script lang="ts">
	import { onMount } from 'svelte';
	import PrintTip from '$lib/components/alerts/print-tip.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import { printElement } from '$lib/utils';

	let { data } = $props();
	let printable: HTMLDivElement | null = null;

	const biodata = $derived.by(() => data.biodataData ?? null);
	const sekolah = $derived.by(() => biodata?.sekolah ?? null);
	const murid = $derived.by(() => biodata?.murid ?? null);
	const orangTua = $derived.by(() => biodata?.orangTua ?? null);
	const wali = $derived.by(() => biodata?.wali ?? null);
	const ttd = $derived.by(() => biodata?.ttd ?? null);
	const printTitle = $derived.by(() => data.meta?.title ?? 'Biodata Murid');

	function formatValue(value: string | null | undefined) {
		if (!value) return '—';
		const trimmed = value.trim();
		return trimmed.length ? trimmed : '—';
	}

	function formatUpper(value: string | null | undefined) {
		const formatted = formatValue(value);
		return formatted === '—' ? formatted : formatted.toUpperCase();
	}

	function combinePlaceDate(tempat: string | null | undefined, tanggal: string | null | undefined) {
		const place = formatValue(tempat);
		const date = formatValue(tanggal);
		if (place === '—' && date === '—') return '—';
		if (place === '—') return date;
		if (date === '—') return place;
		return `${place}, ${date}`;
	}

	function handlePrint() {
		const ok = printElement(printable, {
			title: printTitle,
			pageMargin: '0'
		});
		if (!ok) {
			toast('Elemen biodata belum siap untuk dicetak. Coba muat ulang halaman.', 'warning');
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

<PrintTip onPrint={handlePrint} buttonLabel="Cetak biodata" />

<div class="card bg-base-100 rounded-lg border border-none shadow-md print:bg-transparent print:shadow-none print:border-none">
	<div
		class="min-w-[210mm] max-w-[210mm] min-h-[297mm] max-h-[297mm] mx-auto bg-base-100 text-base-content flex flex-col"
		bind:this={printable}
	>
		<div class="m-[20mm] flex flex-1 flex-col">
			<header class="text-center">
				<h1 class="text-xl font-bold tracking-wide uppercase">Identitas Peserta Didik</h1>
				{#if sekolah}
					<p class="mt-1 text-sm uppercase tracking-wide text-base-content/70">{formatUpper(sekolah?.nama)}</p>
				{/if}
			</header>

			<section class="mt-6 flex-1 text-base leading-relaxed">
				<table class="w-full border-collapse text-[13px]">
					<tbody>
						<tr>
							<td class="align-top" style="width: 1.75rem;">1.</td>
							<td class="align-top" style="width: 220px;">Nama Peserta Didik</td>
							<td class="align-top" style="width: 0.75rem;">:</td>
							<td class="font-semibold uppercase">{formatUpper(murid?.nama)}</td>
						</tr>
						<tr>
							<td class="align-top">2.</td>
							<td class="align-top">NIS / NISN</td>
							<td class="align-top">:</td>
							<td class="font-semibold">{formatValue(murid?.nis)} / {formatValue(murid?.nisn)}</td>
						</tr>
						<tr>
							<td class="align-top">3.</td>
							<td class="align-top">Tempat / Tanggal Lahir</td>
							<td class="align-top">:</td>
							<td class="font-semibold">{combinePlaceDate(murid?.tempatLahir, murid?.tanggalLahir)}</td>
						</tr>
						<tr>
							<td class="align-top">4.</td>
							<td class="align-top">Jenis Kelamin</td>
							<td class="align-top">:</td>
							<td class="font-semibold">{formatValue(murid?.jenisKelamin)}</td>
						</tr>
						<tr>
							<td class="align-top">5.</td>
							<td class="align-top">Agama</td>
							<td class="align-top">:</td>
							<td class="font-semibold">{formatValue(murid?.agama)}</td>
						</tr>
						<tr>
							<td class="align-top">6.</td>
							<td class="align-top">Pendidikan Sebelumnya</td>
							<td class="align-top">:</td>
							<td class="font-semibold">{formatValue(murid?.pendidikanSebelumnya)}</td>
						</tr>
						<tr>
							<td class="align-top">7.</td>
							<td class="align-top">Alamat Peserta Didik</td>
							<td class="align-top">:</td>
							<td class="font-semibold">
								{formatValue(murid?.alamat?.jalan)}, {formatValue(murid?.alamat?.kelurahan)},
								Kec. {formatValue(murid?.alamat?.kecamatan)}, Kab. {formatValue(murid?.alamat?.kabupaten)},
								{formatValue(murid?.alamat?.provinsi)}
							</td>
						</tr>
						<tr>
							<td class="align-top">8.</td>
							<td class="align-top" style="width: 220px;">Nama Orang Tua</td>
							<td class="align-top" style="width: 0.75rem;"></td>
							<td></td>
						</tr>
						<tr>
							<td></td>
							<td class="align-top" style="width: 220px;">Ayah</td>
							<td class="align-top" style="width: 0.75rem;">:</td>
							<td class="font-semibold uppercase">{formatUpper(orangTua?.ayah?.nama)}</td>
						</tr>
						<tr>
							<td></td>
							<td class="align-top" style="width: 220px;">Ibu</td>
							<td class="align-top" style="width: 0.75rem;">:</td>
							<td class="font-semibold uppercase">{formatUpper(orangTua?.ibu?.nama)}</td>
						</tr>
						<tr>
							<td class="align-top">9.</td>
							<td class="align-top" style="width: 220px;">Pekerjaan Orang Tua</td>
							<td class="align-top" style="width: 0.75rem;"></td>
							<td></td>
						</tr>
						<tr>
							<td></td>
							<td class="align-top" style="width: 220px;">Ayah</td>
							<td class="align-top" style="width: 0.75rem;">:</td>
							<td class="font-semibold">{formatValue(orangTua?.ayah?.pekerjaan)}</td>
						</tr>
						<tr>
							<td></td>
							<td class="align-top" style="width: 220px;">Ibu</td>
							<td class="align-top" style="width: 0.75rem;">:</td>
							<td class="font-semibold">{formatValue(orangTua?.ibu?.pekerjaan)}</td>
						</tr>
						<tr>
							<td class="align-top">10.</td>
							<td class="align-top" style="width: 220px;">Alamat Orang Tua</td>
							<td class="align-top" style="width: 0.75rem;"></td>
							<td></td>
						</tr>
						<tr>
							<td></td>
							<td class="align-top" style="width: 220px;">Jalan</td>
							<td class="align-top" style="width: 0.75rem;">:</td>
							<td class="font-semibold">{formatValue(orangTua?.alamat?.jalan)}</td>
						</tr>
						<tr>
							<td></td>
							<td class="align-top" style="width: 220px;">Kelurahan/Desa</td>
							<td class="align-top" style="width: 0.75rem;">:</td>
							<td class="font-semibold">{formatValue(orangTua?.alamat?.kelurahan)}</td>
						</tr>
						<tr>
							<td></td>
							<td class="align-top" style="width: 220px;">Kecamatan</td>
							<td class="align-top" style="width: 0.75rem;">:</td>
							<td class="font-semibold">{formatValue(orangTua?.alamat?.kecamatan)}</td>
						</tr>
						<tr>
							<td></td>
							<td class="align-top" style="width: 220px;">Kabupaten/Kota</td>
							<td class="align-top" style="width: 0.75rem;">:</td>
							<td class="font-semibold">{formatValue(orangTua?.alamat?.kabupaten)}</td>
						</tr>
						<tr>
							<td></td>
							<td class="align-top" style="width: 220px;">Provinsi</td>
							<td class="align-top" style="width: 0.75rem;">:</td>
							<td class="font-semibold">{formatValue(orangTua?.alamat?.provinsi)}</td>
						</tr>
						<tr>
							<td class="align-top">11.</td>
							<td class="align-top" style="width: 220px;">Wali Peserta Didik</td>
							<td class="align-top" style="width: 0.75rem;"></td>
							<td></td>
						</tr>
						<tr>
							<td></td>
							<td class="align-top" style="width: 220px;">Nama Wali</td>
							<td class="align-top" style="width: 0.75rem;">:</td>
							<td class="font-semibold uppercase">{formatUpper(wali?.nama)}</td>
						</tr>
						<tr>
							<td></td>
							<td class="align-top" style="width: 220px;">Pekerjaan Wali</td>
							<td class="align-top" style="width: 0.75rem;">:</td>
							<td class="font-semibold">{formatValue(wali?.pekerjaan)}</td>
						</tr>
						<tr>
							<td></td>
							<td class="align-top" style="width: 220px;">Alamat Wali</td>
							<td class="align-top" style="width: 0.75rem;">:</td>
							<td class="font-semibold">{formatValue(wali?.alamat)}</td>
						</tr>
					</tbody>
				</table>
			</section>

			<footer class="mt-auto flex justify-end gap-8 text-sm leading-relaxed pt-12">
        <div class="flex flex-col items-center gap-3 text-center">
					<div class="flex h-[40mm] w-[30mm] flex-col items-center justify-center gap-1 border border-base-content">
						<span class="text-xs uppercase tracking-wide">Pas Foto</span>
						<span class="text-xs">3 x 4</span>
					</div>
				</div>
				<div class="text-left">
					<p>{formatValue(ttd?.tempat)}, {formatValue(ttd?.tanggal)}</p>
					<p>Kepala Sekolah,</p>
					<div class="mt-12 font-semibold uppercase tracking-wide">{formatValue(ttd?.kepalaSekolah)}</div>
					<div class="mt-1">NIP. {formatValue(ttd?.nip)}</div>
				</div>
			</footer>
		</div>
	</div>
</div>
