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

export type EkstrakurikulerHeaderRow = {
	kind: 'ekstrakurikuler-header';
	order: number;
};

export type EkstrakurikulerRow = {
	kind: 'ekstrakurikuler';
	order: number;
	index: number;
	nomor: number;
	entry: {
		nama: string;
		deskripsi: string;
	};
};

export type EkstrakurikulerEmptyRow = {
	kind: 'ekstrakurikuler-empty';
	order: number;
};

export type TableRow =
	| IntrakTableRow
	| IntrakSubTableRow
	| EmptyTableRow
	| IntrakGroupHeaderRow
	| TailTableRow
	| EkstrakurikulerHeaderRow
	| EkstrakurikulerRow
	| EkstrakurikulerEmptyRow;

export function createIntrakRows(entries: IntrakurikulerEntry[]): IntrakRow[] {
	return entries.map((entry, index) => ({ index, nomor: index + 1, entry }));
}

export function createTableRows(
	intrakRows: IntrakRow[],
	tailKeys: readonly TailBlockKey[],
	jenjangVariant?: string | null,
	ekstrakurikuler?: Array<{ nama: string; deskripsi: string }> | null
): TableRow[] {
	const result: TableRow[] = [];
	let order = 0;

	if (intrakRows.length === 0) {
		result.push({ kind: 'empty', order: order++ });
	} else {
		const jenisOrder = ['wajib', 'pilihan', 'kejuruan', 'mulok'];
		const jenisToLabel: Record<string, string> = {
			wajib:
				jenjangVariant?.toUpperCase() === 'SMK' ? 'Mata Pelajaran Umum' : 'Mata Pelajaran Wajib',
			pilihan: 'Mata Pelajaran Pilihan',
			kejuruan: 'Mata Pelajaran Kejuruan',
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

		// Re-order intrakRows based on sorted jenis order
		const sortedIntrakRows = [...intrakRows].sort((rowA, rowB) => {
			const jenisA = rowA.entry.jenis || 'wajib';
			const jenisB = rowB.entry.jenis || 'wajib';
			return jenisOrder.indexOf(jenisA) - jenisOrder.indexOf(jenisB);
		});

		let lastJenis: string | null = null;
		let groupItemCounter = 0;

		for (const row of sortedIntrakRows) {
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

	// Add all tail blocks in order, inserting ekstrakurikuler rows at the right position
	for (const tailKey of tailKeys) {
		if (tailKey === 'footer') continue; // Footer rendered separately

		if (tailKey === 'ekstrakurikuler') {
			// Insert ekstrakurikuler as individual rows here for efficient pagination
			// Filter ekstrakurikuler yang memiliki nilai (bukan kosong atau "-")
			const ekskulWithValues = (ekstrakurikuler || []).filter((ekskul) => {
				const deskripsi = (ekskul.deskripsi || '').trim();
				return deskripsi !== '' && deskripsi !== '-';
			});

			// Add ekstrakurikuler header
			result.push({
				kind: 'ekstrakurikuler-header',
				order: order++
			});

			if (ekskulWithValues.length > 0) {
				// Add each ekstrakurikuler as a separate row
				for (let i = 0; i < ekskulWithValues.length; i++) {
					const ekskul = ekskulWithValues[i];
					result.push({
						kind: 'ekstrakurikuler',
						order: order++,
						index: i,
						nomor: i + 1,
						entry: {
							nama: ekskul.nama || '',
							deskripsi: ekskul.deskripsi || ''
						}
					});
				}
			} else {
				// Add empty state for ekstrakurikuler
				result.push({
					kind: 'ekstrakurikuler-empty',
					order: order++
				});
			}
		} else {
			// Regular tail block (kokurikuler, ketidakhadiran, tanggapan)
			result.push({
				kind: 'tail',
				order: order++,
				tailKey
			});
		}
	}

	return result;
}

export function hasIntrakRows(rows: readonly TableRow[]): boolean {
	return rows.some((row) => row.kind === 'intrak');
}
