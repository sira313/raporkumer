import type { TailBlockKey } from './tail-blocks';

export type IntrakurikulerEntry = NonNullable<RaporPrintData['nilaiIntrakurikuler']>[number];

export type IntrakRow = {
	index: number;
	nomor: number;
	entry: IntrakurikulerEntry;
};

export type IntrakTableRow = {
	kind: 'intrak';
	order: number;
	index: number;
	nomor: number;
	entry: IntrakurikulerEntry;
};

export type IntrakSubTableRow = {
	kind: 'intrak';
	order: number;
	index: number;
	nomor: number;
	entry: IntrakurikulerEntry;
	subIndex?: number;
	subCount?: number;
};

export type EmptyTableRow = {
	kind: 'empty';
	order: number;
};

export type TailTableRow = {
	kind: 'tail';
	order: number;
	tailKey: TailBlockKey;
};

export type TableRow = IntrakTableRow | IntrakSubTableRow | EmptyTableRow | TailTableRow;

export function createIntrakRows(entries: IntrakurikulerEntry[]): IntrakRow[] {
	return entries.map((entry, index) => ({ index, nomor: index + 1, entry }));
}

export function createTableRows(
	intrakRows: IntrakRow[],
	tailKeys: readonly TailBlockKey[]
): TableRow[] {
	const result: TableRow[] = [];
	let order = 0;

	if (intrakRows.length === 0) {
		result.push({ kind: 'empty', order: order++ });
	} else {
		for (const row of intrakRows) {
			const descr = (row.entry.deskripsi ?? '').trim();
			// split paragraphs by blank-line; keep single row if only one paragraph
			const paragraphs =
				descr.length === 0
					? ['']
					: descr
							.split(/\n\s*\n/)
							.map((p) => p.trim())
							.filter(Boolean);
			if (paragraphs.length <= 1) {
				result.push({
					kind: 'intrak',
					order: order++,
					index: row.index,
					nomor: row.nomor,
					entry: row.entry
				});
				continue;
			}

			// multiple paragraphs -> create a TableRow per paragraph, copying entry but replacing deskripsi
			for (let i = 0; i < paragraphs.length; i++) {
				const entryCopy = { ...row.entry, deskripsi: paragraphs[i] } as IntrakurikulerEntry;
				result.push({
					kind: 'intrak',
					order: order++,
					index: row.index,
					nomor: row.nomor,
					entry: entryCopy,
					subIndex: i,
					subCount: paragraphs.length
				} as IntrakSubTableRow);
			}
		}
	}

	for (const tailKey of tailKeys) {
		result.push({
			kind: 'tail',
			order: order++,
			tailKey
		});
	}

	return result;
}

export function hasIntrakRows(rows: readonly TableRow[]): boolean {
	return rows.some((row) => row.kind === 'intrak');
}
