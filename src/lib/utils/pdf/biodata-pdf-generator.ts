import jsPDF from 'jspdf';

type BiodataPDFData = {
	sekolah: {
		nama: string;
		logoUrl: string | null;
		statusKepalaSekolah?: string | null;
	};
	murid: {
		id: number;
		foto: string | null;
		nama: string;
		nis: string | null;
		nisn: string | null;
		tempatLahir: string | null;
		tanggalLahir: string;
		jenisKelamin: string;
		agama: string | null;
		pendidikanSebelumnya: string | null;
		alamat: {
			jalan: string;
			kelurahan: string;
			kecamatan: string;
			kabupaten: string;
			provinsi: string;
		};
	};
	orangTua: {
		ayah: {
			nama: string;
			pekerjaan: string;
		};
		ibu: {
			nama: string;
			pekerjaan: string;
		};
		alamat: {
			jalan: string;
			kelurahan: string;
			kecamatan: string;
			kabupaten: string;
			provinsi: string;
		};
	};
	wali: {
		nama: string;
		pekerjaan: string;
		alamat: string;
	};
	ttd: {
		tempat: string;
		tanggal: string;
		kepalaSekolah: string;
		nip: string;
	};
	showBgLogo?: boolean;
};

/**
 * Format value with fallback
 */
function formatValue(value: string | null | undefined, fallback = '—'): string {
	if (!value || value.trim() === '') return fallback;
	return value;
}

/**
 * Format to uppercase
 */
function formatUpper(value: string | null | undefined, fallback = '—'): string {
	const formatted = formatValue(value, fallback);
	if (formatted === fallback) return formatted;
	return formatted.toUpperCase();
}

/**
 * Format tempat/tanggal lahir
 */
function combinePlaceDate(
	place: string | null | undefined,
	date: string | null | undefined
): string {
	const p = formatValue(place, '');
	const d = formatValue(date, '');
	if (!p && !d) return '—';
	if (!p) return d;
	if (!d) return p;
	return `${p}, ${d}`;
}

/**
 * Format murid alamat (single line)
 */
function formatMuridAlamat(alamat: BiodataPDFData['murid']['alamat'] | null | undefined): string {
	if (!alamat) return '—';
	const parts = [
		alamat.jalan,
		alamat.kelurahan,
		alamat.kecamatan,
		alamat.kabupaten,
		alamat.provinsi
	].filter((x) => x && x.trim());
	if (parts.length === 0) return '—';
	return parts.join(', ');
}

/**
 * Generate Biodata PDF
 */
