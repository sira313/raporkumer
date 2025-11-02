import ExcelJS from 'exceljs';

/**
 * Read an XLSX buffer and return array-of-arrays (rows) similar to xlsx.utils.sheet_to_json(..., {header:1})
 * - empty cells become empty string
 * - blank rows are removed (mimic blankrows: false)
 * Returns only strings and numbers (dates are converted to ISO strings).
 */
async function readBufferToAoA(buffer) {
	const wb = new ExcelJS.Workbook();
	// Accept Buffer or ArrayBuffer-like
	const nodeBuf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
	await wb.xlsx.load(nodeBuf);
	const ws = wb.worksheets[0];
	if (!ws) return [];

	const rows = [];
	ws.eachRow({ includeEmpty: true }, (row) => {
		const valuesHolder = row.values || [];
		const rowValuesLen = Math.max(0, valuesHolder.length - 1);
		const lastCol = Math.max(ws.columnCount || 0, row.cellCount || 0, rowValuesLen || 0);
		const vals = [];
		for (let c = 1; c <= lastCol; c += 1) {
			const cell = row.getCell(c);
			let val = cell.value;
			if (val == null) {
				val = '';
			} else if (
				typeof val === 'object' &&
				val !== null &&
				Object.prototype.hasOwnProperty.call(val, 'result') &&
				Object.prototype.hasOwnProperty.call(val, 'formula')
			) {
				val = val.result ?? '';
			} else if (typeof val === 'object' && cell.text != null) {
				val = cell.text ?? '';
			}

			if (val instanceof Date) vals.push(val.toISOString());
			else if (typeof val === 'number') vals.push(val);
			else vals.push(String(val));
		}
		rows.push(vals);
	});

	// filter out blank rows (all cells empty string)
	const filtered = rows.filter((r) => Array.isArray(r) && r.some((v) => v !== ''));
	return filtered.length ? filtered : [];
}

async function writeAoaToBuffer(rows) {
	const wb = new ExcelJS.Workbook();
	const ws = wb.addWorksheet('Sheet1');
	ws.addRows(rows);
	const buf = await wb.xlsx.writeBuffer();
	return Buffer.from(buf);
}

export { readBufferToAoA, writeAoaToBuffer };
