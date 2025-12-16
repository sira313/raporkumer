/**
 * Rapor PDF Generator using jsPDF-AutoTable
 *
 * Migrasi dari HTML/CSS print ke PDF generation
 * Desain mengikuti template yang sudah ada
 * Menggunakan ukuran font yang sama dengan keasramaan-pdf-generator
 */

import { jsPDF } from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';

type IntrakurikulerEntry = {
	nomor: number;
	mataPelajaran: string;
	nilai: number | null;
	deskripsi: string;
	jenis?: string;
};

type EkstrakurikulerEntry = {
	nama: string;
	deskripsi: string;
};

type KokurikulerEntry = {
	dimensi: string;
	deskripsi: string;
};

type RaporPDFData = {
	sekolah: {
		nama: string;
		npsn: string;
		alamat: string;
		logoUrl?: string;
	};
	murid: {
		nama: string;
		nis: string;
		nisn: string;
	};
	rombel: {
		nama: string;
		fase?: string;
	};
	periode: {
		tahunPelajaran: string;
		semester: string;
	};
	waliKelas?: {
		nama: string;
		nip: string;
	};
	kepalaSekolah?: {
		nama: string;
		nip: string;
		statusKepalaSekolah?: 'definitif' | 'plt';
	};
	ttd?: {
		tempat: string;
		tanggal: string;
	};
	kehadiran?: {
		sakit: number;
		izin: number;
		alfa: number;
	};
	catatanWali?: string;
	tanggapanOrangTua?: string;
	intrakurikuler: IntrakurikulerEntry[];
	ekstrakurikuler?: EkstrakurikulerEntry[];
	kokurikuler?: KokurikulerEntry[];
	hasKokurikuler?: boolean;
	jenjangVariant?: string;
	showBgLogo?: boolean;
};

/**
 * Format value dengan fallback
 */
function formatValue(value: string | number | null | undefined): string {
	if (value === null || value === undefined || value === '') return '—';
	if (typeof value === 'number') {
		return Math.round(value).toString();
	}
	return value.toString();
}

/**
 * Format nilai angka
 */
function formatNilai(value: number | null | undefined): string {
	if (value === null || value === undefined) return '—';
	return Math.round(value).toString();
}

/**
 * Generate PDF untuk Rapor
 */
