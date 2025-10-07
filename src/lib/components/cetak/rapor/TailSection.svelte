<script lang="ts">
	import type { ActionReturn } from 'svelte/action';
	import { DEFAULT_KOKURIKULER_MESSAGE } from '$lib/kokurikuler';
	import type { TailBlockKey } from './tail-blocks';

	type MeasureAction = (node: HTMLElement, key: TailBlockKey) => ActionReturn | void;

	const props = $props<{
		tailKey: TailBlockKey;
		rapor: RaporPrintData | null;
		formatValue: (value: string | null | undefined) => string;
		formatHari: (value: number | null | undefined) => string;
		waliKelas: RaporPrintData['waliKelas'] | null | undefined;
		kepalaSekolah: RaporPrintData['kepalaSekolah'] | null | undefined;
		ttd: RaporPrintData['ttd'] | null | undefined;
		measure?: MeasureAction;
		class?: string;
	}>();

	let {
		tailKey,
		rapor,
		formatValue,
		formatHari,
		waliKelas,
		kepalaSekolah,
		ttd,
		measure,
		class: className = ''
	} = props;

	function applyMeasurement(node: HTMLElement) {
		if (!measure) return;
		return measure(node, tailKey);
	}

	function normalizeSemester(value: string | null | undefined): string {
		if (!value) return '';
		return value
			.replace(/semester/giu, '')
			.replace(/[^a-z0-9]+/giu, ' ')
			.trim()
			.toLowerCase();
	}

	function isGenap(value: string | null | undefined): boolean {
		const normalized = normalizeSemester(value);
		if (!normalized) return false;
		if (normalized.includes('genap')) return true;
		return normalized === '2';
	}

	function parseRombelLevel(value: string | null | undefined): number | null {
		if (!value) return null;
		const trimmed = value.trim();
		if (!trimmed) return null;
		const digitMatch = trimmed.match(/(\d{1,2})/u);
		if (digitMatch) {
			return Number.parseInt(digitMatch[1], 10);
		}
		const upper = trimmed.toUpperCase();
		const romanMap: Record<string, number> = {
			VI: 6,
			V: 5,
			IV: 4,
			III: 3,
			II: 2,
			I: 1
		};
		for (const [roman, level] of Object.entries(romanMap)) {
			if (upper.includes(roman)) {
				return level;
			}
		}
		return null;
	}

	const isSemesterGenap = $derived.by(() => isGenap(rapor?.periode?.semester ?? null));

	const rombelLevel = $derived.by(() => parseRombelLevel(rapor?.rombel?.nama ?? null));

	const isKelasEnam = $derived.by(() => rombelLevel === 6);

	const decisionLabels = $derived.by(() => {
		if (!isSemesterGenap) return null;
		return {
			positive: isKelasEnam ? 'Lulus' : 'Naik Kelas',
			negative: isKelasEnam ? 'Tidak Lulus' : 'Tidak Naik Kelas'
		};
	});

	const sectionClass = $derived.by(() => {
		if (tailKey === 'ketidakhadiran') {
			return 'grid gap-4 md:grid-cols-2 print:grid-cols-2';
		}
		if (tailKey === 'kokurikuler') {
			return 'pt-2';
		}
		if (tailKey === 'footer') {
			return 'pt-4';
		}
		if (tailKey === 'tanggapan' && isSemesterGenap) {
			return 'grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] print:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]';
		}
		return '';
	});

	const resolvedSectionClass = $derived.by(() =>
		[sectionClass, className].filter(Boolean).join(' ')
	);

	const kokurikulerNarrative = $derived.by(() => {
		const base = formatValue(rapor?.kokurikuler);
		if (base === '—') {
			return DEFAULT_KOKURIKULER_MESSAGE;
		}
		return base;
	});

	const kokurikulerSentences = $derived.by(() => {
		const sentences = kokurikulerNarrative
			.split(/\n+/)
			.map((sentence: string) => sentence.trim())
			.filter((sentence: string) => sentence.length > 0);
		return sentences.length > 0 ? sentences : [kokurikulerNarrative];
	});
</script>

{#if tailKey === 'kokurikuler'}
	<section class={resolvedSectionClass} data-tail-key={tailKey} use:applyMeasurement>
		<table class="border-base-300 w-full border">
			<thead class="bg-base-300">
				<tr>
					<th class="border-base-300 border px-3 py-2 text-left">Kokurikuler</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="border-base-300 border px-3 py-3">
						<div class="flex flex-col gap-2 whitespace-pre-line">
							{#each kokurikulerSentences as sentence, idx (idx)}
								<span>{sentence}</span>
							{/each}
						</div>
					</td>
				</tr>
			</tbody>
		</table>
	</section>
{:else if tailKey === 'ekstrakurikuler'}
	<section class={resolvedSectionClass} data-tail-key={tailKey} use:applyMeasurement>
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
	<section class={resolvedSectionClass} data-tail-key={tailKey} use:applyMeasurement>
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
					<td class="border-base-300 min-h-[80px] border px-3 py-3 align-top whitespace-pre-line">
						{formatValue(rapor?.catatanWali)}
					</td>
				</tr>
			</tbody>
		</table>
	</section>
{:else if tailKey === 'tanggapan'}
	<section class={resolvedSectionClass} data-tail-key={tailKey} use:applyMeasurement>
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
		{#if decisionLabels}
			<table class="border-base-300 w-full border">
				<thead class="bg-base-300">
					<tr>
						<th class="border-base-300 border px-3 py-2 text-left">Keputusan</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td class="border-base-300 border px-3 py-4">
							<div class="flex flex-col gap-3">
								<div class="flex items-center justify-between gap-4">
									<span>{decisionLabels.positive}</span>
									<span class="border-base-300 h-5 w-5 border" aria-hidden="true"></span>
								</div>
								<div class="flex items-center justify-between gap-4">
									<span>{decisionLabels.negative}</span>
									<span class="border-base-300 h-5 w-5 border" aria-hidden="true"></span>
								</div>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		{/if}
	</section>
{:else if tailKey === 'footer'}
	<section class={resolvedSectionClass} data-tail-key={tailKey} use:applyMeasurement>
		<div class="flex flex-col gap-6">
			<div class="grid gap-4 md:grid-cols-2 print:grid-cols-2">
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
					<div class="mt-16 font-semibold tracking-wide">
						{formatValue(waliKelas?.nama)}
					</div>
					<div class="mt-1">NIP. {formatValue(waliKelas?.nip)}</div>
				</div>
			</div>
			<div class="text-center">
				<p>Kepala Sekolah</p>
				<div class="mt-16 font-semibold tracking-wide">
					{formatValue(kepalaSekolah?.nama)}
				</div>
				<div class="mt-1">NIP. {formatValue(kepalaSekolah?.nip)}</div>
			</div>
		</div>
	</section>
{/if}
