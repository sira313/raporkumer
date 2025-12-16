/**
 * Cover Rapor PDF Generator using jsPDF-AutoTable
 *
 * Migrasi dari HTML/CSS print ke PDF generation
 * Desain mengikuti template yang sudah ada
 */

import { jsPDF } from 'jspdf';
import { jenjangPendidikanSederajat, nauganHeaderByKey } from '$lib/statics';
import type { NauganKey } from '$lib/statics';

type CoverPDFData = {
	sekolah: {
		nama: string;
		jenjang: string;
		jenjangVariant?: string | null;
		npsn: string;
		naungan?: string | null;
		alamat: {
			jalan: string;
			desa: string;
			kecamatan: string;
			kabupaten: string;
			provinsi: string | null;
			kodePos: string | null;
		};
		website?: string | null;
		email?: string | null;
		logoUrl?: string | null;
	};
	murid: {
		nama: string;
		nis: string;
		nisn: string;
	};
	showBgLogo?: boolean;
};

/**
 * Format value dengan fallback
 */
function formatValue(value: string | null | undefined): string {
	if (!value) return '—';
	const trimmed = value.trim();
	return trimmed ? trimmed : '—';
}

/**
 * Format uppercase dengan fallback
 */
function formatUpper(value: string | null | undefined): string {
	const formatted = formatValue(value);
	return formatted === '—' ? formatted : formatted.toUpperCase();
}

/**
 * Format student IDs (NISN / NIS)
 */
function formatStudentIds(nisn?: string | null, nis?: string | null): string {
	const values = [nisn, nis].map((val) => formatValue(val)).filter((v) => v !== '—');
	return values.length ? values.join(' / ') : '—';
}

/**
 * Get formatted jenjang pendidikan label
 */
function getSchoolJenjang(data: CoverPDFData): string | null {
	const raw = data.sekolah.jenjang;
	const variantKey = data.sekolah.jenjangVariant;

	if (!raw) return null;

	const key = String(raw) as keyof typeof jenjangPendidikanSederajat;

	// prefer explicit variant label when available
	if (variantKey) {
		const variants = jenjangPendidikanSederajat[key] ?? [];
		const found = variants.find((v) => v.key === String(variantKey));
		if (found) return formatUpper(found.label);
	}

	// fallback to the first variant's label for the jenjang
	const mapped = (jenjangPendidikanSederajat[key] ?? [])[0]?.label;
	return mapped ? formatUpper(mapped) : formatUpper(String(raw));
}

/**
 * Get ministry lines based on naungan
 */
function getMinistryLines(naungan?: string | null): [string, string] {
	const nauganKey = (naungan ?? 'kemendikbud') as NauganKey;
	return nauganHeaderByKey[nauganKey] ?? nauganHeaderByKey['kemendikbud'];
}

/**
 * Generate PDF untuk Cover Rapor
 */
