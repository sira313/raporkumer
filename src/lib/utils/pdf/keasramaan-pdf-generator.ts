/**
 * Rapor Keasramaan PDF Generator using jsPDF-AutoTable
 *
 * Migrasi dari HTML/CSS print ke PDF generation
 * Desain mengikuti template yang sudah ada
 */

import { jsPDF } from 'jspdf';
import autoTable, { type RowInput } from 'jspdf-autotable';

type KeasramaanRow = {
	no: number;
	indikator: string;
	predikat: 'perlu-bimbingan' | 'cukup' | 'baik' | 'sangat-baik';
	deskripsi: string;
	kategoriHeader?: string;
	order?: number;
};

type KeasramaanPDFData = {
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
		tahunAjaran: string;
		semester: string;
	};
	waliAsrama?: {
		nama: string;
		nip: string;
	};
	waliAsuh?: {
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
	keasramaanRows: KeasramaanRow[];
	showBgLogo?: boolean;
};

/**
 * Convert predikat to letter grade
 */
function predikatToHuruf(predikat: KeasramaanRow['predikat']): string {
	const mapping: Record<KeasramaanRow['predikat'], string> = {
		'sangat-baik': 'A',
		baik: 'B',
		cukup: 'C',
		'perlu-bimbingan': 'D'
	};
	return mapping[predikat] || '—';
}

/**
 * Format value dengan fallback
 */
function formatValue(value: string | null | undefined): string {
	if (value === null || value === undefined || value === '') return '—';
	return value;
}

/**
 * Generate PDF untuk Rapor Keasramaan
 */
