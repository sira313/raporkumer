<script lang="ts">
	import type { ActionReturn } from 'svelte/action';

	type SectionAction = (node: Element) => ActionReturn | void;

	type KeasramaanRow = {
		no: number;
		indikator: string;
		predikat: 'perlu-bimbingan' | 'cukup' | 'baik' | 'sangat-baik';
		deskripsi: string;
		kategoriHeader?: string;
	};

	let {
		rows,
		tableRowAction,
		sectionRef = $bindable<HTMLElement | null>(),
		sectionClass = '',
		splitTrigger,
		formatValue = (v: string | null | undefined) => (v ? v : '—')
	} = $props<{
		rows: KeasramaanRow[];
		tableRowAction?: (node: HTMLTableRowElement, order: number) => ActionReturn<number> | void;
		sectionRef?: HTMLElement | null;
		sectionClass?: string;
		splitTrigger?: SectionAction;
		formatValue?: (value: string | null | undefined) => string;
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

	function predikatToHuruf(predikat: KeasramaanRow['predikat']): string {
		const mapping: Record<KeasramaanRow['predikat'], string> = {
			'sangat-baik': 'A',
			baik: 'B',
			cukup: 'C',
			'perlu-bimbingan': 'D'
		};
		return mapping[predikat] || '—';
	}
</script>

<section class={resolvedSectionClass} bind:this={sectionRef} use:applySplit>
	<table class="table-compact table w-full text-xs print:text-xs">
		<thead>
			<tr class="bg-gray-100 text-black print:bg-gray-100 print:text-black">
				<th class="border border-black px-2 py-1 print:border-black">No</th>
				<th class="border border-black px-2 py-1 print:border-black">Indikator</th>
				<th class="border border-black px-2 py-1 print:border-black">Predikat</th>
				<th class="border border-black px-2 py-1 print:border-black">Deskripsi</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row, idx (idx)}
				{#if row.kategoriHeader}
					<tr use:applyRow={idx}>
						<td
							colspan="4"
							class="border border-black bg-gray-50 px-2 py-1 font-semibold print:border-black print:bg-gray-50"
						>
							{row.kategoriHeader}
						</td>
					</tr>
				{:else}
					<tr use:applyRow={idx}>
						<td class="border border-black px-2 py-1 text-center print:border-black">{row.no}</td>
						<td class="border border-black px-2 py-1 print:border-black"
							>{formatValue(row.indikator)}</td
						>
						<td class="border border-black px-2 py-1 text-center print:border-black"
							>{row.predikat ? predikatToHuruf(row.predikat) : '—'}</td
						>
						<td class="border border-black px-2 py-1 whitespace-pre-wrap print:border-black"
							>{formatValue(row.deskripsi)}</td
						>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
</section>