export async function generateCoverPDF(data: CoverPDFData): Promise<jsPDF> {
	const doc = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4'
	});

	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 20; // 20mm margin (sama dengan padding preview)
	const contentWidth = pageWidth - 2 * margin;

	// Load logo image if available
	let logoImage: HTMLImageElement | null = null;
	let bgLogoImage: HTMLImageElement | null = null;

	if (data.sekolah.logoUrl) {
		try {
			const logoUrl = data.sekolah.logoUrl.startsWith('http')
				? data.sekolah.logoUrl
				: `${window.location.origin}${data.sekolah.logoUrl}`;

			const img = new Image();
			img.crossOrigin = 'anonymous';

			try {
				await new Promise<void>((resolve, reject) => {
					const timeout = setTimeout(() => reject(new Error('Logo load timeout')), 5000);
					img.onload = () => {
						clearTimeout(timeout);
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
				// Use same image for background if enabled
				if (data.showBgLogo) {
					bgLogoImage = img;
				}
			} catch (loadError) {
				console.warn('[PDF] Logo load failed, continuing without logo:', loadError);
			}
		} catch (error) {
			console.warn('[PDF] Error preparing logo:', error);
		}
	}

	// Helper: draw background logo watermark on current page with opacity
	const drawBgLogo = () => {
		if (!bgLogoImage) return;

		try {
			// Calculate center position and size (45% of page width)
			const logoSize = pageWidth * 0.45;
			const logoX = (pageWidth - logoSize) / 2;
			const logoY = (pageHeight - logoSize) / 2;

			// Create canvas to apply opacity
			const canvas = document.createElement('canvas');
			const ctx = canvas.getContext('2d');
			if (!ctx) return;

			// Use actual image dimensions for better quality
			const imgWidth = bgLogoImage.naturalWidth || bgLogoImage.width;
			const imgHeight = bgLogoImage.naturalHeight || bgLogoImage.height;
			canvas.width = imgWidth;
			canvas.height = imgHeight;

			// Clear canvas (transparent background)
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			// Draw image with opacity
			ctx.globalAlpha = 0.15; // 15% opacity
			ctx.drawImage(bgLogoImage, 0, 0, canvas.width, canvas.height);

			// Convert canvas to data URL and add to PDF
			const dataUrl = canvas.toDataURL('image/png', 0.8);
			doc.addImage(dataUrl, 'PNG', logoX, logoY, logoSize, logoSize, undefined, 'NONE');
		} catch (error) {
			console.error('[PDF] Error drawing watermark:', error);
		}
	};

	// ===== PAGE 1: COVER PAGE =====

	let currentY = margin;

	// Rata atas - mulai dari margin langsung
	currentY += 10; // minimal spacing from top

	// Logo section - 44mm like preview (w-44)
	if (logoImage) {
		try {
			const logoWidth = 44;
			const logoHeight = 44;
			const logoX = (pageWidth - logoWidth) / 2;

			doc.addImage(logoImage, 'PNG', logoX, currentY, logoWidth, logoHeight, undefined, 'FAST');
			currentY += logoHeight + 12; // spacing after logo (gap-6)
		} catch (error) {
			console.error('[PDF] Error adding logo:', error);
			currentY += 12;
		}
	} else {
		currentY += 12;
	}

	// Cover Headings (gap-4 = 16px = 4mm between items)
	doc.setFont('helvetica', 'bold');

	// LAPORAN (text-4xl = 36px = ~24pt)
	doc.setFontSize(24);
	doc.text('LAPORAN', pageWidth / 2, currentY, { align: 'center' });
	currentY += 10;

	// HASIL BELAJAR MURID (text-2xl = 24px = ~16pt)
	doc.setFontSize(16);
	doc.text('HASIL BELAJAR MURID', pageWidth / 2, currentY, { align: 'center' });
	currentY += 10;

	// Nama Sekolah (text-2xl = 24px = ~16pt)
	doc.setFontSize(16);
	doc.text(formatUpper(data.sekolah.nama), pageWidth / 2, currentY, { align: 'center' });

	// Push identity fields ke bawah - rata bawah
	// A4 height = 297mm, margin bottom = 20mm, jadi max Y = 277mm
	// Hitung tinggi konten identity + ministry
	// 2 identity fields: (label + gap + box) * 2 = (12 + 5 + 10) * 2 = 54mm
	// gap between fields = 12mm
	// ministry lines: 2 lines * 6mm = 12mm
	// Total bottom content: 54 + 12 + 12 = 78mm
	// Start position: 277 - 78 = 199mm
	currentY = 199;

	// Identity Fields - spacing kecil
	const identityFields = [
		{ label: 'Nama Murid', value: formatUpper(data.murid.nama) },
		{ label: 'NISN / NIS', value: formatStudentIds(data.murid.nisn, data.murid.nis) }
	];

	for (const field of identityFields) {
		// Label - text-lg font-bold
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(12); // text-lg = 18px = ~12pt
		doc.text(field.label, pageWidth / 2, currentY, { align: 'center' });
		currentY += 5; // gap lebih kecil

		// Value box with border (py-2)
		const boxHeight = 10;
		const boxY = currentY;
		doc.setDrawColor(0, 0, 0);
		doc.setLineWidth(0.3);
		doc.rect(margin, boxY, contentWidth, boxHeight);

		// Value text centered in box - text-lg font-bold
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(12);
		const textY = boxY + boxHeight / 2 + 2.5; // vertically center
		doc.text(field.value, pageWidth / 2, textY, { align: 'center' });
		currentY += boxHeight + 12; // gap lebih kecil
	}

	currentY += 8; // small gap before ministry

	// Ministry lines (text-2xl font-bold, sama dengan HASIL BELAJAR MURID)
	const ministryLines = getMinistryLines(data.sekolah.naungan);
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(16); // text-2xl, sama dengan HASIL BELAJAR MURID

	for (const line of ministryLines) {
		doc.text(line, pageWidth / 2, currentY, { align: 'center' });
		currentY += 8; // gap lebih kecil
	}

	// Draw background logo on page 1
	if (data.showBgLogo) {
		drawBgLogo();
	}

	// ===== PAGE 2: BIODATA PAGE =====

	doc.addPage();
	currentY = margin;

	// Add top spacing
	currentY += 30;

	// Header section - "R A P O R" with letter spacing (rata tengah, font lebih besar)
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(18); // lebih besar dari 14
	doc.text('R  A  P  O  R', pageWidth / 2, currentY, { align: 'center' });
	currentY += 8;

	// Sub-header (rata tengah, font lebih besar)
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(14); // lebih besar dari 11
	doc.text('HASIL BELAJAR MURID', pageWidth / 2, currentY, { align: 'center' });
	currentY += 7;

	// School jenjang (rata tengah, font lebih besar)
	const schoolJenjang = getSchoolJenjang(data);
	if (schoolJenjang) {
		doc.setFontSize(14); // lebih besar dari 11
		doc.text(schoolJenjang, pageWidth / 2, currentY, { align: 'center' });
		currentY += 7;
	}

	currentY += 15; // gap before table

	// Biodata table - 2 column layout (label : value)
	const biodataRows = [
		{ label: 'Nama Sekolah', value: formatUpper(data.sekolah.nama) },
		{ label: 'NPSN', value: formatValue(data.sekolah.npsn) },
		{ label: 'Alamat Sekolah', value: formatValue(data.sekolah.alamat.jalan) },
		{ label: 'Kode Pos', value: formatValue(data.sekolah.alamat.kodePos) },
		{ label: 'Desa / Kelurahan', value: formatValue(data.sekolah.alamat.desa) },
		{ label: 'Kecamatan', value: formatValue(data.sekolah.alamat.kecamatan) },
		{ label: 'Kabupaten / Kota', value: formatValue(data.sekolah.alamat.kabupaten) },
		{ label: 'Provinsi', value: formatValue(data.sekolah.alamat.provinsi) },
		{ label: 'Website', value: formatValue(data.sekolah.website) },
		{ label: 'E-mail', value: formatValue(data.sekolah.email) }
	];

	const labelWidth = 60;
	const colonWidth = 5;
	const tableStartX = margin; // rata kiri dari margin

	for (const row of biodataRows) {
		// Label (left aligned, font lebih besar)
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(12); // lebih besar dari 10
		doc.text(row.label, tableStartX, currentY, { align: 'left' });

		// Colon
		doc.text(':', tableStartX + labelWidth, currentY, { align: 'left' });

		// Value (bold font for values, lebih besar)
		doc.setFont('helvetica', 'bold');
		doc.setFontSize(12); // lebih besar dari 10
		doc.text(row.value, tableStartX + labelWidth + colonWidth, currentY, { align: 'left' });

		currentY += 8; // spacing sedikit lebih besar
	}

	// Draw background logo on page 2
	if (data.showBgLogo) {
		drawBgLogo();
	}

	return doc;
}

/**
 * Download PDF for Cover Rapor
 */
export async function downloadCoverPDF(data: CoverPDFData, filename?: string): Promise<void> {
	const doc = await generateCoverPDF(data);
	const defaultFilename = `Cover_Rapor_${data.murid.nama.replace(/\s+/g, '_')}.pdf`;
	doc.save(filename ?? defaultFilename);
}
