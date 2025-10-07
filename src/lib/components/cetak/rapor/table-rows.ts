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

export type EmptyTableRow = {
	kind: 'empty';
	order: number;
};

export type TailTableRow = {
	kind: 'tail';
	order: number;
	tailKey: TailBlockKey;
};

export type TableRow = IntrakTableRow | EmptyTableRow | TailTableRow;

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
			result.push({
				kind: 'intrak',
				order: order++,
				index: row.index,
				nomor: row.nomor,
				entry: row.entry
			});
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
