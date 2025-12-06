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
		formatHari: (value: number | null | undefined) => string;
		waliKelas: RaporPrintData['waliKelas'] | null | undefined;
		kepalaSekolah: RaporPrintData['kepalaSekolah'] | null | undefined;
		// Use a local shape for ttd to avoid issues with indexed access in some TS configs
		ttd: { tempat?: string; tanggal?: string } | null | undefined;
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

	type DescriptionBlock = { kind: 'text'; text: string } | { kind: 'list'; items: string[] };

	function descriptionBlocks(value: string | null | undefined): DescriptionBlock[] {
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
			const endsWithTerminal = /[!?:]$/.test(withoutTrailingPeriod);
			const text = endsWithTerminal ? withoutTrailingPeriod : `${withoutTrailingPeriod}.`;
			blocks.push({ kind: 'text', text });
		}

		return blocks.length > 0 ? blocks : [{ kind: 'text', text: formatted }];
	}

	function predikatClassFromParagraph(text: string | null | undefined, isTop = false): string {
		// For Full TP mode, the caller determines which paragraph is the top/highest.
		// If top, give `py-2`, otherwise `pb-2`.
		const isFull = rapor?.tpMode === 'full';
		if (isFull) return isTop ? 'py-2' : 'pb-2';

		// For non-Full modes, fall back to heuristics based on wording.
		if (!text) return '';
		const t = text.toLowerCase();
		if (/perlu bimbingan|masih perlu bimbingan/.test(t)) return 'pb-2';
		// "Tercapai" group (sangat-baik, baik, cukup) should have top padding
		if (/cukup/.test(t) || /cukup menguasai/.test(t)) return 'pt-2 pb-2';
		if (
			/\bsangat\s*(baik|menguasai|menunjukkan|unggul|istimewa|sangat baik)/.test(t) ||
			/menunjukkan penguasaan yang sangat baik/.test(t)
		)
			return 'pt-2 py-2';
		if (/menunjukkan penguasaan yang baik/.test(t) || /\bbaik\b/.test(t)) return 'pt-2 pb-2';
		return '';
	}

	function paragraphScore(text: string | null | undefined): number {
		if (!text) return 2;
		const t = text.toLowerCase();
		if (
			/sangat\s*(baik|menguasai|unggul|istimewa)/.test(t) ||
			/menunjukkan penguasaan yang sangat baik/.test(t)
		)
			return 4;
		if (/menunjukkan penguasaan yang baik/.test(t) || /\bbaik\b/.test(t)) return 3;
		if (/cukup/.test(t) || /cukup menguasai/.test(t)) return 2;
		if (/perlu bimbingan|masih perlu bimbingan/.test(t)) return 1;
		return 2;
	}

	const topSubIndexByEntry = $derived.by(() => {
		const groups = new Map<number, Array<{ subIndex?: number; text: string }>>();
		for (const r of rows) {
			if (r.kind !== 'intrak') continue;
			const list = groups.get(r.index) ?? [];
			list.push({ subIndex: r.subIndex, text: r.entry.deskripsi ?? '' });
			groups.set(r.index, list);
		}
		const m = new Map<number, number>();
		for (const [idx, list] of groups.entries()) {
			if (list.length <= 1) {
				m.set(idx, 0);
				continue;
			}
			let best = 0;
			let bestScore = -Infinity;
			for (let i = 0; i < list.length; i++) {
				const sc = paragraphScore(list[i].text);
				if (sc > bestScore) {
					bestScore = sc;
					best = i;
				}
			}
			m.set(idx, best);
		}
		return m;
	});

	function formatTujuanForFull(s: string): string {
		if (!s) return s;
		const trimmed = s.trim();
		if (!trimmed) return trimmed;
		// capitalize first alphabetical character
		let i = 0;
		while (i < trimmed.length && !/[A-Za-zÀ-ÖØ-öø-ÿ]/u.test(trimmed[i])) i++;
		if (i >= trimmed.length) return trimmed + '.';
		const before = trimmed.slice(0, i);
		const first = trimmed[i].toUpperCase();
		const rest = trimmed.slice(i + 1);
		const withCap = before + first + rest;
		// ensure ends with a single period
		return withCap.replace(/[.!?]+$/u, '').trim() + '.';
	}
</script>

