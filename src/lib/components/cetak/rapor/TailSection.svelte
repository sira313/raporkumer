<script lang="ts">
	import type { ActionReturn } from 'svelte/action';
	import type { TailBlockKey } from './tail-blocks';

	type MeasureAction = (node: HTMLElement, key: TailBlockKey) => ActionReturn | void;

	const props = $props<{
		tailKey: TailBlockKey;
		rapor: RaporPrintData | null;
		formatValue: (value: string | null | undefined) => string;
		formatUpper: (value: string | null | undefined) => string;
		formatHari: (value: number | null | undefined) => string;
		waliKelas: RaporPrintData['waliKelas'] | null | undefined;
		kepalaSekolah: RaporPrintData['kepalaSekolah'] | null | undefined;
		ttd: RaporPrintData['ttd'] | null | undefined;
		measure?: MeasureAction;
	}>();

	let {
		tailKey,
		rapor,
		formatValue,
		formatUpper,
		formatHari,
		waliKelas,
		kepalaSekolah,
		ttd,
		measure
	} = props;

	function applyMeasurement(node: HTMLElement) {
		if (!measure) return;
		return measure(node, tailKey);
	}

	const sectionClass = $derived.by(() => {
		if (tailKey === 'ketidakhadiran') {
			return 'mt-8 grid gap-6 md:grid-cols-2 print:grid-cols-2';
		}
		if (tailKey === 'footer') {
			return 'mt-12';
		}
		return 'mt-6';
	});
</script>

{#if tailKey === 'kokurikuler'}
	<section class={sectionClass} data-tail-key={tailKey} use:applyMeasurement>
		<table class="border-base-300 w-full border">
			<thead class="bg-base-300">
				<tr>
					<th class="border-base-300 border px-3 py-2 text-left">Kokurikuler</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="border-base-300 border px-3 py-3 whitespace-pre-line">
						{formatValue(rapor?.kokurikuler)}
					</td>
				</tr>
			</tbody>
		</table>
	</section>
{:else if tailKey === 'ekstrakurikuler'}
	<section class={sectionClass} data-tail-key={tailKey} use:applyMeasurement>
		<table class="border-base-300 w-full border">
			<thead class="bg-base-300">
				<tr>
					<th class="border-base-300 border px-3 py-2 text-left" style="width: 40px;">No.</th>
					<th class="border-base-300 border px-3 py-2 text-left">Ekstrakurikuler</th>
					<th class="border-base-300 border px-3 py-2 text-left">Keterangan</th>
				</tr>
			</thead>
			<tbody>
				{#if (rapor?.ekstrakurikuler?.length ?? 0) === 0}
					<tr>
						<td class="border-base-300 border px-3 py-2 text-center" colspan="3">
							Belum ada data ekstrakurikuler.
						</td>
					</tr>
				{:else}
					{#each rapor?.ekstrakurikuler ?? [] as ekskul, index (index)}
						<tr>
							<td class="border-base-300 border px-3 py-2 align-top">{index + 1}</td>
							<td class="border-base-300 border px-3 py-2 align-top">
								{formatValue(ekskul.nama)}
							</td>
							<td class="border-base-300 border px-3 py-2 align-top whitespace-pre-line">
								{formatValue(ekskul.deskripsi)}
							</td>
						</tr>
					{/each}
				{/if}
			</tbody>
		</table>
	</section>
{:else if tailKey === 'ketidakhadiran'}
	<section class={sectionClass} data-tail-key={tailKey} use:applyMeasurement>
		<table class="border-base-300 w-full border">
			<thead class="bg-base-300">
				<tr>
					<th class="border-base-300 border px-3 py-2 text-left" colspan="2">Ketidakhadiran</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="border-base-300 border px-3 py-2">Sakit</td>
					<td class="border-base-300 border px-3 py-2 text-center">
						{formatHari(rapor?.ketidakhadiran?.sakit)}
					</td>
				</tr>
				<tr>
					<td class="border-base-300 border px-3 py-2">Izin</td>
					<td class="border-base-300 border px-3 py-2 text-center">
						{formatHari(rapor?.ketidakhadiran?.izin)}
					</td>
				</tr>
				<tr>
					<td class="border-base-300 border px-3 py-2">Tanpa Keterangan</td>
					<td class="border-base-300 border px-3 py-2 text-center">
						{formatHari(rapor?.ketidakhadiran?.tanpaKeterangan)}
					</td>
				</tr>
			</tbody>
		</table>
		<table class="border-base-300 w-full border">
			<thead class="bg-base-300">
				<tr>
					<th class="border-base-300 border px-3 py-2 text-left">Catatan Wali Kelas</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="border-base-300 min-h-[80px] border px-3 py-3 whitespace-pre-line">
						{formatValue(rapor?.catatanWali)}
					</td>
				</tr>
			</tbody>
		</table>
	</section>
{:else if tailKey === 'tanggapan'}
	<section class={sectionClass} data-tail-key={tailKey} use:applyMeasurement>
		<table class="border-base-300 w-full border">
			<thead class="bg-base-300">
				<tr>
					<th class="border-base-300 border px-3 py-2 text-left">
						Tanggapan Orang Tua/Wali Murid
					</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="border-base-300 border px-3 py-4 align-top">
						<div class="min-h-[70px] whitespace-pre-line">
							{rapor?.tanggapanOrangTua?.trim() || ''}
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</section>
{:else if tailKey === 'footer'}
	<section class={sectionClass} data-tail-key={tailKey} use:applyMeasurement>
		<div class="flex flex-col gap-10">
			<div class="grid gap-8 md:grid-cols-2 print:grid-cols-2">
				<div class="flex flex-col items-center text-center">
					<p>Orang Tua/Wali Murid</p>
					<div
						class="border-base-300 mt-16 h-[1px] w-full max-w-[220px] border-b border-dashed"
						aria-hidden="true"
					></div>
					<div class="text-base-content/70 mt-1 text-sm">Nama Orang Tua/Wali</div>
				</div>
				<div class="relative flex flex-col items-center text-center">
					<p class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
						{formatValue(ttd?.tempat)}, {formatValue(ttd?.tanggal)}
					</p>
					<p>Wali Kelas</p>
					<div class="mt-16 font-semibold tracking-wide uppercase">
						{formatUpper(waliKelas?.nama)}
					</div>
					<div class="mt-1">NIP. {formatValue(waliKelas?.nip)}</div>
				</div>
			</div>
			<div class="text-center">
				<p>Kepala Sekolah</p>
				<div class="mt-16 font-semibold tracking-wide uppercase">
					{formatUpper(kepalaSekolah?.nama)}
				</div>
				<div class="mt-1">NIP. {formatValue(kepalaSekolah?.nip)}</div>
			</div>
		</div>
	</section>
{/if}