export async function generateRaporPDF(data: RaporPDFData): Promise<jsPDF> {
	const doc = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4'
	});

	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 20; // 20mm margin (sama dengan keasramaan)
	const contentWidth = pageWidth - 2 * margin;

	let currentY = margin;

	// Load logo image if showBgLogo is enabled
	let logoImage: HTMLImageElement | null = null;
	if (data.showBgLogo && data.sekolah.logoUrl) {
		console.log('[PDF] BG Logo enabled, loading logo from:', data.sekolah.logoUrl);
		try {
			const logoUrl = data.sekolah.logoUrl.startsWith('http')
				? data.sekolah.logoUrl
				: `${window.location.origin}${data.sekolah.logoUrl}`;

			console.log('[PDF] Full logo URL:', logoUrl);

			const img = new Image();
			img.crossOrigin = 'anonymous';

			// Try to load logo, but don't fail PDF generation if it fails
			try {
				await new Promise<void>((resolve, reject) => {
					const timeout = setTimeout(() => reject(new Error('Logo load timeout')), 5000);
					img.onload = () => {
						clearTimeout(timeout);
						console.log('[PDF] Logo loaded successfully');
						resolve();
					};
					img.onerror = (e) => {
						clearTimeout(timeout);
						console.error('[PDF] Logo load error:', e);
						reject(new Error('Failed to load logo'));
					};
					img.src = logoUrl;
				});
				logoImage = img;
				console.log('[PDF] Logo ready for watermark');
			} catch (loadError) {
				console.warn('[PDF] Logo load failed, continuing without watermark:', loadError);
			}
		} catch (error) {
			console.warn('[PDF] Error preparing logo for watermark:', error);
		}
	} else {
		console.log('[PDF] BG Logo disabled or no logo URL');
	}

	// Helper: draw background logo watermark on current page with opacity
	const drawBgLogo = () => {
		if (!logoImage) {
			console.log('[PDF] No logo image available for watermark');
			return;
		}

		try {
			// Calculate center position and size (45% of page width)
			const logoSize = pageWidth * 0.45;
			const logoX = (pageWidth - logoSize) / 2;
			const logoY = (pageHeight - logoSize) / 2;

			console.log('[PDF] Drawing watermark at:', { logoX, logoY, logoSize });

			// Create canvas to apply opacity
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (!ctx) {
				console.error('[PDF] Failed to get canvas context');
				return;
			}

			// Use actual image dimensions for better quality
			const imgWidth = logoImage.naturalWidth || logoImage.width;
			const imgHeight = logoImage.naturalHeight || logoImage.height;
			canvas.width = imgWidth;
			canvas.height = imgHeight;

			console.log('[PDF] Canvas size:', { width: canvas.width, height: canvas.height });

			// Clear canvas (transparent background)
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Draw image with opacity
			ctx.globalAlpha = 0.15; // 15% opacity
			ctx.drawImage(logoImage, 0, 0, canvas.width, canvas.height);

			// Convert canvas to data URL and add to PDF
			const dataUrl = canvas.toDataURL('image/png', 0.8); // quality 0.8
			console.log('[PDF] Data URL length:', dataUrl.length);
			console.log('[PDF] Adding image to PDF with addImage()');

			// Add image to PDF at calculated position
			doc.addImage(dataUrl, 'PNG', logoX, logoY, logoSize, logoSize, undefined, 'NONE');
			console.log('[PDF] Image added to PDF at position:', {
				x: logoX,
				y: logoY,
				w: logoSize,
				h: logoSize
			});

			console.log('[PDF] Watermark drawn successfully');
		} catch (error) {
			console.error('[PDF] Error drawing watermark:', error);
		}
	};

	// Helper: check if we need new page
	const checkNewPage = (requiredHeight: number) => {
		if (currentY + requiredHeight > pageHeight - margin) {
			doc.addPage();
			currentY = margin;
			return true;
		}
		return false;
	};

	// ===== PAGE 1: HEADER + IDENTITY + TABLE START =====

	// Header Judul: font-bold, tracking-wide, uppercase
	doc.setFontSize(14); // ukuran yang sama dengan keasramaan
	doc.setFont('helvetica', 'bold');
	doc.text('LAPORAN HASIL BELAJAR', pageWidth / 2, currentY, { align: 'center' });
	currentY += 5.5; // line height

	// Sub-header: font-semibold, tracking-wide, uppercase
	doc.setFontSize(10); // ukuran yang sama dengan keasramaan
	doc.setFont('helvetica', 'normal'); // semibold fallback ke normal
	doc.text('(RAPOR)', pageWidth / 2, currentY, { align: 'center' });
	currentY += 5; // pb-4

	// Identity Table - Layout 2 kolom seperti preview
	doc.setFontSize(10); // ukuran yang sama dengan keasramaan
	doc.setFont('helvetica', 'normal');

	// Format semester (hilangkan kata "Semester" di depan jika ada)
	const semesterLabel = data.periode.semester.replace(/^Semester\s+/i, '');
	const faseLabel = data.rombel.fase ? formatValue(data.rombel.fase).toUpperCase() : '—';

	// Layout 2 kolom: [Label1, :, Value1, Label2, :, Value2]
	const identityData = [
		[
			'Nama Murid',
			':',
			formatValue(data.murid.nama).toUpperCase(),
			'Kelas',
			':',
			formatValue(data.rombel.nama)
		],
		[
			'NISN / NIS',
			':',
			`${formatValue(data.murid.nisn)} / ${formatValue(data.murid.nis)}`,
			'Fase',
			':',
			faseLabel
		],
		['Sekolah', ':', formatValue(data.sekolah.nama).toUpperCase(), 'Semester', ':', semesterLabel],
		[
			'Alamat',
			':',
			formatValue(data.sekolah.alamat),
			'Tahun Pelajaran',
			':',
			data.periode.tahunPelajaran
		]
	];

	autoTable(doc, {
		startY: currentY,
		head: [],
		body: identityData,
		theme: 'plain',
		styles: {
			fontSize: 10, // ukuran yang sama dengan keasramaan
			cellPadding: 0,
			lineColor: [0, 0, 0],
			lineWidth: 0,
			valign: 'top',
			minCellHeight: 5,
			cellWidth: 'auto'
		},
		columnStyles: {
			0: { cellWidth: 28 }, // label kiri
			1: { cellWidth: 3 }, // colon kiri
			2: { cellWidth: 70, fontStyle: 'bold' }, // value kiri, fixed width lebih besar
			3: { cellWidth: 35 }, // label kanan
			4: { cellWidth: 3 }, // colon kanan
			5: { cellWidth: 'auto', fontStyle: 'bold' } // value kanan, auto untuk sisa ruang
		},
		margin: { left: margin, right: margin }
	});

	currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4.2; // spacing

	// Main Table: Intrakurikuler
	const tableBody: RowInput[] = [];

	// Group intrakurikuler by jenis
	const jenisOrder = ['wajib', 'pilihan', 'kejuruan', 'mulok'];
	const jenisToLabel: Record<string, string> = {
		wajib:
			data.jenjangVariant?.toUpperCase() === 'SMK' ? 'Mata Pelajaran Umum' : 'Mata Pelajaran Wajib',
		pilihan: 'Mata Pelajaran Pilihan',
		kejuruan: 'Mata Pelajaran Kejuruan',
		mulok: 'Muatan Lokal'
	};

	// Collect unique jenis in order
	const uniqueJenisInOrder: string[] = [];
	for (const row of data.intrakurikuler) {
		const jenis = row.jenis || 'wajib';
		if (!uniqueJenisInOrder.includes(jenis)) {
			uniqueJenisInOrder.push(jenis);
		}
	}
	uniqueJenisInOrder.sort((a, b) => jenisOrder.indexOf(a) - jenisOrder.indexOf(b));

	// Create dynamic letter mapping
	const jenisToLetter: Record<string, string> = {};
	const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
	for (let i = 0; i < uniqueJenisInOrder.length; i++) {
		jenisToLetter[uniqueJenisInOrder[i]] = letters[i];
	}

	// Sort intrakurikuler by jenis
	const sortedIntrak = [...data.intrakurikuler].sort((a, b) => {
		const jenisA = a.jenis || 'wajib';
		const jenisB = b.jenis || 'wajib';
		return jenisOrder.indexOf(jenisA) - jenisOrder.indexOf(jenisB);
	});

	let lastJenis: string | null = null;
	let itemCounter = 0;

	for (const row of sortedIntrak) {
		const currentJenis = row.jenis || 'wajib';

		// Add group header if jenis changed
		if (lastJenis !== currentJenis && jenisToLetter[currentJenis]) {
			tableBody.push([
				{
					content: `${jenisToLetter[currentJenis]}. ${jenisToLabel[currentJenis]}`,
					colSpan: 4,
					styles: {
						fontStyle: 'bold' as const,
						fillColor: [255, 255, 255],
						fontSize: 9, // ukuran yang sama dengan keasramaan
						cellPadding: { top: 2.8, right: 2.8, bottom: 2.8, left: 2.8 },
						halign: 'left'
					}
				}
			]);
			lastJenis = currentJenis;
			itemCounter = 0;
		}

		itemCounter++;
		tableBody.push([
			itemCounter.toString(),
			formatValue(row.mataPelajaran),
			formatNilai(row.nilai),
			formatValue(row.deskripsi)
		]);
	}

	autoTable(doc, {
		startY: currentY,
		head: [['No.', 'Muatan Pelajaran', 'Nilai Akhir', 'Capaian Kompetensi']],
		body: tableBody,
		theme: 'grid',
		rowPageBreak: 'avoid',
		styles: {
			fontSize: 9, // ukuran yang sama dengan keasramaan
			cellPadding: { top: 2.8, right: 2.8, bottom: 2.8, left: 2.8 },
			valign: 'top',
			lineColor: [0, 0, 0],
			lineWidth: 0.3,
			textColor: [0, 0, 0]
		},
		headStyles: {
			fillColor: [255, 255, 255],
			textColor: [0, 0, 0],
			fontStyle: 'bold',
			halign: 'center',
			valign: 'middle',
			fontSize: 9, // ukuran yang sama dengan keasramaan
			cellPadding: { top: 2.8, right: 2.8, bottom: 2.8, left: 2.8 }
		},
		columnStyles: {
			0: { cellWidth: 12, halign: 'center' }, // No.
			1: { cellWidth: 50 }, // Muatan Pelajaran
			2: { cellWidth: 20, halign: 'center' }, // Nilai Akhir
			3: { cellWidth: contentWidth - 82 } // Capaian Kompetensi
		},
		margin: { left: margin, right: margin },
		showHead: 'everyPage',
		didDrawPage: () => {
			// Add footer dengan style FooterPage
			const currentPage = (
				doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } }
			).internal.getCurrentPageInfo().pageNumber;

			const footerY = pageHeight - 10; // bottom: 10mm
			doc.setFontSize(9); // ukuran yang sama dengan keasramaan

			// Footer metadata di kiri (rombel | nama | nis)
			const footerMeta = `${formatValue(data.rombel.nama)} | ${formatValue(data.murid.nama)} | ${formatValue(data.murid.nis)}`;
			doc.text(footerMeta, margin, footerY, { align: 'left' });

			// Page number di kanan
			doc.text(`Halaman: ${currentPage}`, pageWidth - margin, footerY, {
				align: 'right'
			});
		}
	});

	currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4.2; // spacing

	// Kokurikuler Section (if exists)
	if (data.kokurikuler && data.kokurikuler.length > 0 && data.hasKokurikuler) {
		checkNewPage(50);

		currentY += 2.8; // pt-2 spacing (8px = 2.8mm)

		// Kokurikuler adalah narrative text, bukan tabel dengan kolom
		// Split narrative menjadi sentences untuk formatting
		const kokuNarrative = data.kokurikuler[0]?.deskripsi || '';
		const sentences = kokuNarrative
			.split(/\n+/)
			.map((s) => s.trim())
			.filter((s) => s.length > 0);

		autoTable(doc, {
			startY: currentY,
			head: [
				[
					{
						content: 'Kokurikuler',
						styles: { halign: 'center', fontStyle: 'bold', fontSize: 9 }
					}
				]
			],
			body: [[sentences.join('\n')]],
			theme: 'grid',
			styles: {
				fontSize: 9,
				cellPadding: { top: 2.8, right: 2.8, bottom: 2.8, left: 2.8 },
				lineColor: [0, 0, 0],
				lineWidth: 0.3,
				textColor: [0, 0, 0],
				valign: 'top'
			},
			headStyles: {
				fillColor: [255, 255, 255],
				textColor: [0, 0, 0],
				fontStyle: 'bold',
				halign: 'center',
				valign: 'middle',
				fontSize: 9,
				cellPadding: { top: 2.8, right: 2.8, bottom: 2.8, left: 2.8 }
			},
			margin: { left: margin, right: margin }
		});

		currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2.8; // spacing
	}

	// Ekstrakurikuler Section (if exists)
	if (data.ekstrakurikuler && data.ekstrakurikuler.length > 0) {
		checkNewPage(50);

		// Add spacing
		currentY += 2.8; // spacing konsisten

		const ekstraBody: RowInput[] = data.ekstrakurikuler.map((row, idx) => [
			(idx + 1).toString(),
			formatValue(row.nama),
			formatValue(row.deskripsi)
		]);

		autoTable(doc, {
			startY: currentY,
			head: [['No.', 'Ekstrakurikuler', 'Keterangan']],
			body: ekstraBody,
			theme: 'grid',
			styles: {
				fontSize: 9, // ukuran yang sama dengan keasramaan
				cellPadding: { top: 2.8, right: 2.8, bottom: 2.8, left: 2.8 },
				lineColor: [0, 0, 0],
				lineWidth: 0.3,
				textColor: [0, 0, 0],
				valign: 'top'
			},
			headStyles: {
				fillColor: [255, 255, 255],
				textColor: [0, 0, 0],
				fontStyle: 'bold',
				halign: 'center',
				valign: 'middle',
				fontSize: 9, // ukuran yang sama dengan keasramaan
				cellPadding: { top: 2.8, right: 2.8, bottom: 2.8, left: 2.8 }
			},
			columnStyles: {
				0: { cellWidth: 12, halign: 'center' }, // No.
				1: { cellWidth: 50 }, // Ekstrakurikuler
				2: { cellWidth: contentWidth - 62 } // Keterangan
			},
			margin: { left: margin, right: margin }
		});

		currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 2.8; // spacing
	}

	// Kehadiran Section & Catatan Wali Kelas (1 tabel dengan gap column tanpa border)
	if (data.kehadiran || data.catatanWali) {
		checkNewPage(50);

		currentY += 2.8; // spacing konsisten

		const kehadiranData = data.kehadiran || { sakit: 0, izin: 0, alfa: 0 };
		const catatanWaliText = formatValue(data.catatanWali);

		// Struktur: [col1, col2, gap, col3]
		// Row 1: [Ketidakhadiran colspan 2, gap rowspan 4, Catatan header]
		// Row 2: [Sakit, nilai, gap, Catatan body rowspan 3]
		// Row 3: [Izin, nilai, gap, merged]
		// Row 4: [Tanpa Keterangan, nilai, gap, merged]

		const tableBody: RowInput[] = [
			[
				{
					content: 'Ketidakhadiran',
					colSpan: 2,
					styles: {
						halign: 'center',
						fontStyle: 'bold',
						cellPadding: { top: 2.8, right: 2.8, bottom: 2.8, left: 2.8 }
					}
				},
				{ content: '', rowSpan: 4, styles: { lineWidth: 0 } }, // gap cell tanpa border
				{
					content: 'Catatan Wali Kelas',
					styles: {
						halign: 'center',
						fontStyle: 'bold',
						cellPadding: { top: 2.8, right: 2.8, bottom: 2.8, left: 2.8 }
					}
				}
			],
			[
				'Sakit',
				kehadiranData.sakit !== null && kehadiranData.sakit !== undefined
					? kehadiranData.sakit.toString() + ' hari'
					: '-',
				{
					content: catatanWaliText,
					rowSpan: 3,
					styles: {
						valign: 'top',
						halign: 'left',
						fontStyle: 'normal',
						cellPadding: { top: 2.8, right: 2.8, bottom: 2.8, left: 2.8 }
					}
				}
			],
			[
				'Izin',
				kehadiranData.izin !== null && kehadiranData.izin !== undefined
					? kehadiranData.izin.toString() + ' hari'
					: '-'
			],
			[
				'Tanpa Keterangan',
				kehadiranData.alfa !== null && kehadiranData.alfa !== undefined
					? kehadiranData.alfa.toString() + ' hari'
					: '-'
			]
		];

		autoTable(doc, {
			startY: currentY,
			body: tableBody,
			theme: 'grid',
			styles: {
				fontSize: 9,
				cellPadding: { top: 2.8, right: 2.8, bottom: 2.8, left: 2.8 },
				lineColor: [0, 0, 0],
				lineWidth: 0.3,
				textColor: [0, 0, 0]
			},
			columnStyles: {
				0: { cellWidth: (contentWidth - 5.6) * 0.325 }, // Label ketidakhadiran (32.5%)
				1: { cellWidth: (contentWidth - 5.6) * 0.175, halign: 'center' }, // Nilai (17.5%)
				2: { cellWidth: 5.6, lineWidth: 0 }, // Gap column (no border)
				3: { cellWidth: (contentWidth - 5.6) * 0.5 } // Catatan wali (50%)
			},
			margin: { left: margin, right: margin },
			didDrawCell: (data) => {
				// Remove top and bottom borders for gap column (column 2)
				if (data.column.index === 2) {
					const cell = data.cell;
					const x = cell.x;
					const y = cell.y;
					const width = cell.width;
					const height = cell.height;

					// Redraw left and right borders only (tanpa top dan bottom)
					doc.setDrawColor(0, 0, 0);
					doc.setLineWidth(0.3);
					doc.line(x, y, x, y + height); // left border
					doc.line(x + width, y, x + width, y + height); // right border

					// Overwrite top and bottom borders dengan putih untuk menghilangkannya
					doc.setDrawColor(255, 255, 255);
					doc.setLineWidth(0.35); // sedikit lebih tebal untuk menutupi
					doc.line(x, y, x + width, y); // remove top border
					doc.line(x, y + height, x + width, y + height); // remove bottom border
				}
			}
		});

		currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5.6; // spacing lebih besar
	}

	// Tanggapan Orang Tua Section
	checkNewPage(50);

	if (!data.catatanWali) {
		currentY += 5.6; // spacing lebih besar jika tidak ada catatan wali
	}

	autoTable(doc, {
		startY: currentY,
		head: [
			[
				{
					content: 'Tanggapan Orang Tua/Wali Murid',
					colSpan: 1,
					styles: { halign: 'center', fontStyle: 'bold', fontSize: 9 }
				}
			]
		],
		body: [[data.tanggapanOrangTua?.trim() || '']],
		theme: 'grid',
		styles: {
			fontSize: 9,
			cellPadding: { top: 2.8, right: 2.8, bottom: 2.8, left: 2.8 },
			lineColor: [0, 0, 0],
			lineWidth: 0.3,
			textColor: [0, 0, 0],
			valign: 'top'
		},
		bodyStyles: {
			minCellHeight: 20 // tinggi body lebih besar dari header
		},
		headStyles: {
			fillColor: [255, 255, 255],
			textColor: [0, 0, 0],
			fontStyle: 'bold',
			halign: 'center',
			valign: 'middle',
			fontSize: 9,
			cellPadding: { top: 2.8, right: 2.8, bottom: 2.8, left: 2.8 }
		},
		margin: { left: margin, right: margin }
	});

	currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8.5; // jarak lebih besar dengan signature

	// Keputusan Section (hanya untuk semester genap)
	const semesterNormalized = data.periode.semester.toLowerCase().replace(/[^a-z0-9]/g, '');
	const isGenap = semesterNormalized.includes('genap') || semesterNormalized === '2';

	if (isGenap) {
		const rombelMatch = data.rombel.nama.match(/(\d{1,2})/);
		const kelasLevel = rombelMatch ? parseInt(rombelMatch[1], 10) : null;
		const isKelasEnam = kelasLevel === 6;

		const positiveLabel = isKelasEnam ? 'Lulus' : 'Naik Kelas';
		const negativeLabel = isKelasEnam ? 'Tidak Lulus' : 'Tidak Naik Kelas';

		autoTable(doc, {
			startY: currentY,
			head: [
				[
					{
						content: 'KEPUTUSAN',
						colSpan: 1,
						styles: { halign: 'left', fontStyle: 'bold', fontSize: 9 }
					}
				]
			],
			body: [
				[
					{
						content: '',
						styles: {
							minCellHeight: 16.9, // 60px = ~16.9mm
							cellPadding: { top: 4.2, right: 4.2, bottom: 4.2, left: 4.2 }
						}
					}
				]
			],
			theme: 'grid',
			styles: {
				fontSize: 9,
				lineColor: [0, 0, 0],
				lineWidth: 0.3,
				textColor: [0, 0, 0]
			},
			headStyles: {
				fillColor: [255, 255, 255],
				textColor: [0, 0, 0],
				fontStyle: 'bold',
				halign: 'left',
				valign: 'middle',
				fontSize: 9,
				cellPadding: { top: 4.2, right: 4.2, bottom: 4.2, left: 4.2 }
			},
			margin: { left: margin, right: margin },
			didDrawCell: (data) => {
				if (data.section === 'body' && data.row.index === 0) {
					const cellX = data.cell.x;
					const cellY = data.cell.y;
					const cellWidth = data.cell.width;
					const padding = 4.2;

					// Draw decision items
					doc.setFontSize(9);
					doc.setFont('helvetica', 'normal');

					// Positive decision
					const y1 = cellY + padding + 4;
					doc.text(positiveLabel, cellX + padding, y1);
					const boxSize = 5;
					const box1X = cellX + cellWidth - padding - boxSize;
					const box1Y = y1 - 3.5;
					doc.rect(box1X, box1Y, boxSize, boxSize);

					// Negative decision
					const y2 = y1 + 8.5; // gap-3 = 12px = ~4mm, tapi disesuaikan
					doc.text(negativeLabel, cellX + padding, y2);
					const box2X = cellX + cellWidth - padding - boxSize;
					const box2Y = y2 - 3.5;
					doc.rect(box2X, box2Y, boxSize, boxSize);
				}
			}
		});

		currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5.6; // spacing lebih besar
	} else {
		currentY += 5.6; // spacing before signature
	}

	// Signatures Section
	checkNewPage(75);

	const kepalaSekolahTitle =
		data.kepalaSekolah?.statusKepalaSekolah === 'plt' ? 'Plt. Kepala Sekolah' : 'Kepala Sekolah';

	// Signature grid: 3 kolom layout
	const sigColWidth = contentWidth / 3;
	const sigStartY = currentY;

	doc.setFontSize(10); // ukuran yang sama dengan keasramaan
	doc.setFont('helvetica', 'normal');

	// Tempat, Tanggal (absolute di atas Wali Kelas)
	if (data.ttd) {
		doc.text(
			`${data.ttd.tempat}, ${data.ttd.tanggal}`,
			margin + sigColWidth * 2 + sigColWidth / 2,
			sigStartY - 8.5, // -top-6 = -24px = -8.5mm
			{ align: 'center' }
		);
	}

	// Col 1: Orang Tua/Wali
	doc.text('Orang Tua/Wali Murid', margin + sigColWidth / 2, sigStartY, { align: 'center' });
	// Draw dashed line
	const dashedLineWidth = doc.getTextWidth(formatValue(data.kepalaSekolah?.nama));
	const lineY = sigStartY + 23.2;
	const lineStartX = margin + sigColWidth / 2 - dashedLineWidth / 2;
	const lineEndX = margin + sigColWidth / 2 + dashedLineWidth / 2;

	const dashLength = 1.5;
	const gapLength = 1;
	let currentX = lineStartX;
	doc.setLineWidth(0.1);
	while (currentX < lineEndX) {
		const nextX = Math.min(currentX + dashLength, lineEndX);
		doc.line(currentX, lineY, nextX, lineY);
		currentX = nextX + gapLength;
	}

	// Col 2: Kepala Sekolah
	doc.setFontSize(10);
	doc.text(kepalaSekolahTitle, margin + sigColWidth + sigColWidth / 2, sigStartY, {
		align: 'center'
	});
	doc.setFont('helvetica', 'bold');
	const kepalaSekolahNama = formatValue(data.kepalaSekolah?.nama);
	doc.text(kepalaSekolahNama, margin + sigColWidth + sigColWidth / 2, sigStartY + 22.6, {
		align: 'center'
	});
	// Underline
	const kepalaSekolahWidth = doc.getTextWidth(kepalaSekolahNama);
	doc.line(
		margin + sigColWidth + sigColWidth / 2 - kepalaSekolahWidth / 2,
		sigStartY + 23.2,
		margin + sigColWidth + sigColWidth / 2 + kepalaSekolahWidth / 2,
		sigStartY + 23.2
	);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	doc.text(
		formatValue(data.kepalaSekolah?.nip),
		margin + sigColWidth + sigColWidth / 2,
		sigStartY + 22.6 + 1.4 + 3,
		{ align: 'center' }
	);

	// Col 3: Wali Kelas
	doc.setFontSize(10);
	doc.text('Wali Kelas', margin + sigColWidth * 2 + sigColWidth / 2, sigStartY, {
		align: 'center'
	});
	doc.setFont('helvetica', 'bold');
	const waliKelasNama = formatValue(data.waliKelas?.nama);
	doc.text(waliKelasNama, margin + sigColWidth * 2 + sigColWidth / 2, sigStartY + 22.6, {
		align: 'center'
	});
	// Underline
	const waliKelasWidth = doc.getTextWidth(waliKelasNama);
	doc.line(
		margin + sigColWidth * 2 + sigColWidth / 2 - waliKelasWidth / 2,
		sigStartY + 23.2,
		margin + sigColWidth * 2 + sigColWidth / 2 + waliKelasWidth / 2,
		sigStartY + 23.2
	);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	doc.text(
		formatValue(data.waliKelas?.nip),
		margin + sigColWidth * 2 + sigColWidth / 2,
		sigStartY + 22.6 + 1.4 + 3,
		{ align: 'center' }
	);

	// Draw watermark on all pages AFTER all content is added
	if (logoImage) {
		console.log('[PDF] Adding watermark to all pages...');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const totalPages = (doc as any).internal.pages.length - 1;
		console.log('[PDF] Total pages:', totalPages);

		for (let i = 1; i <= totalPages; i++) {
			doc.setPage(i);
			console.log(`[PDF] Drawing watermark on page ${i}`);
			drawBgLogo();
		}
	}

	return doc;
}

/**
 * Generate dan download PDF
 */
export async function downloadRaporPDF(data: RaporPDFData, filename?: string): Promise<void> {
	const doc = await generateRaporPDF(data);

	const defaultFilename = `Rapor_${data.murid.nama}_${data.periode.tahunPelajaran}_${data.periode.semester}.pdf`;
	doc.save(filename || defaultFilename);
}
