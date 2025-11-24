// Utility to generate and download an Excel template for sumatif assessments.
// Uses a runtime dynamic import of 'xlsx' with a Vite ignore comment so Vite
// does not try to pre-bundle or resolve the module at build time.

export type MuridRow = { nama: string };

export async function downloadTemplateXLSX(options: {
	mapelName?: string;
	daftarMurid: MuridRow[];
	lingkupCount?: number;
	tpPerLingkup?: number;
	lingkupGroups?: { name: string; tpCount: number }[];
	kelasName?: string;
	mapelId?: number | null;
	kelasId?: number | null;
}) {
	const {
		mapelName = 'Nama Mata Pelajaran',
		daftarMurid,
		lingkupCount = 3,
		tpPerLingkup = 3,
		lingkupGroups,
		kelasName = 'Nama Kelas'
	} = options;

	// Use the project's existing `exceljs` dependency to generate the file.
	const ExcelJS = (await import('exceljs')).default ?? (await import('exceljs'));

	// Determine groups and per-group TP counts. We will append two fixed
	// Sumatif groups at the end: Tengah Semester (Tes, Non Tes) and
	// Akhir Semester (Tes, Non Tes).
	type GroupDef = { name: string; tpCount: number; tpLabels?: string[] };
	let groups: GroupDef[] = [];
	if (Array.isArray(lingkupGroups) && lingkupGroups.length > 0) {
		// Use generic labels for lingkup but keep the TP counts from DB
		groups = lingkupGroups.map((g, i) => ({
			name: `Lingkup Materi ${i + 1}`,
			tpCount: Math.max(1, Number(g.tpCount) || 1)
		}));
	} else {
		for (let i = 0; i < lingkupCount; i++) {
			groups.push({ name: `Lingkup Materi ${i + 1}`, tpCount: tpPerLingkup });
		}
	}

	// Append sumatif groups with fixed labels
	groups.push({ name: 'Sumatif Tengah Semester', tpCount: 2, tpLabels: ['Tes', 'Non Tes'] });
	groups.push({ name: 'Sumatif Akhir Semester', tpCount: 2, tpLabels: ['Tes', 'Non Tes'] });

	const totalCols = 1 + groups.reduce((s, g) => s + (g.tpCount ?? 0), 0);

	const ws_data: Array<Array<string | null>> = [];

	// Row 0: merged subject title across all columns
	const firstRow: Array<string | null> = Array(totalCols).fill(null);
	firstRow[0] = mapelName;
	ws_data.push(firstRow);

	// Row 1: class name (merged across)
	const classRow: Array<string | null> = Array(totalCols).fill(null);
	classRow[0] = kelasName;
	ws_data.push(classRow);

	// Row 2: Nama Murid + Lingkup Materi headings
	const secondRow: Array<string | null> = Array(totalCols).fill(null);
	secondRow[0] = 'Nama Murid';
	// place each group's name at its starting column
	let colCursor = 1; // 0 is Nama Murid
	for (let i = 0; i < groups.length; i++) {
		secondRow[1 + colCursor - 1 + 0] = groups[i].name;
		colCursor += groups[i].tpCount;
	}
	ws_data.push(secondRow);

	// Row 3: TP headers (short codes TP1, TP2...)
	const thirdRow: Array<string | null> = Array(totalCols).fill(null);
	// TP headers per group. Use group-specific labels when provided.
	colCursor = 0; // counts TP columns placed so far
	for (let i = 0; i < groups.length; i++) {
		const tpCount = groups[i].tpCount;
		const labels = Array.isArray(groups[i].tpLabels) ? groups[i].tpLabels! : [];
		for (let t = 0; t < tpCount; t++) {
			if (labels[t]) {
				thirdRow[1 + colCursor + t] = labels[t];
			} else {
				thirdRow[1 + colCursor + t] = `TP${t + 1}`;
			}
		}
		colCursor += tpCount;
	}
	ws_data.push(thirdRow);

	// Student rows
	for (const murid of daftarMurid) {
		const row: Array<string | null> = Array(totalCols).fill(null);
		row[0] = murid.nama;
		for (let c = 1; c < totalCols; c++) row[c] = '';
		ws_data.push(row);
	}

	type WorkbookLike = {
		addWorksheet(name: string): {
			getRow(n: number): { values: unknown };
			mergeCells(range: string): void;
			columns?: unknown;
		};
		xlsx: { writeBuffer(): Promise<ArrayBuffer> };
	};
	const ExcelJSImport = ExcelJS as unknown as { Workbook: { new (): WorkbookLike } };
	const workbook = new ExcelJSImport.Workbook();
	const sheet = workbook.addWorksheet('Template');

	// Build rows into the worksheet
	// Using 1-based Excel indexing for rows/columns
	// Row 1: subject title (we'll set value in A1 and merge across)
	sheet.getRow(1).values = ws_data[0];

	// Row 2 and 3: class name and headings
	sheet.getRow(2).values = ws_data[1];
	sheet.getRow(3).values = ws_data[2];
	sheet.getRow(4).values = ws_data[3];

	// Student rows start at row 5
	for (let i = 0; i < daftarMurid.length; i++) {
		const rowValues = ws_data[4 + i];
		sheet.getRow(5 + i).values = rowValues;
	}

	// Apply merges: subject row across all columns
	const lastColLetter = (colNum: number) => {
		let n = colNum;
		let s = '';
		while (n > 0) {
			const m = (n - 1) % 26;
			s = String.fromCharCode(65 + m) + s;
			n = Math.floor((n - 1) / 26);
		}
		return s;
	};

	const lastCol = totalCols;
	sheet.mergeCells(`A1:${lastColLetter(lastCol)}1`);
	// Merge the class name row across the same columns as the title
	sheet.mergeCells(`A2:${lastColLetter(lastCol)}2`);
	sheet.mergeCells('A3:A4');
	// merge per-group header ranges
	let cursor = 2; // Excel column index for first TP column (B=2)
	for (let i = 0; i < groups.length; i++) {
		const tpCount = groups[i].tpCount;
		const startC = cursor;
		const endC = cursor + tpCount - 1;
		// group header row is now row 3
		const startCellRow = `${lastColLetter(startC)}3`;
		const endCellRow = `${lastColLetter(endC)}3`;
		sheet.mergeCells(`${startCellRow}:${endCellRow}`);
		cursor = endC + 1;
	}

	// Style subject title: larger font, bold, and centered vertically/horizontally
	const sheetStyled = sheet as unknown as {
		getRow(n: number): {
			getCell(c: number): { font?: unknown; alignment?: unknown };
			height?: number;
		};
	};
	const titleCell = sheetStyled.getRow(1).getCell(1);
	titleCell.font = { name: 'Calibri', size: 16, bold: true };
	titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
	sheetStyled.getRow(1).height = 26;

	// Style class name row (row 2): bold, centered, slightly smaller
	const classCell = sheetStyled.getRow(2).getCell(1);
	classCell.font = { name: 'Calibri', size: 12, bold: true };
	classCell.alignment = { horizontal: 'center', vertical: 'middle' };
	sheetStyled.getRow(2).height = 20;

	// Column widths
	const cols = [{ width: 30 }];
	for (let c = 1; c < totalCols; c++) cols.push({ width: 12 });
	sheet.columns = cols as unknown;

	// Apply thin borders around the block from the "Nama Murid" header row
	// through the last student row. In this sheet: row 1 = subject, row 2 =
	// class name, row 3 = nama murid + lingkup headers, row 4 = TP headers,
	// student rows start at 5. We start at row 3 to include the "Nama Murid"
	// header row as requested.
	const firstDataRow = 3; // Nama Murid row
	const lastDataRow = 4 + daftarMurid.length; // last student row
	if (lastDataRow >= firstDataRow) {
		const borderDef = {
			top: { style: 'thin' },
			left: { style: 'thin' },
			bottom: { style: 'thin' },
			right: { style: 'thin' }
		};

		const sheetAny = sheet as unknown as {
			getRow(n: number): { getCell(c: number): { border: unknown } };
		};

		for (let r = firstDataRow; r <= lastDataRow; r++) {
			const rowObj = sheetAny.getRow(r);
			for (let c = 1; c <= totalCols; c++) {
				const cell = rowObj.getCell(c);
				cell.border = borderDef;
			}
		}
	}
	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	});
	// Build a filename using only the subject and class names. Sanitize to
	// avoid invalid filename characters. Do NOT append numeric IDs to the names.
	const sanitize = (s: string) =>
		String(s)
			.replace(/[\\/:*?"<>|]/g, '-')
			.trim();
	const filename = `Nilai ${sanitize(mapelName)} - ${sanitize(kelasName)}.xlsx`;
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}