export async function generateBiodataPDF(data: BiodataPDFData): Promise<jsPDF> {
	const doc = new jsPDF({
		orientation: 'portrait',
		unit: 'mm',
		format: 'a4'
	});

	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 20;
	const contentWidth = pageWidth - 2 * margin;

	let logoImage: string | null = null;
	if (data.sekolah.logoUrl) {
		try {
			const response = await fetch(data.sekolah.logoUrl);
			const blob = await response.blob();
			logoImage = await new Promise<string>((resolve) => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result as string);
				reader.readAsDataURL(blob);
			});
		} catch (error) {
			console.error('[PDF] Error loading logo:', error);
		}
	}

	// Draw background logo with opacity (jika showBgLogo = true)
	function drawBgLogo() {
		if (!logoImage) return;

		const bgLogoSize = pageWidth * 0.45;
		const bgLogoX = (pageWidth - bgLogoSize) / 2;
		const bgLogoY = (pageHeight - bgLogoSize) / 2;

		// Create a canvas to manipulate opacity
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const img = new Image();
		img.src = logoImage;

		canvas.width = bgLogoSize * 10;
		canvas.height = bgLogoSize * 10;
		ctx.globalAlpha = 0.15;
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

		const transparentImage = canvas.toDataURL('image/png');
		doc.addImage(
			transparentImage,
			'PNG',
			bgLogoX,
			bgLogoY,
			bgLogoSize,
			bgLogoSize,
			undefined,
			'FAST'
		);
	}

	let currentY = margin;

	// Add minimal top spacing - rata atas
	currentY += 10;

	// Header - IDENTITAS MURID (text-2xl = 18pt, bold, center)
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(18);
	doc.text('IDENTITAS MURID', pageWidth / 2, currentY, { align: 'center' });
	currentY += 6;

	// Nama Sekolah (text-sm = 10pt, normal, center)
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	doc.text(formatUpper(data.sekolah.nama), pageWidth / 2, currentY, { align: 'center' });
	currentY += 12; // gap before table

	// Identity Table - menggunakan format numbered list
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10); // text-[13px] ≈ 10pt

	const numberWidth = 7; // 1.75rem ≈ 7mm
	const labelWidth = 58; // 220px ≈ 58mm
	const colonWidth = 3; // 0.75rem ≈ 3mm
	const tableStartX = margin;

	// Helper untuk render row
	type RowData = {
		number: string;
		label: string;
		value: string;
		bold?: boolean;
		uppercase?: boolean;
		indent?: boolean;
	};

	function renderRow(row: RowData) {
		const { number, label, value, bold = false, uppercase = false, indent = false } = row;

		const xNumber = tableStartX;
		const xLabel = indent ? tableStartX + numberWidth : tableStartX + numberWidth;
		const xColon = tableStartX + numberWidth + labelWidth;
		const xValue = xColon + colonWidth;

		// Number
		doc.setFont('helvetica', 'normal');
		doc.text(number, xNumber, currentY, { align: 'left' });

		// Label
		doc.setFont('helvetica', 'normal');
		doc.text(label, xLabel, currentY, { align: 'left' });

		// Colon
		if (value) {
			doc.text(':', xColon, currentY, { align: 'left' });

			// Value - dengan text wrapping untuk nilai panjang
			doc.setFont('helvetica', bold ? 'bold' : 'normal');
			const displayValue = uppercase ? value.toUpperCase() : value;

			// Max width untuk value (sisa halaman - margins)
			const maxValueWidth = contentWidth - (numberWidth + labelWidth + colonWidth);

			// Split text jika terlalu panjang
			const lines = doc.splitTextToSize(displayValue, maxValueWidth);

			// Render baris pertama di posisi currentY
			doc.text(lines[0], xValue, currentY, { align: 'left' });

			// Render baris berikutnya (jika ada) dengan indent
			for (let i = 1; i < lines.length; i++) {
				currentY += 5;
				doc.text(lines[i], xValue, currentY, { align: 'left' });
			}
		}

		currentY += 5; // line spacing (leading-relaxed)
	}

	// 1. Nama Murid
	renderRow({
		number: '1.',
		label: 'Nama Murid',
		value: formatUpper(data.murid.nama),
		bold: true,
		uppercase: true
	});

	// 2. NIS / NISN
	renderRow({
		number: '2.',
		label: 'NIS / NISN',
		value: `${formatValue(data.murid.nis)} / ${formatValue(data.murid.nisn)}`,
		bold: true
	});

	// 3. Tempat / Tanggal Lahir
	renderRow({
		number: '3.',
		label: 'Tempat / Tanggal Lahir',
		value: combinePlaceDate(data.murid.tempatLahir, data.murid.tanggalLahir),
		bold: true
	});

	// 4. Jenis Kelamin
	renderRow({
		number: '4.',
		label: 'Jenis Kelamin',
		value: formatValue(data.murid.jenisKelamin),
		bold: true
	});

	// 5. Agama
	renderRow({
		number: '5.',
		label: 'Agama',
		value: formatValue(data.murid.agama),
		bold: true
	});

	// 6. Pendidikan Sebelumnya
	const pendidikanSebelumnya = (() => {
		const value = formatValue(data.murid.pendidikanSebelumnya);
		if (value === '—') return value;
		return value.trim().toLowerCase() === 'belum diisi' ? '-' : value;
	})();
	renderRow({
		number: '6.',
		label: 'Pendidikan Sebelumnya',
		value: pendidikanSebelumnya,
		bold: true
	});

	// 7. Alamat Murid
	renderRow({
		number: '7.',
		label: 'Alamat Murid',
		value: formatMuridAlamat(data.murid.alamat),
		bold: true
	});

	// 8. Nama Orang Tua
	renderRow({
		number: '8.',
		label: 'Nama Orang Tua',
		value: ''
	});

	renderRow({
		number: '',
		label: 'Ayah',
		value: formatUpper(data.orangTua.ayah.nama),
		bold: true,
		uppercase: true,
		indent: true
	});

	renderRow({
		number: '',
		label: 'Ibu',
		value: formatUpper(data.orangTua.ibu.nama),
		bold: true,
		uppercase: true,
		indent: true
	});

	// 9. Pekerjaan Orang Tua
	renderRow({
		number: '9.',
		label: 'Pekerjaan Orang Tua',
		value: ''
	});

	renderRow({
		number: '',
		label: 'Ayah',
		value: formatValue(data.orangTua.ayah.pekerjaan),
		bold: true,
		indent: true
	});

	renderRow({
		number: '',
		label: 'Ibu',
		value: formatValue(data.orangTua.ibu.pekerjaan),
		bold: true,
		indent: true
	});

	// 10. Alamat Orang Tua
	renderRow({
		number: '10.',
		label: 'Alamat Orang Tua',
		value: ''
	});

	renderRow({
		number: '',
		label: 'Jalan',
		value: formatValue(data.orangTua.alamat.jalan),
		bold: true,
		indent: true
	});

	renderRow({
		number: '',
		label: 'Kelurahan/Desa',
		value: formatValue(data.orangTua.alamat.kelurahan),
		bold: true,
		indent: true
	});

	renderRow({
		number: '',
		label: 'Kecamatan',
		value: formatValue(data.orangTua.alamat.kecamatan),
		bold: true,
		indent: true
	});

	renderRow({
		number: '',
		label: 'Kabupaten/Kota',
		value: formatValue(data.orangTua.alamat.kabupaten),
		bold: true,
		indent: true
	});

	renderRow({
		number: '',
		label: 'Provinsi',
		value: formatValue(data.orangTua.alamat.provinsi, '-'),
		bold: true,
		indent: true
	});

	// 11. Wali Murid
	renderRow({
		number: '11.',
		label: 'Wali Murid',
		value: ''
	});

	renderRow({
		number: '',
		label: 'Nama Wali',
		value: formatUpper(data.wali.nama, '-'),
		bold: true,
		uppercase: true,
		indent: true
	});

	renderRow({
		number: '',
		label: 'Pekerjaan Wali',
		value: formatValue(data.wali.pekerjaan, '-'),
		bold: true,
		indent: true
	});

	renderRow({
		number: '',
		label: 'Alamat Wali',
		value: formatValue(data.wali.alamat, '-'),
		bold: true,
		indent: true
	});

	// Footer - Pas Foto + TTD (keduanya di sebelah kanan, berdampingan)
	currentY += 24; // spacing before footer

	// Footer layout: foto dan ttd berdampingan di sebelah kanan
	const pasFotoWidth = 30; // 30mm
	const pasFotoHeight = 40; // 40mm
	const ttdWidth = 60; // 60mm untuk area TTD
	const footerGap = 4; // gap antara foto dan TTD (dikurangi)
	const totalFooterWidth = pasFotoWidth + footerGap + ttdWidth;

	// Align ke kanan
	const pasFotoX = pageWidth - margin - totalFooterWidth;
	const pasFotoY = currentY;

	// Pas Foto Box (border dihapus)
	// doc.setDrawColor(0, 0, 0);
	// doc.setLineWidth(0.3);
	// doc.rect(pasFotoX, pasFotoY, pasFotoWidth, pasFotoHeight);

	// Try to load murid photo
	let muridPhoto: string | null = null;
	if (data.murid.foto) {
		const photoSrc = (() => {
			const f = data.murid.foto;
			if (f.startsWith('http') || f.startsWith('data:') || f.startsWith('/')) return f;
			return `/api/murid-photo/${data.murid.id}?v=${encodeURIComponent(f)}`;
		})();

		try {
			const response = await fetch(photoSrc);
			const blob = await response.blob();
			muridPhoto = await new Promise<string>((resolve) => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result as string);
				reader.readAsDataURL(blob);
			});
		} catch (error) {
			console.error('[PDF] Error loading murid photo:', error);
		}
	}

	if (muridPhoto) {
		doc.addImage(
			muridPhoto,
			'JPEG',
			pasFotoX,
			pasFotoY,
			pasFotoWidth,
			pasFotoHeight,
			undefined,
			'FAST'
		);
	} else {
		// Placeholder dengan border 3x4 cm
		doc.setDrawColor(0, 0, 0);
		doc.setLineWidth(0.3);
		doc.rect(pasFotoX, pasFotoY, pasFotoWidth, pasFotoHeight);

		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);
		doc.text('PAS FOTO', pasFotoX + pasFotoWidth / 2, pasFotoY + pasFotoHeight / 2 - 2, {
			align: 'center'
		});
		doc.text('3 x 4', pasFotoX + pasFotoWidth / 2, pasFotoY + pasFotoHeight / 2 + 2, {
			align: 'center'
		});
	}

	// TTD Section (sebelah kanan foto) - sejajar dengan foto
	const ttdX = pasFotoX + pasFotoWidth + footerGap;

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);

	// Tempat, Tanggal - sedikit turun dari border top foto (offset 3mm)
	let ttdY = pasFotoY + 3;
	doc.text(`${formatValue(data.ttd.tempat)}, ${formatValue(data.ttd.tanggal)}`, ttdX, ttdY, {
		align: 'left'
	});
	ttdY += 5;

	// Kepala Sekolah / Plt. Kepala Sekolah
	const kepalaSekolahTitle =
		data.sekolah.statusKepalaSekolah === 'plt' ? 'Plt. Kepala Sekolah' : 'Kepala Sekolah';
	doc.text(kepalaSekolahTitle, ttdX, ttdY, { align: 'left' });

	// Hitung posisi untuk nama dan NIP agar NIP sejajar dengan bawah foto
	// pasFotoHeight = 40mm, NIP harus di pasFotoY + 40mm
	// Working backwards: NIP position = pasFotoY + pasFotoHeight
	// Nama position = NIP position - 4mm (spacing)
	// Signature space = Nama position - current ttdY - 5mm (after "Kepala Sekolah")
	const nipY = pasFotoY + pasFotoHeight;
	const namaY = nipY - 4;

	// Nama Kepala Sekolah (bold) - positioned relative to bottom
	doc.setFont('helvetica', 'bold');
	doc.text(formatValue(data.ttd.kepalaSekolah), ttdX, namaY, { align: 'left' });

	// NIP (normal) - sejajar dengan bawah foto
	doc.setFont('helvetica', 'normal');
	doc.text(formatValue(data.ttd.nip), ttdX, nipY, { align: 'left' });

	// Draw background logo
	if (data.showBgLogo) {
		drawBgLogo();
	}

	return doc;
}

/**
 * Download PDF for Biodata
 */
export async function downloadBiodataPDF(data: BiodataPDFData, filename?: string): Promise<void> {
	const doc = await generateBiodataPDF(data);
	const defaultFilename = `Biodata_${data.murid.nama.replace(/\s+/g, '_')}.pdf`;
	doc.save(filename ?? defaultFilename);
}
