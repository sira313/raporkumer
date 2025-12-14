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

	const hasKokurikuler = $derived.by(() => Boolean(rapor?.hasKokurikuler));

	// Spacing untuk ekstrakurikuler header: h-2 jika ada kokurikuler, h-4 jika tidak ada
	const ekstraSpacerClass = $derived.by(() => (hasKokurikuler ? 'h-2' : 'h-4'));

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

	function predikatClassFromParagraph(text: string | null | undefined): string {
		// Fall back to heuristics based on wording.
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

	// topSubIndexByEntry removed — computed but unused
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
			{#each rows as row, ridx (`${ridx}-${row.kind === 'intrak' ? `intrak-${row.index}-${row.order}` : row.kind === 'intrak-group-header' ? `header-${row.groupLetter}-${row.order}` : row.kind === 'ekstrakurikuler-header' ? `ekskul-header-${row.order}` : row.kind === 'ekstrakurikuler' ? `ekskul-${row.index}-${row.order}` : row.kind === 'ekstrakurikuler-empty' ? `ekskul-empty-${row.order}` : row.kind === 'tail' ? `tail-${row.tailKey}-${row.order}` : row.kind === 'tanggapan' ? `tanggapan-${row.order}` : `empty-${row.order}`}`)}
				{#if row.kind === 'ekstrakurikuler-header'}
					<tr
						use:applyRow={row.order}
						data-row-order={row.order}
						class="ekstrakurikuler-header-spacer"
					>
						<td class="border-none p-0" colspan="4">
							<div class={ekstraSpacerClass}></div>
						</td>
					</tr>
					<tr class="ekstrakurikuler-header" data-row-order="{row.order}-header">
						<th class="border px-3 py-2 text-left" style="width: 40px;">No.</th>
						<th class="border px-3 py-2 text-left">Ekstrakurikuler</th>
						<th class="border px-3 py-2 text-left" colspan="2">Keterangan</th>
					</tr>
				{:else if row.kind === 'ekstrakurikuler'}
					<tr use:applyRow={row.order} data-row-order={row.order} class="ekstrakurikuler-row">
						<td class="border px-3 py-2 align-top">{row.nomor}</td>
						<td class="border px-3 py-2 align-top">
							{formatValue(row.entry.nama)}
						</td>
						<td class="border px-3 py-2 align-top" colspan="2">
							<div class="flex flex-col gap-2">
								{#each descriptionBlocks(row.entry.deskripsi) as block, bidx (bidx)}
									{#if block.kind === 'text'}
										<span class="whitespace-pre-line">{block.text}</span>
									{:else}
										<ul class="list-disc pl-4">
											{#each block.items as it (it)}
												<li class="leading-tight">
													{it}
												</li>
											{/each}
										</ul>
									{/if}
								{/each}
							</div>
						</td>
					</tr>
				{:else if row.kind === 'ekstrakurikuler-empty'}
					<tr use:applyRow={row.order} data-row-order={row.order} class="ekstrakurikuler-empty">
						<td class="border px-3 py-2 text-center" colspan="4"> Tidak ada ekstrakurikuler </td>
					</tr>
				{:else if row.kind === 'intrak-group-header'}
					<tr use:applyRow={row.order} data-row-order={row.order} class="intrak-group-header">
						<td class="border px-3 py-2 align-top" colspan="4">
							<span class="font-semibold">{row.groupLetter}. {row.groupLabel}</span>
						</td>
					</tr>
				{:else if row.kind === 'intrak'}
					{#if row.subIndex === undefined || row.subCount === undefined}
						<!-- single-row intrak entry -->
						<tr
							use:applyRow={row.order}
							data-row-order={row.order}
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
										: predikatClassFromParagraph(row.entry.deskripsi))}
							>
								<div class="flex flex-col gap-2">
									{#each descriptionBlocks(row.entry.deskripsi) as block, bidx (bidx)}
										{#if block.kind === 'text'}
											<span class="whitespace-pre-line">{block.text}</span>
										{:else}
											<ul class="list-disc pl-4">
												{#each block.items as it (it)}
													<li class="leading-tight">
														{it}
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
								data-row-order={row.order}
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
											: predikatClassFromParagraph(row.entry.deskripsi))}
								>
									<div class="flex flex-col gap-2">
										{#each descriptionBlocks(row.entry.deskripsi) as block, bidx (bidx)}
											{#if block.kind === 'text'}
												<span class="whitespace-pre-line">{block.text}</span>
											{:else}
												<ul class="list-disc pl-4">
													{#each block.items as it (it)}
														<li class="leading-tight">
															{it}
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
								data-row-order={row.order}
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
											: predikatClassFromParagraph(row.entry.deskripsi))}
								>
									<div class="flex flex-col gap-2">
										{#each descriptionBlocks(row.entry.deskripsi) as block, bidx (bidx)}
											{#if block.kind === 'text'}
												<span class="whitespace-pre-line">{block.text}</span>
											{:else}
												<ul class="list-disc pl-4">
													{#each block.items as it (it)}
														<li class="leading-tight">
															{it}
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
					<tr use:applyRow={row.order} data-row-order={row.order}>
						<td class="border px-3 py-2 text-center" colspan="4">
							Belum ada data intrakurikuler.
						</td>
					</tr>
				{:else if row.kind === 'tanggapan'}
					<tr use:applyRow={row.order} data-row-order={row.order} data-tanggapan-row="true">
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
				{:else}
					<tr use:applyRow={row.order} data-row-order={row.order} data-tail-row="true">
						<td class="border-none p-0 align-top" colspan="4">
							<div
								class={row.tailKey === 'ketidakhadiran'
									? 'mt-4 mb-2 flex flex-col gap-4'
									: 'my-2 flex flex-col gap-4'}
							>
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

	/* Prevent tail rows (which contain kokurikuler/ekskul/ketidakhadiran/tanggapan)
	   from being split across pages when printing. The TailSection is rendered
	   inside a single <tr> with data-tail-row=\"true\". Use page-break-inside
	   and break-inside rules to instruct browsers not to split these rows. */
	:global(tr[data-tail-row]) {
		page-break-inside: avoid;
		break-inside: avoid;
		-webkit-column-break-inside: avoid;
	}
</style>
