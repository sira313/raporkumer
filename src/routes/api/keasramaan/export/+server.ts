import db from '$lib/server/db';
import {
	tableKeasramaan,
	tableKeasramaanIndikator,
	tableKeasramaanTujuan,
	tableKelas
} from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { cookieNames } from '$lib/utils';

function isTableMissingError(error: unknown) {
	if (error instanceof Error) {
		return error.message.includes('no such table');
	}
	return false;
}

export async function POST({ cookies, locals }) {
	try {
		const kelasIdCookie = cookies.get(cookieNames.ACTIVE_KELAS_ID) || null;
		const kelasId = kelasIdCookie ? Number(kelasIdCookie) : null;
		if (!kelasId || !Number.isFinite(kelasId)) {
			return new Response(JSON.stringify({ fail: 'Pilih kelas aktif terlebih dahulu.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		const sekolahId = locals.sekolah?.id;
		if (!sekolahId) {
			return new Response(JSON.stringify({ fail: 'Pilih sekolah aktif terlebih dahulu.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Fetch kelas data
		const kelasData = await db.query.tableKelas.findFirst({
			where: eq(tableKelas.id, kelasId)
		});

		const kelasNama = kelasData?.nama || 'Tidak diketahui';

		// Fetch keasramaan data with indikator and tujuan
		const keasramaanData = await db.query.tableKeasramaan.findMany({
			where: eq(tableKeasramaan.kelasId, kelasId),
			orderBy: asc(tableKeasramaan.createdAt),
			with: {
				indikator: {
					orderBy: asc(tableKeasramaanIndikator.createdAt),
					with: {
						tujuan: {
							orderBy: asc(tableKeasramaanTujuan.createdAt)
						}
					}
				}
			}
		});

		if (!keasramaanData || keasramaanData.length === 0) {
			return new Response(JSON.stringify({ fail: 'Tidak ada data keasramaan untuk dieksport.' }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' }
			});
		}

		// Create workbook dan worksheet
		const workbook = new ExcelJS.Workbook();
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const worksheet = workbook.addWorksheet('Mata Evaluasi Keasramaan') as any;

		// Add title row (row 1)
		const titleCell = worksheet.getCell('B1');
		titleCell.value = 'MATA EVALUASI KEASRAMAAN';
		titleCell.font = { bold: true, size: 14 };
		titleCell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
		worksheet.mergeCells('B1:C1');
		worksheet.getRow(1).height = 25;

		// Add class name row (row 2)
		const classNameCell = worksheet.getCell('B2');
		classNameCell.value = kelasNama;
		classNameCell.font = { bold: true, size: 12 };
		classNameCell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
		worksheet.mergeCells('B2:C2');
		worksheet.getRow(2).height = 20;

		// Add empty row (row 3) for spacing
		worksheet.getRow(3).height = 10;

		// Set column widths
		worksheet.columns = [
			{ key: 'matev', width: 25 },
			{ key: 'indikator', width: 40 },
			{ key: 'tujuan', width: 50 }
		];

		// Add header row manually at row 4
		const headerRow = worksheet.getRow(4);
		headerRow.values = ['Matev', 'Indikator', 'Tujuan Pembelajaran'];
		headerRow.font = { bold: true };
		headerRow.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
		headerRow.height = 25;

		// Define border style for all cells
		const thinBorder = {
			top: { style: 'thin' as const, color: { argb: 'FF000000' } },
			left: { style: 'thin' as const, color: { argb: 'FF000000' } },
			bottom: { style: 'thin' as const, color: { argb: 'FF000000' } },
			right: { style: 'thin' as const, color: { argb: 'FF000000' } }
		};

		// Add border to header row
		for (let colNum = 1; colNum <= 3; colNum++) {
			const cell = headerRow.getCell(colNum);
			cell.border = thinBorder;
		}

		// Build export data: flatten matev -> indikator -> tujuan (vertikal format)
		const rows: Array<{ matev?: string; indikator?: string; tujuan: string }> = [];
		const merges: Array<{ col: number; startRow: number; endRow: number }> = [];
		let currentRowNum = 5; // Start from row 5 (after header, now at row 4)

		for (const matev of keasramaanData) {
			const indikators = matev.indikator ?? [];
			const matevStartRow = currentRowNum;

			if (indikators.length === 0) {
				// If no indikator, add matev with empty indikator and tujuan
				rows.push({
					matev: matev.nama,
					indikator: '',
					tujuan: ''
				});
				currentRowNum += 1;
			} else {
				for (let indIdx = 0; indIdx < indikators.length; indIdx++) {
					const indikator = indikators[indIdx];
					const tujuans = indikator.tujuan ?? [];
					const indikatorStartRow = currentRowNum;

					if (tujuans.length === 0) {
						// Indikator without tujuan
						rows.push({
							matev: indIdx === 0 ? matev.nama : '',
							indikator: indikator.deskripsi,
							tujuan: ''
						});
						currentRowNum += 1;
					} else {
						for (let tujIdx = 0; tujIdx < tujuans.length; tujIdx++) {
							const tujuan = tujuans[tujIdx];
							rows.push({
								matev: indIdx === 0 && tujIdx === 0 ? matev.nama : '',
								indikator: tujIdx === 0 ? indikator.deskripsi : '',
								tujuan: tujuan.deskripsi
							});
							currentRowNum += 1;
						}
					}

					// Record merge for indikator if it has multiple tujuan
					if (tujuans.length > 1) {
						merges.push({
							col: 2, // Column B (Indikator)
							startRow: indikatorStartRow,
							endRow: currentRowNum - 1
						});
					}
				}
			}

			// Record merge for matev if it has multiple indikator
			const totalTujuanForMatev = indikators.reduce(
				(sum, ind) => sum + (ind.tujuan?.length ?? 1),
				0
			);
			if (totalTujuanForMatev > 1) {
				merges.push({
					col: 1, // Column A (Matev)
					startRow: matevStartRow,
					endRow: currentRowNum - 1
				});
			}
		}

		// Add rows to worksheet
		worksheet.addRows(rows);

		// Apply merges
		for (const merge of merges) {
			const colLetter = String.fromCharCode(64 + merge.col); // Convert col number to letter (1 = A, 2 = B, etc)
			const mergeRange = `${colLetter}${merge.startRow}:${colLetter}${merge.endRow}`;
			worksheet.mergeCells(mergeRange);
		}

		// Style data rows with borders and alignment
		for (let rowNum = 5; rowNum <= rows.length + 4; rowNum++) {
			const row = worksheet.getRow(rowNum);
			row.height = 20;

			// Add border to all cells in data rows
			for (let colNum = 1; colNum <= 3; colNum++) {
				const cell = row.getCell(colNum);
				cell.border = thinBorder;

				// Set alignment: merged cells (col A & B) should be top-left, col C is top
				if (colNum === 1 || colNum === 2) {
					cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
				} else {
					cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
				}
			}
		}
		// Generate buffer
		const buffer = await workbook.xlsx.writeBuffer();

		// Create filename with class name
		const filename = `Mata Evaluasi Keasramaan - ${kelasNama}.xlsx`;

		// Return file
		return new Response(Buffer.from(buffer as ArrayBuffer), {
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (error) {
		if (isTableMissingError(error)) {
			return new Response(
				JSON.stringify({
					fail: 'Database keasramaan belum siap. Jalankan pnpm db:push untuk menerapkan migrasi terbaru.'
				}),
				{ status: 500, headers: { 'Content-Type': 'application/json' } }
			);
		}
		console.error('Export keasramaan error:', error);
		return new Response(JSON.stringify({ fail: 'Terjadi kesalahan saat mengekspor data.' }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' }
		});
	}
}