<section class={resolvedSectionClass} bind:this={sectionRef} use:applySplit>
	<table class="w-full border-collapse" data-intrak-table="true">
		{#if shouldRenderHeader}
			<thead>
				<tr>
					<th class="border px-3 py-2 text-left">No.</th>
					<th class="border px-3 py-2 text-left">Muatan Pelajaran</th>
					<th class="border px-3 py-2 text-center">Nilai Akhir</th>
					<th class="border px-3 py-2 text-left">Capaian Kompetensi</th>
				</tr>
			</thead>
		{/if}
		<tbody>
			{#each rows as row, ridx (row.kind === 'intrak' ? `intrak-${row.index}-${row.order}` : row.kind === 'intrak-group-header' ? `header-${row.groupLetter}-${row.order}` : row.kind === 'tail' ? `tail-${row.tailKey}-${row.order}` : `empty-${row.order}`)}
				{#if row.kind === 'intrak-group-header'}
					<tr use:applyRow={row.order} class="intrak-group-header">
						<td class="border px-3 py-2 align-top">{row.groupLetter}</td>
						<td class="border px-3 py-2 align-top" colspan="3">
							<span class="font-semibold">{row.groupLabel}</span>
						</td>
					</tr>
				{:else if row.kind === 'intrak'}
					{#if row.subIndex === undefined || row.subCount === undefined}
						<!-- single-row intrak entry -->
						<tr
							use:applyRow={row.order}
							class={rows[ridx + 1]?.index !== row.index ? 'intrak-groupend' : ''}
						>
							<td class="border px-3 py-2 align-top">{row.nomorInGroup}</td>
							<td class="border px-3 py-2 align-top">
								<span class="font-semibold">{row.entry.mataPelajaran}</span>
							</td>
							<td class="border px-3 py-2 text-center align-top font-semibold">
								{formatValue(row.entry.nilaiAkhir)}
							</td>
							<td
								class={'border px-3 align-top ' +
									(rapor?.tpMode === 'compact'
										? 'py-2'
										: rapor?.tpMode === 'full-desc'
											? predikatClassFromParagraph(
													row.entry.deskripsi,
													row.subIndex === undefined ||
														topSubIndexByEntry.get(row.index) === row.subIndex
												)
											: predikatClassFromParagraph(
													row.entry.deskripsi,
													row.subIndex === undefined ||
														topSubIndexByEntry.get(row.index) === row.subIndex
												) +
												(rapor?.tpMode === 'full' && ridx === 0 && (rows[0]?.order ?? 0) !== 0
													? ' pt-2'
													: ''))}
							>
								<div class="flex flex-col gap-2">
									{#each descriptionBlocks(row.entry.deskripsi) as block, bidx (bidx)}
										{#if block.kind === 'text'}
											<span class="whitespace-pre-line">{block.text}</span>
										{:else}
											<ul class="list-disc pl-4">
												{#each block.items as it (it)}
													<li class="leading-tight">
														{rapor?.tpMode === 'full' ? formatTujuanForFull(it) : it}
													</li>
												{/each}
											</ul>
										{/if}
									{/each}
								</div>
							</td>
						</tr>
					{:else}
						<!-- sub-row for multi-paragraph intrak entry -->
						{#if row.subIndex === 0}
							<tr
								use:applyRow={row.order}
								class={'intrak-multistart' +
									(rows[ridx + 1]?.index !== row.index ? ' intrak-groupend' : '')}
							>
								<td class="border px-3 py-2 align-top">{row.nomorInGroup}</td>
								<td class="border px-3 py-2 align-top">
									<span class="font-semibold">{row.entry.mataPelajaran}</span>
								</td>
								<td class="border px-3 py-2 text-center align-top font-semibold">
									{formatValue(row.entry.nilaiAkhir)}
								</td>
								<td
									class={'border px-3 align-top ' +
										(rapor?.tpMode === 'compact'
											? 'py-2'
											: rapor?.tpMode === 'full-desc'
												? predikatClassFromParagraph(
														row.entry.deskripsi,
														row.subIndex === undefined ||
															topSubIndexByEntry.get(row.index) === row.subIndex
													)
												: predikatClassFromParagraph(
														row.entry.deskripsi,
														row.subIndex === undefined ||
															topSubIndexByEntry.get(row.index) === row.subIndex
													) +
													(rapor?.tpMode === 'full' && ridx === 0 && (rows[0]?.order ?? 0) !== 0
														? ' pt-2'
														: ''))}
								>
									<div class="flex flex-col gap-2">
										{#each descriptionBlocks(row.entry.deskripsi) as block, bidx (bidx)}
											{#if block.kind === 'text'}
												<span class="whitespace-pre-line">{block.text}</span>
											{:else}
												<ul class="list-disc pl-4">
													{#each block.items as it (it)}
														<li class="leading-tight">
															{rapor?.tpMode === 'full' ? formatTujuanForFull(it) : it}
														</li>
													{/each}
												</ul>
											{/if}
										{/each}
									</div>
								</td>
							</tr>
						{:else}
							<!-- determine if this is the last subrow for the entry -->
							<tr
								use:applyRow={row.order}
								class={'intrak-subrow' +
									(row.subIndex === row.subCount - 1 || rows[ridx + 1]?.index !== row.index
										? ' intrak-multilast intrak-groupend'
										: '')}
							>
								<td class="border px-3 align-top">&nbsp;</td>
								<td class="border px-3 align-top">&nbsp;</td>
								<td class="border px-3 text-center align-top font-semibold">&nbsp;</td>
								<td
									class={'border px-3 align-top ' +
										(rapor?.tpMode === 'compact'
											? 'py-2'
											: rapor?.tpMode === 'full-desc'
												? predikatClassFromParagraph(
														row.entry.deskripsi,
														row.subIndex === undefined ||
															topSubIndexByEntry.get(row.index) === row.subIndex
													)
												: predikatClassFromParagraph(
														row.entry.deskripsi,
														row.subIndex === undefined ||
															topSubIndexByEntry.get(row.index) === row.subIndex
													) +
													(rapor?.tpMode === 'full' && ridx === 0 && (rows[0]?.order ?? 0) !== 0
														? ' pt-2'
														: ''))}
								>
									<div class="flex flex-col gap-2">
										{#each descriptionBlocks(row.entry.deskripsi) as block, bidx (bidx)}
											{#if block.kind === 'text'}
												<span class="whitespace-pre-line">{block.text}</span>
											{:else}
												<ul class="list-disc pl-4">
													{#each block.items as it (it)}
														<li class="leading-tight">
															{rapor?.tpMode === 'full' ? formatTujuanForFull(it) : it}
														</li>
													{/each}
												</ul>
											{/if}
										{/each}
									</div>
								</td>
							</tr>
						{/if}
					{/if}
				{:else if row.kind === 'empty'}
					<tr use:applyRow={row.order}>
						<td class="border px-3 py-2 text-center" colspan="4">
							Belum ada data intrakurikuler.
						</td>
					</tr>
				{:else}
					<tr use:applyRow={row.order} data-tail-row="true">
						<td class="border-none p-0 align-top" colspan="4">
							<div class="my-2 flex flex-col gap-4">
								<TailSection
									tailKey={row.tailKey}
									{rapor}
									{formatValue}
									{formatHari}
									{waliKelas}
									{kepalaSekolah}
									{ttd}
								/>
							</div>
						</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>
</section>

<style>
	/* Remove horizontal borders between TP paragraph sub-rows while keeping
		 vertical borders. Use border-*-width to work with collapsed table borders. */
	:global(table[data-intrak-table] tr.intrak-subrow td) {
		border-top-width: 0 !important;
		border-top-style: none !important;
	}

	:global(table[data-intrak-table] tr.intrak-multistart td) {
		border-bottom-width: 0 !important;
		border-bottom-style: none !important;
	}

	/* Also ensure consecutive subrows don't show a separating border between them */
	:global(table[data-intrak-table] tr.intrak-multistart + tr.intrak-subrow td) {
		border-top-width: 0 !important;
		border-top-style: none !important;
	}

	/* Remove bottom border for intermediate subrows (not the last one) */
	:global(table[data-intrak-table] tr.intrak-subrow:not(.intrak-multilast) td) {
		border-bottom-width: 0 !important;
		border-bottom-style: none !important;
	}

	/* Draw horizontal border at the end of a subject group using default border color */
	:global(table[data-intrak-table] tr.intrak-groupend td) {
		border-bottom-width: 1px !important;
		border-bottom-style: solid !important;
		border-bottom-color: currentColor !important;
	}

	@media print {
		:global(table[data-intrak-table] tr.intrak-groupend td) {
			border-bottom-color: #000 !important;
		}
	}
</style>
