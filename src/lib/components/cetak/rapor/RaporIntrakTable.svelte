<script lang="ts">
	import type { ActionReturn } from 'svelte/action';
	import TailSection from './TailSection.svelte';
	import { hasIntrakRows, type TableRow } from './table-rows';

	type TableRowAction = (node: HTMLTableRowElement, order: number) => ActionReturn<number> | void;
	type SectionAction = (node: Element) => ActionReturn | void;

	let {
		rows,
		tableRowAction,
		rapor,
		formatValue,
		formatUpper,
		formatHari,
		waliKelas,
		kepalaSekolah,
		ttd,
		sectionRef = $bindable<HTMLElement | null>(),
		sectionClass = '',
		splitTrigger
	} = $props<{
		rows: TableRow[];
		tableRowAction: TableRowAction;
		rapor: RaporPrintData | null;
		formatValue: (value: string | null | undefined) => string;
		formatUpper: (value: string | null | undefined) => string;
		formatHari: (value: number | null | undefined) => string;
		waliKelas: RaporPrintData['waliKelas'] | null | undefined;
		kepalaSekolah: RaporPrintData['kepalaSekolah'] | null | undefined;
		ttd: RaporPrintData['ttd'] | null | undefined;
		sectionRef?: HTMLElement | null;
		sectionClass?: string;
		splitTrigger?: SectionAction;
	}>();

	function applySplit(node: Element) {
		if (!splitTrigger) return;
		return splitTrigger(node);
	}

	function applyRow(node: HTMLTableRowElement, order: number) {
		if (!tableRowAction) return;
		return tableRowAction(node, order);
	}

	const resolvedSectionClass = $derived.by(() => [sectionClass].filter(Boolean).join(' '));

	const shouldRenderHeader = $derived.by(() => hasIntrakRows(rows));

	function descriptionParagraphs(value: string | null | undefined) {
		const formatted = formatValue(value);
		if (formatted === '—') return [formatted];
		const segments = formatted
			.split(/\r?\n+/)
			.map((part: string) => part.trim())
			.filter((part: string) => part.length > 0)
			.map((part: string) => {
				const withoutTrailingPeriod = part.replace(/\.+$/u, '');
				if (withoutTrailingPeriod.length === 0) return '';
				const endsWithTerminal = /[!?]$/.test(withoutTrailingPeriod);
				return endsWithTerminal ? withoutTrailingPeriod : `${withoutTrailingPeriod}.`;
			})
			.filter((part: string) => part.length > 0);
		return segments.length > 0 ? segments : [formatted];
	}
</script>

<section class={resolvedSectionClass} bind:this={sectionRef} use:applySplit>
	<table class="border-base-300 w-full border-collapse" data-intrak-table="true">
		{#if shouldRenderHeader}
			<thead class="bg-base-300">
				<tr>
					<th class="border-base-300 border px-3 py-2 text-left">No.</th>
					<th class="border-base-300 border px-3 py-2 text-left">Muatan Pelajaran</th>
					<th class="border-base-300 border px-3 py-2 text-center">Nilai Akhir</th>
					<th class="border-base-300 border px-3 py-2 text-left">Capaian Kompetensi</th>
				</tr>
			</thead>
		{/if}
		<tbody>
			{#each rows as row (row.kind === 'intrak' ? `intrak-${row.index}` : row.kind === 'tail' ? `tail-${row.tailKey}` : 'empty')}
				{#if row.kind === 'intrak'}
					<tr use:applyRow={row.order}>
						<td class="border-base-300 border px-3 py-2 align-top">{row.nomor}</td>
						<td class="border-base-300 border px-3 py-2 align-top">
							<span class="font-semibold">{row.entry.mataPelajaran}</span>
						</td>
						<td class="border-base-300 border px-3 py-2 text-center align-top font-semibold">
							{formatValue(row.entry.nilaiAkhir)}
						</td>
						<td class="border-base-300 border px-3 py-2 align-top">
							<div class="flex flex-col gap-2">
								{#each descriptionParagraphs(row.entry.deskripsi) as paragraph, idx (idx)}
									<span class="whitespace-pre-line">{paragraph}</span>
								{/each}
							</div>
						</td>
					</tr>
				{:else if row.kind === 'empty'}
					<tr use:applyRow={row.order}>
						<td class="border-base-300 border px-3 py-2 text-center" colspan="4">
							Belum ada data intrakurikuler.
						</td>
					</tr>
				{:else}
					<tr use:applyRow={row.order} data-tail-row="true">
						<td class="border-none p-0 align-top" colspan="4">
							<div class="flex flex-col gap-4 my-2">
								<TailSection
									tailKey={row.tailKey}
									rapor={rapor}
									formatValue={formatValue}
									formatUpper={formatUpper}
									formatHari={formatHari}
									waliKelas={waliKelas}
									kepalaSekolah={kepalaSekolah}
									ttd={ttd}
								/>
							</div>
						</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
</section>
