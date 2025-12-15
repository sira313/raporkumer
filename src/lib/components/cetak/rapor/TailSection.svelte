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

	const hasKokurikuler = $derived.by(() => Boolean(rapor?.hasKokurikuler));

	const kepalaSekolahTitle = $derived.by(() => {
		const status = kepalaSekolah?.statusKepalaSekolah;
		return status === 'plt' ? 'Plt. Kepala Sekolah' : 'Kepala Sekolah';
	});

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
		if (tailKey === 'ekstrakurikuler' && !hasKokurikuler) {
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
		// Ensure tail sections are kept together during print by default
		[sectionClass, className, 'break-inside-avoid', 'print:break-inside-avoid']
			.filter(Boolean)
			.join(' ')
	);

	const kokurikulerNarrative = $derived.by(() => {
		if (!hasKokurikuler) return '';
		const base = formatValue(rapor?.kokurikuler);
		if (base === '—') {
			return DEFAULT_KOKURIKULER_MESSAGE;
		}
		return base;
	});

	const kokurikulerSentences = $derived.by(() => {
		if (!hasKokurikuler) return [] as string[];
		const sentences = kokurikulerNarrative
			.split(/\n+/)
			.map((sentence: string) => sentence.trim())
			.filter((sentence: string) => sentence.length > 0);
		return sentences.length > 0 ? sentences : [kokurikulerNarrative].filter(Boolean);
	});

	// Helpers copied/adapted from RaporIntrakTable to support "full" description rendering

	type DescriptionBlock = { kind: 'text'; text: string } | { kind: 'list'; items: string[] };

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function _descriptionBlocks(value: string | null | undefined): DescriptionBlock[] {
		const formatted = formatValue(value);
		if (formatted === '—') return [{ kind: 'text', text: formatted }];

		const lines = formatted
			.split(/\r?\n/)
			.map((l: string) => l.trim())
			.filter((l: string) => l.length > 0);

		const blocks: DescriptionBlock[] = [];
		let currentList: string[] | null = null;

		for (const line of lines) {
			if (/^[-•*]\s+/.test(line)) {
				const item = line
					.replace(/^[-•*]\s+/, '')
					.replace(/[.!?]+$/u, '')
					.trim();
				if (!currentList) {
					currentList = [];
					blocks.push({ kind: 'list', items: currentList });
				}
				currentList.push(item);
				continue;
			}

			// Non-list line: close any open list
			currentList = null;

			const withoutTrailingPeriod = line.replace(/\.+$/u, '');
			// Don't add period for standalone "-" (belum dinilai)
			if (withoutTrailingPeriod === '-') {
				blocks.push({ kind: 'text', text: '-' });
				continue;
			}
			const endsWithTerminal = /[!?:]$/.test(withoutTrailingPeriod);
			const text = endsWithTerminal ? withoutTrailingPeriod : `${withoutTrailingPeriod}.`;
			blocks.push({ kind: 'text', text });
		}

		return blocks.length > 0 ? blocks : [{ kind: 'text', text: formatted }];
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	function _paragraphPaddingClass(text: string | null | undefined): string {
		// Apply predikat-based padding for all TP modes for ekstrakurikuler
		const t = (text ?? '').toLowerCase();
		if (!t) return 'py-2';
		if (/perlu bimbingan|masih perlu bimbingan/.test(t)) return 'pb-2';
		// "Tercapai" group (sangat-baik, baik, cukup) should have top padding
		if (
			/\bsangat\s*(baik|menguasai|menunjukkan|unggul|istimewa|sangat baik)/.test(t) ||
			/menunjukkan penguasaan yang sangat baik/.test(t)
		) {
			return 'pt-2 py-2';
		}
		if (/menunjukkan penguasaan yang baik/.test(t) || /\bbaik\b/.test(t)) return 'pt-2 pb-2';
		if (/cukup/.test(t) || /cukup menguasai/.test(t)) return 'pt-2 pb-2';
		return 'py-2';
	}
</script>

{#if tailKey === 'kokurikuler'}
	{#if hasKokurikuler}
		<section class={resolvedSectionClass} data-tail-key={tailKey} use:applyMeasurement>
			<table class="w-full border">
				<thead>
					<tr>
						<th class="border px-2 py-1 text-center">Kokurikuler</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td class="border px-2 py-1">
							<div class="flex flex-col gap-0.5 whitespace-pre-line">
								{#each kokurikulerSentences as sentence, idx (idx)}
									<span>{sentence}</span>
								{/each}
							</div>
						</td>
					</tr>
				</tbody>
			</table>
		</section>
	{/if}
{:else if tailKey === 'ekstrakurikuler'}
	<!-- Ekstrakurikuler is now rendered as individual rows for efficient pagination -->
	<!-- This block should not be reached as ekstrakurikuler is handled separately -->
{:else if tailKey === 'ketidakhadiran'}
	<section class={resolvedSectionClass} data-tail-key={tailKey} use:applyMeasurement>
		<table class="w-full border">
			<thead>
				<tr>
					<th class="border px-2 py-1 text-center" colspan="2">Ketidakhadiran</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="border px-2 py-1">Sakit</td>
					<td class="border px-2 py-1 text-center">
						{formatHari(rapor?.ketidakhadiran?.sakit)}
					</td>
				</tr>
				<tr>
					<td class="border px-2 py-1">Izin</td>
					<td class="border px-2 py-1 text-center">
						{formatHari(rapor?.ketidakhadiran?.izin)}
					</td>
				</tr>
				<tr>
					<td class="border px-2 py-1">Tanpa Keterangan</td>
					<td class="border px-2 py-1 text-center">
						{formatHari(rapor?.ketidakhadiran?.tanpaKeterangan)}
					</td>
				</tr>
			</tbody>
		</table>
		<table class="w-full border">
			<thead>
				<tr>
					<th class="border px-2 py-1 text-center">Catatan Wali Kelas</th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="min-h-20 border px-2 py-1 align-top whitespace-pre-line">
						{formatValue(rapor?.catatanWali)}
					</td>
				</tr>
			</tbody>
		</table>
	</section>
{:else if tailKey === 'tanggapan'}
	<section class={resolvedSectionClass} data-tail-key={tailKey} use:applyMeasurement>
		<table class="w-full border">
			<thead>
				<tr>
					<th class="border px-2 py-1 text-center"> Tanggapan Orang Tua/Wali Murid </th>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td class="border px-2 py-1 align-top">
						<div class="min-h-[70px] whitespace-pre-line">
							{rapor?.tanggapanOrangTua?.trim() || ''}
						</div>
					</td>
				</tr>
			</tbody>
		</table>
		{#if decisionLabels}
			<table class="w-full border">
				<thead>
					<tr>
						<th class="border px-3 py-2 text-left">Keputusan</th>
					</tr>
				</thead>
				<tbody>
					<tr>
						<td class="border px-3 py-4">
							<div class="flex flex-col gap-3">
								<div class="flex items-center justify-between gap-4">
									<span>{decisionLabels.positive}</span>
									<span class="h-5 w-5 border" aria-hidden="true"></span>
								</div>
								<div class="flex items-center justify-between gap-4">
									<span>{decisionLabels.negative}</span>
									<span class="h-5 w-5 border" aria-hidden="true"></span>
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
			<div class="grid gap-4 md:grid-cols-3 print:grid-cols-3">
				<div class="flex flex-col items-center text-center">
					<p>Orang Tua/Wali Murid</p>
					<div
						class="mt-20 h-px w-full max-w-[220px] border-b border-dashed"
						aria-hidden="true"
					></div>
				</div>
				<div class="text-center">
					<p>{kepalaSekolahTitle}</p>
					<div class="mt-16 font-semibold tracking-wide underline">
						{formatValue(kepalaSekolah?.nama)}
					</div>
					<div class="mt-1">{formatValue(kepalaSekolah?.nip)}</div>
				</div>
				<div class="relative flex flex-col items-center text-center">
					<p class="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
						{formatValue(ttd?.tempat)}, {formatValue(ttd?.tanggal)}
					</p>
					<p>Wali Kelas</p>
					<div class="mt-16 font-semibold tracking-wide underline">
						{formatValue(waliKelas?.nama)}
					</div>
					<div class="mt-1">{formatValue(waliKelas?.nip)}</div>
				</div>
			</div>
		</div>
	</section>
{/if}
