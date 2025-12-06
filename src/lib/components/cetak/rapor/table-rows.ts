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
	nomorInGroup: number;
	entry: IntrakurikulerEntry;
};

export type IntrakSubTableRow = {
	kind: 'intrak';
	order: number;
	index: number;
	nomor: number;
	nomorInGroup: number;
	entry: IntrakurikulerEntry;
	subIndex?: number;
	subCount?: number;
};

export type EmptyTableRow = {
	kind: 'empty';
	order: number;
};

export type IntrakGroupHeaderRow = {
	kind: 'intrak-group-header';
	order: number;
	groupLetter: string;
	groupLabel: string;
};

export type TailTableRow = {
	kind: 'tail';
	order: number;
	tailKey: TailBlockKey;
};

export type TableRow =
	| IntrakTableRow
	| IntrakSubTableRow
	| EmptyTableRow
	| IntrakGroupHeaderRow
	| TailTableRow;

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
		const jenisOrder = ['wajib', 'pilihan', 'kejuruan', 'mulok'];
		const jenisToLabel: Record<string, string> = {
			wajib: 'Mata Pelajaran Wajib',
			pilihan: 'Mata Pelajaran Pilihan',
			kejuruan: 'Kejuruan',
			mulok: 'Muatan Lokal'
		};

		// Collect unique jenis in order
		const uniqueJenisInOrder: string[] = [];
		for (const row of intrakRows) {
			const jenis = row.entry.jenis || 'wajib';
			if (!uniqueJenisInOrder.includes(jenis)) {
				uniqueJenisInOrder.push(jenis);
			}
		}
		// Sort by the defined order
		uniqueJenisInOrder.sort((a, b) => jenisOrder.indexOf(a) - jenisOrder.indexOf(b));

		// Create dynamic letter mapping based on actual jenis present
		const jenisToLetter: Record<string, string> = {};
		const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
		for (let i = 0; i < uniqueJenisInOrder.length; i++) {
			jenisToLetter[uniqueJenisInOrder[i]] = letters[i];
		}

		let lastJenis: string | null = null;
		let groupItemCounter = 0;

		for (const row of intrakRows) {
			const currentJenis = row.entry.jenis || 'wajib';

			// Add group header if jenis changed
			if (lastJenis !== currentJenis && jenisToLetter[currentJenis]) {
				result.push({
					kind: 'intrak-group-header',
					order: order++,
					groupLetter: jenisToLetter[currentJenis],
					groupLabel: jenisToLabel[currentJenis]
				});
				lastJenis = currentJenis;
				groupItemCounter = 0; // Reset counter for new group
			}

			groupItemCounter++;
			const nomorInGroup = groupItemCounter;

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
					nomorInGroup: nomorInGroup,
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
					nomorInGroup: nomorInGroup,
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
