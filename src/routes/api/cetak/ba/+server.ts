import { json } from '@sveltejs/kit';
import ExcelJS from 'exceljs';
import { eq, asc } from 'drizzle-orm';
import db from '$lib/server/db';
import { tableMurid, tableKelas, tableSemester, tablePegawai } from '$lib/server/db/schema';

const { Workbook } = ExcelJS;

function formatTanggal(dateStr: string | null | undefined): string {
	if (!dateStr) return '';
	try {
		const date = new Date(dateStr);
		return new Intl.DateTimeFormat('id-ID', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		}).format(date);
	} catch {
		return '';
	}
}

export async function POST({ request, locals }) {
	const sekolah = locals.sekolah ?? null;
	if (!sekolah) return json({ error: 'Sekolah tidak ditemukan.' }, { status: 401 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Payload tidak valid.' }, { status: 400 });
	}

	const payload = body as Record<string, unknown>;
	const kelasId = Number(payload['kelasId'] ?? NaN);

	if (!Number.isFinite(kelasId)) {
		return json({ error: 'Kelas ID harus angka.' }, { status: 400 });
	}

	try {
		// Fetch kelas data
		const kelas = await db.query.tableKelas.findFirst({
			where: eq(tableKelas.id, kelasId)
		});

		if (!kelas) {
			return json({ error: 'Kelas tidak ditemukan.' }, { status: 404 });
		}

		// Fetch semester data for tanggalBagiRaport
		const semester = await db.query.tableSemester.findFirst({
			where: eq(tableSemester.id, kelas.semesterId)
		});

		// Fetch wali kelas data
		let waliKelas: { nama?: string | null; nip?: string | null } | null = null;
		if (kelas.waliKelasId) {
			const fetched = await db.query.tablePegawai.findFirst({
				columns: {
					nama: true,
					nip: true
				},
				where: eq(tablePegawai.id, kelas.waliKelasId)
			});
			if (fetched) {
				waliKelas = fetched;
			}
		}

		// Fetch murid list
		const daftarMurid = await db.query.tableMurid.findMany({
			columns: {
				id: true,
				nama: true,
				nis: true,
				nisn: true
			},
			where: eq(tableMurid.kelasId, kelasId),
			orderBy: asc(tableMurid.nama)
		});

		// Create workbook
		const workbook = new Workbook();
		const worksheet = workbook.addWorksheet('BA Rapor');

		// Build data rows (header + data)
		const rows: Array<Array<string | number>> = [
			['No', 'NAMA SISWA', 'NIS', 'NISN', 'Kelas', 'Nama Orang Tua', 'TANDA TANGAN']
		];

		daftarMurid.forEach((murid, index) => {
			rows.push([
				index + 1,
				murid.nama.toUpperCase(),
				murid.nis || '',
				murid.nisn || '',
				kelas.nama,
				'', // Kosong sesuai permintaan
				''
			]);
		});

		// Add rows to worksheet
		if (typeof worksheet.addRows === 'function') {
			worksheet.addRows(rows);
		}

		// Set column widths and apply styling
		try {
			const cols = [
				{ width: 5 },
				{ width: 30 },
				{ width: 12 },
				{ width: 15 },
				{ width: 12 },
				{ width: 30 },
				{ width: 20 }
			];

			// Border style
			const borderStyle = {
				top: { style: 'thin', color: { argb: 'FF000000' } },
				left: { style: 'thin', color: { argb: 'FF000000' } },
				bottom: { style: 'thin', color: { argb: 'FF000000' } },
				right: { style: 'thin', color: { argb: 'FF000000' } }
			};

			// Apply column widths and styling
			for (let i = 0; i < cols.length; i++) {
				const col = worksheet.getColumn(i + 1);
				if (col) col.width = cols[i].width;
			}

			// Type assertion to access getRow method
			const wsTyped = worksheet as unknown as {
				getRow(n: number): {
					font?: unknown;
					alignment?: unknown;
					fill?: unknown;
					height?: number;
					getCell(n: number): {
						border?: unknown;
						font?: unknown;
						fill?: unknown;
						alignment?: unknown;
					};
				};
			};

			// Style header row (row 1)
			const headerRow = wsTyped.getRow(1);
			headerRow.font = { bold: true, color: { argb: 'FF000000' } };
			headerRow.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
			headerRow.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFD3D3D3' }
			};
			headerRow.height = 25;

			// Apply borders and styling to all cells
			for (let rowIdx = 1; rowIdx <= rows.length; rowIdx++) {
				const row = wsTyped.getRow(rowIdx);
				row.height = 30;
				row.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };

				for (let colIdx = 1; colIdx <= cols.length; colIdx++) {
					const cell = row.getCell(colIdx);
					cell.border = borderStyle;

					// Alignment for nama murid column (column 2)
					if (colIdx === 2) {
						cell.alignment = { horizontal: 'left', vertical: 'center', wrapText: true };
					} else {
						cell.alignment = { horizontal: 'center', vertical: 'center', wrapText: true };
					}

					// Keep header styling
					if (rowIdx === 1) {
						cell.font = { bold: true, color: { argb: 'FF000000' } };
						cell.fill = {
							type: 'pattern',
							pattern: 'solid',
							fgColor: { argb: 'FFD3D3D3' }
						};
					}
				}
			}
		} catch (err) {
			// ignore width setting errors
			console.warn('Warning: Some styling may not have been applied', err);
		}

		// Add signature section
		try {
			// Collect all signature rows
			const signatureRows: Array<Array<string>> = [];

			// Add empty row for spacing
			signatureRows.push([]);

			// Prepare signature data
			const tempatTandaTangan =
				sekolah.lokasiTandaTangan?.trim() || sekolah.alamat?.kabupaten || '';
			const tanggalRapor = formatTanggal(semester?.tanggalBagiRaport);
			const dateStr =
				tempatTandaTangan && tanggalRapor ? `${tempatTandaTangan}, ${tanggalRapor}` : '';

			// Row: "Mengetahui" in col B, Date in col F
			const mengetahuiRow = Array(7).fill('');
			mengetahuiRow[1] = 'Mengetahui';
			mengetahuiRow[5] = dateStr;
			signatureRows.push(mengetahuiRow);

			// Row: "Kepala" in col B, "Guru Kelas" in col F
			const titleRow = Array(7).fill('');
			titleRow[1] = 'Kepala';
			titleRow[5] = 'Guru Kelas';
			signatureRows.push(titleRow);

			// Row: School name in col B, empty col F
			const schoolRow = Array(7).fill('');
			schoolRow[1] = sekolah.nama || '';
			signatureRows.push(schoolRow);

			// Add 4 empty rows for handwritten signatures
			signatureRows.push([]);
			signatureRows.push([]);
			signatureRows.push([]);
			signatureRows.push([]);

			// Row: Kepala Sekolah name in col B, Guru Kelas name in col F
			const nameRow = Array(7).fill('');
			nameRow[1] = sekolah.kepalaSekolah?.nama || '';
			nameRow[5] = waliKelas?.nama || '';
			signatureRows.push(nameRow);

			// Row: Kepala Sekolah NIP in col B, Guru Kelas NIP in col F
			const nipRow = Array(7).fill('');
			nipRow[1] = sekolah.kepalaSekolah?.nip || '';
			nipRow[5] = waliKelas?.nip || '';
			signatureRows.push(nipRow);

			// Add all signature rows at once
			if (typeof worksheet.addRows === 'function') {
				worksheet.addRows(signatureRows);
			}

			// Style signature rows
			const wsTyped = worksheet as unknown as {
				getRow(n: number): {
					font?: unknown;
					alignment?: unknown;
					fill?: unknown;
					height?: number;
					getCell(n: number): {
						border?: unknown;
						font?: unknown;
						fill?: unknown;
						alignment?: unknown;
					};
				};
			};

			const startSigRow = rows.length + 2; // After table
			for (let i = 0; i < signatureRows.length; i++) {
				const row = wsTyped.getRow(startSigRow + i);
				if (row) {
					row.height = 20;
					row.font = { size: 11 };
					// Set alignment for columns B and F
					const cellB = row.getCell(2);
					const cellF = row.getCell(6);
					if (cellB) cellB.alignment = { horizontal: 'center', vertical: 'center' };
					if (cellF) cellF.alignment = { horizontal: 'center', vertical: 'center' };
				}
			}
		} catch (err) {
			// ignore signature section errors
			console.warn('Warning: Signature section may not have been applied', err);
		}

		const dateStr = new Date().toLocaleDateString('id-ID', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
		const filename = `BA_Rapor_${kelas.nama}_${dateStr}.xlsx`;

		// Generate buffer
		const buffer = await workbook.xlsx.writeBuffer();

		// Return file
		return new Response(buffer as ArrayBuffer, {
			status: 200,
			headers: {
				'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (err) {
		console.error('Error generating BA:', err);
		return json({ error: 'Gagal membuat Berita Acara.' }, { status: 500 });
	}
}
