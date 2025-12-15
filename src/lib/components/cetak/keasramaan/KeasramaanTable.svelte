<script lang="ts">
	import type { ActionReturn } from 'svelte/action';

	type SectionAction = (node: Element) => ActionReturn | void;

	type KeasramaanRow = {
		no: number;
		indikator: string;
		predikat: 'perlu-bimbingan' | 'cukup' | 'baik' | 'sangat-baik';
		deskripsi: string;
		kategoriHeader?: string;
		order?: number; // For table pagination tracking
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
			<tr class="text-black print:text-black">
				<th class="border border-black px-2 py-1 text-center print:border-black">No</th>
				<th class="border border-black px-2 py-1 text-center print:border-black">Indikator</th>
				<th class="border border-black px-2 py-1 text-center print:border-black">Predikat</th>
				<th class="border border-black px-2 py-1 text-center print:border-black">Deskripsi</th>
			</tr>
		</thead>
		<tbody>
			{#each rows as row, idx (idx)}
				{@const rowOrder = row.order ?? idx}
				{#if row.kategoriHeader}
					<tr use:applyRow={rowOrder} data-row-order={rowOrder}>
						<td colspan="4" class="border border-black px-2 py-1 font-semibold print:border-black">
							{row.kategoriHeader}
						</td>
					</tr>
				{:else}
					<tr use:applyRow={rowOrder} data-row-order={rowOrder}>
						<td class="border border-black px-2 py-1 text-center align-top print:border-black"
							>{row.no}</td
						>
						<td class="border border-black px-2 py-1 align-top print:border-black"
							>{formatValue(row.indikator)}</td
						>
						<td class="border border-black px-2 py-1 text-center print:border-black"
							>{row.predikat ? predikatToHuruf(row.predikat) : '—'}</td
						>
						<td class="break-word border border-black px-2 py-1 align-top print:border-black">
							<div class="flex flex-col gap-0.5">
								{#each formatValue(row.deskripsi)
									.split('\n')
									.filter((p: string) => p.trim()) as paragraph}
									<p>{paragraph}</p>
								{/each}
							</div>
						</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
</section>
