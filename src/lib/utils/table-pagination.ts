export interface PaginateRowsByHeightOptions<T> {
	rows: T[];
	rowHeights: number[];
	firstPageCapacity: number;
	continuationPageCapacity: number;
	tolerance?: number;
}

export function paginateRowsByHeight<T>(options: PaginateRowsByHeightOptions<T>): T[][] {
	const {
		rows,
		rowHeights,
		firstPageCapacity,
		continuationPageCapacity,
		tolerance = 0.5
	} = options;

	const totalRows = rows.length;
	if (totalRows === 0) {
		return [];
	}

	const pages: T[][] = [];
	const normalizedFirstCapacity = Math.max(0, firstPageCapacity);
	const normalizedContinuationCapacity = Math.max(0, continuationPageCapacity);
	let cursor = 0;

	function takeRows(capacity: number) {
		const limit = Math.max(0, capacity);
		const pageRows: T[] = [];
		let used = 0;
		while (cursor < totalRows) {
			const rowHeight = rowHeights[cursor] ?? 0;
			if (pageRows.length > 0 && used + rowHeight > limit + tolerance) {
				break;
			}
			if (pageRows.length === 0 && limit <= 0) {
				pageRows.push(rows[cursor]);
				cursor += 1;
				break;
			}
			if (pageRows.length === 0 && rowHeight > limit + tolerance) {
				pageRows.push(rows[cursor]);
				cursor += 1;
				break;
			}
			pageRows.push(rows[cursor]);
			used += rowHeight;
			cursor += 1;
		}
		return pageRows;
	}

	const firstPageRows = takeRows(normalizedFirstCapacity);
	if (firstPageRows.length > 0) {
		pages.push(firstPageRows);
	}

	while (cursor < totalRows) {
		const nextPageRows = takeRows(normalizedContinuationCapacity);
		if (nextPageRows.length === 0) {
			nextPageRows.push(rows[cursor]);
			cursor += 1;
		}
		pages.push(nextPageRows);
	}

	return pages;
}