export async function generateKeasramaanPDF(data: KeasramaanPDFData): Promise<jsPDF> {
	const doc = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4'
	});

	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 20; // 20mm margin (sama dengan padding preview)
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

			// Draw image with opacity (increased for visibility testing)
			ctx.globalAlpha = 0.15; // 15% opacity (increased from 10% for better visibility)
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

	// Don't draw logo here - will draw after all content is added

	// ===== PAGE 1: HEADER + IDENTITY + TABLE START =====

	// Header Judul: font-bold, tracking-wide, uppercase
	doc.setFontSize(14); // ukuran yang lebih kecil
	doc.setFont('helvetica', 'bold');
	doc.text('LAPORAN KEGIATAN KEASRAMAAN', pageWidth / 2, currentY, { align: 'center' });
	currentY += 5.5; // line height

	// Sub-header: font-semibold, tracking-wide, uppercase
	doc.setFontSize(10); // ukuran yang lebih kecil
	doc.setFont('helvetica', 'normal'); // semibold fallback ke normal
	doc.text('(RAPOR)', pageWidth / 2, currentY, { align: 'center' });
	currentY += 5; // pb-4

	// Identity Table - Layout 2 kolom seperti preview
	// Font diperkecil untuk keterbacaan
	doc.setFontSize(10); // diperkecil dari 12px
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
			data.periode.tahunAjaran
		]
	];

	autoTable(doc, {
		startY: currentY,
		head: [],
		body: identityData,
		theme: 'plain',
		styles: {
			fontSize: 10, // diperkecil dari 12px
			cellPadding: 0, // no padding di preview
			lineColor: [0, 0, 0],
			lineWidth: 0,
			valign: 'top', // align-top
			minCellHeight: 5, // natural line height
			cellWidth: 'auto'
		},
		columnStyles: {
			0: { cellWidth: 28 }, // label kiri diperkecil
			1: { cellWidth: 3 }, // colon kiri
			2: { cellWidth: 70, fontStyle: 'bold' }, // value kiri, fixed width lebih besar
			3: { cellWidth: 35 }, // label kanan diperkecil
			4: { cellWidth: 3 }, // colon kanan
			5: { cellWidth: 'auto', fontStyle: 'bold' } // value kanan, auto untuk sisa ruang
		},
		margin: { left: margin, right: margin }
	});

	currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8.5; // mt-8 = 32px = 11.3mm (tapi disesuaikan ke 8.5mm)

	// Main Table: Keasramaan Rows
	// table-compact table w-full text-xs print:text-xs
	const tableBody: RowInput[] = [];

	data.keasramaanRows.forEach((row) => {
		if (row.kategoriHeader) {
			// Kategori header row: colspan="4", font-semibold, px-2 py-1, text-left
			tableBody.push([
				{
					content: row.kategoriHeader,
					colSpan: 4,
					styles: {
						fontStyle: 'bold' as const, // font-semibold (use bold)
						fillColor: [255, 255, 255], // bg putih
						fontSize: 9, // ukuran lebih kecil
						cellPadding: { top: 1.4, right: 2.8, bottom: 1.4, left: 2.8 }, // px-2 py-1
						halign: 'left' // rata kiri
					}
				}
			]);
		} else {
			// Data row - deskripsi bisa multi-paragraph dengan gap-0.5 (2px = 0.7mm)
			const deskripsiLines = formatValue(row.deskripsi)
				.split('\n')
				.filter((p: string) => p.trim())
				.join('\n');

			tableBody.push([
				row.no.toString(),
				formatValue(row.indikator),
				predikatToHuruf(row.predikat),
				deskripsiLines
			]);
		}
	});

	autoTable(doc, {
		startY: currentY,
		head: [['No', 'Indikator', 'Predikat', 'Deskripsi']],
		body: tableBody,
		theme: 'grid',
		rowPageBreak: 'avoid', // hindari baris kosong sebelum page break
		styles: {
			fontSize: 9, // ukuran lebih kecil
			cellPadding: { top: 1.4, right: 2.8, bottom: 1.4, left: 2.8 }, // px-2 py-1
			valign: 'top', // align-top
			lineColor: [0, 0, 0], // border-black
			lineWidth: 0.3, // border yang visible
			textColor: [0, 0, 0]
		},
		headStyles: {
			fillColor: [255, 255, 255], // bg putih
			textColor: [0, 0, 0], // text-black print:text-black
			fontStyle: 'bold', // <th> implicitly bold
			halign: 'center', // text-center
			valign: 'middle',
			fontSize: 9, // ukuran lebih kecil
			cellPadding: { top: 1.4, right: 2.8, bottom: 1.4, left: 2.8 } // px-2 py-1
		},
		columnStyles: {
			0: { cellWidth: 12, halign: 'center' }, // No, text-center
			1: { cellWidth: 60 }, // Indikator
			2: { cellWidth: 20, halign: 'center' }, // Predikat, text-center
			3: { cellWidth: contentWidth - 92 } // Deskripsi, align-top
		},
		margin: { left: margin, right: margin },
		showHead: 'everyPage',
		didDrawPage: () => {
			// Add footer dengan style FooterPage: text-[12px], metadata di kiri, page number di kanan
			const currentPage = (
				doc as unknown as { internal: { getCurrentPageInfo: () => { pageNumber: number } } }
			).internal.getCurrentPageInfo().pageNumber;

			const footerY = pageHeight - 10; // bottom: 10mm
			doc.setFontSize(9); // sama dengan orphan header

			// Footer metadata di kiri (rombel | nama | nis)
			const footerMeta = `${formatValue(data.rombel.nama)} | ${formatValue(data.murid.nama)} | ${formatValue(data.murid.nis)}`;
			doc.text(footerMeta, margin, footerY, { align: 'left' });

			// Page number di kanan
			doc.text(`Halaman: ${currentPage}`, pageWidth - margin, footerY, {
				align: 'right'
			});
		}
	});

	currentY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8.5; // mt-6 = 24px = 8.5mm

	// Kehadiran Section: mt-6, w-full, border
	if (data.kehadiran) {
		checkNewPage(50);

		// Table dengan header KETIDAKHADIRAN di dalam (seperti preview)
		// Header row 1: colspan="3", text-center, font-bold
		// Header row 2: w-12, w-16, text-center/text-left, font-semibold
		autoTable(doc, {
			startY: currentY,
			head: [
				[
					{
						content: 'KETIDAKHADIRAN',
						colSpan: 3,
						styles: { halign: 'center', fontStyle: 'bold', fontSize: 10 }
					}
				],
				['No', 'Alasan Ketidakhadiran', 'Jumlah']
			],
			body: [
				['1', 'Sakit', data.kehadiran.sakit.toString()],
				['2', 'Izin', data.kehadiran.izin.toString()],
				['3', 'Tanpa Keterangan', data.kehadiran.alfa.toString()]
			],
			theme: 'grid',
			styles: {
				fontSize: 9, // ukuran lebih kecil
				cellPadding: { top: 2.8, right: 4.2, bottom: 2.8, left: 4.2 }, // px-3 py-2
				lineColor: [0, 0, 0], // border
				lineWidth: 0.3,
				textColor: [0, 0, 0]
			},
			headStyles: {
				fillColor: [255, 255, 255], // bg putih
				textColor: [0, 0, 0],
				fontStyle: 'bold', // font-bold untuk header row 1, font-semibold untuk row 2
				halign: 'center', // text-center
				valign: 'middle',
				fontSize: 9, // ukuran lebih kecil
				cellPadding: { top: 2.8, right: 4.2, bottom: 2.8, left: 4.2 } // px-3 py-2
			},
			columnStyles: {
				0: { cellWidth: 17, halign: 'center' }, // w-12 = 48px = 17mm, text-center
				1: { cellWidth: contentWidth - 17 - 22.6, halign: 'left' }, // sisa, text-left
				2: { cellWidth: 22.6, halign: 'center' } // w-16 = 64px = 22.6mm, text-center
			},
			margin: { left: margin, right: margin }
		});

		currentY =
			(doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 16.9; // mt-12 = 48px = 16.9mm
	}

	// Signatures Section: mt-12, flex flex-col gap-6
	// grid gap-4 md:grid-cols-2, text-xs print:text-xs, text-center
	checkNewPage(75);

	const kepalaSekolahTitle =
		data.kepalaSekolah?.statusKepalaSekolah === 'plt' ? 'Plt. Kepala Sekolah' : 'Kepala Sekolah';

	// Signature grid: 2x2 layout dengan gap-4 horizontal, gap-6 vertical
	const sigColWidth = contentWidth / 2;
	// const sigGapHorizontal = 5.6; // gap-4 = 16px = 5.6mm (handled by grid cols)
	const sigGapVertical = 8.5; // gap-6 = 24px = 8.5mm
	const sigStartY = currentY;

	doc.setFontSize(10); // match dengan header tabel KETIDAKHADIRAN
	doc.setFont('helvetica', 'normal');

	// Tempat, Tanggal (absolute -top-6 = 24px = 8.5mm di atas Wali Asuh)
	if (data.ttd) {
		doc.text(
			`${data.ttd.tempat}, ${data.ttd.tanggal}`,
			margin + sigColWidth + sigColWidth / 2,
			sigStartY - 8.5, // -top-6 = -24px = -8.5mm
			{ align: 'center' }
		);
	}

	// Row 1: Wali Asrama | Wali Asuh
	// Wali Asrama (left) - text-xs, text-center
	doc.text('Wali Asrama', margin + sigColWidth / 2, sigStartY, { align: 'center' });
	// mt-16 = 64px = 22.6mm, font-semibold, tracking-wide, underline
	doc.setFont('helvetica', 'bold'); // font-semibold (use bold)
	const waliAsramaNama = formatValue(data.waliAsrama?.nama);
	doc.text(
		waliAsramaNama,
		margin + sigColWidth / 2,
		sigStartY + 22.6, // mt-16 = 64px = 22.6mm
		{ align: 'center' }
	);
	// Underline manual
	const waliAsramaWidth = doc.getTextWidth(waliAsramaNama);
	doc.line(
		margin + sigColWidth / 2 - waliAsramaWidth / 2,
		sigStartY + 23.2,
		margin + sigColWidth / 2 + waliAsramaWidth / 2,
		sigStartY + 23.2
	);

	// mt-1 = 4px = 1.4mm, text-xs
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10); // match dengan header tabel
	doc.text(
		formatValue(data.waliAsrama?.nip),
		margin + sigColWidth / 2,
		sigStartY + 22.6 + 1.4 + 3, // mt-1 = 4px = 1.4mm + line spacing
		{ align: 'center' }
	);

	// Wali Asuh (right) - text-xs, text-center
	doc.setFontSize(10); // match dengan header tabel
	doc.text('Wali Asuh', margin + sigColWidth + sigColWidth / 2, sigStartY, { align: 'center' });
	doc.setFont('helvetica', 'bold');
	const waliAsuhNama = formatValue(data.waliAsuh?.nama);
	doc.text(waliAsuhNama, margin + sigColWidth + sigColWidth / 2, sigStartY + 22.6, {
		align: 'center'
	});
	// Underline
	const waliAsuhWidth = doc.getTextWidth(waliAsuhNama);
	doc.line(
		margin + sigColWidth + sigColWidth / 2 - waliAsuhWidth / 2,
		sigStartY + 23.2,
		margin + sigColWidth + sigColWidth / 2 + waliAsuhWidth / 2,
		sigStartY + 23.2
	);
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10); // match dengan header tabel
	doc.text(
		formatValue(data.waliAsuh?.nip),
		margin + sigColWidth + sigColWidth / 2,
		sigStartY + 22.6 + 1.4 + 3,
		{ align: 'center' }
	);

	// Row 2: Orang Tua/Wali | Kepala Sekolah
	// gap-6 = 24px = 8.5mm dari row 1
	const sig2StartY = sigStartY + 22.6 + 1.4 + 3 + sigGapVertical;

	// Orang Tua/Wali (left) - text-xs, text-center
	doc.setFontSize(10); // match dengan header tabel
	doc.text('Orang Tua/Wali Murid', margin + sigColWidth / 2, sig2StartY, { align: 'center' });
	// Gunakan lebar dan posisi Y yang sama dengan underline nama kepala sekolah
	const kepalaSekolahNamaTemp = formatValue(data.kepalaSekolah?.nama);
	doc.setFont('helvetica', 'bold');
	const dashedLineWidth = doc.getTextWidth(kepalaSekolahNamaTemp); // sama dengan lebar nama kepala sekolah
	doc.setFont('helvetica', 'normal');

	const lineY = sig2StartY + 23.2; // posisi Y sama dengan underline Kepala Sekolah
	const lineStartX = margin + sigColWidth / 2 - dashedLineWidth / 2;
	const lineEndX = margin + sigColWidth / 2 + dashedLineWidth / 2;

	// Draw dashed line (border-dashed)
	const dashLength = 1.5; // diperpendek dari 2
	const gapLength = 1; // diperkecil dari 2 agar lebih rapat
	let currentX = lineStartX;
	doc.setLineWidth(0.1);
	while (currentX < lineEndX) {
		const nextX = Math.min(currentX + dashLength, lineEndX);
		doc.line(currentX, lineY, nextX, lineY);
		currentX = nextX + gapLength;
	}

	// Kepala Sekolah (right) - text-xs, text-center
	doc.setFontSize(10); // match dengan header tabel
	doc.text(kepalaSekolahTitle, margin + sigColWidth + sigColWidth / 2, sig2StartY, {
		align: 'center'
	});
	// mt-16 = 64px = 22.6mm, font-semibold, tracking-wide, underline
	doc.setFont('helvetica', 'bold');
	const kepalaSekolahNama = formatValue(data.kepalaSekolah?.nama);
	doc.text(kepalaSekolahNama, margin + sigColWidth + sigColWidth / 2, sig2StartY + 22.6, {
		align: 'center'
	});
	// Underline
	const kepalaSekolahWidth = doc.getTextWidth(kepalaSekolahNama);
	doc.line(
		margin + sigColWidth + sigColWidth / 2 - kepalaSekolahWidth / 2,
		sig2StartY + 23.2,
		margin + sigColWidth + sigColWidth / 2 + kepalaSekolahWidth / 2,
		sig2StartY + 23.2
	);
	// mt-1 = 4px = 1.4mm, text-xs
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10); // match dengan header tabel
	doc.text(
		formatValue(data.kepalaSekolah?.nip),
		margin + sigColWidth + sigColWidth / 2,
		sig2StartY + 22.6 + 1.4 + 3,
		{ align: 'center' }
	);

	// Draw watermark on all pages AFTER all content is added
	if (logoImage) {
		console.log('[PDF] Adding watermark to all pages...');
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const totalPages = (doc as any).internal.pages.length - 1; // -1 because first element is not a page
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
export async function downloadKeasramaanPDF(
	data: KeasramaanPDFData,
	filename?: string
): Promise<void> {
	const doc = await generateKeasramaanPDF(data);

	const defaultFilename = `Rapor_Keasramaan_${data.murid.nama}_${data.periode.tahunAjaran}_${data.periode.semester}.pdf`;
	doc.save(filename || defaultFilename);
}
