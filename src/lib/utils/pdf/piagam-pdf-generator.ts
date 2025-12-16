import jsPDF from 'jspdf';

type PiagamPDFData = {
	sekolah: {
		nama: string;
		jenjang: string | null;
		npsn: string | null;
		alamat: {
			jalan: string;
			desa: string;
			kecamatan: string;
			kabupaten: string;
			provinsi: string | null;
			kodePos: string | null;
		};
		website: string | null;
		email: string | null;
		logoUrl: string | null;
		logoDinasUrl: string | null;
	};
	murid: {
		nama: string;
	};
	penghargaan: {
		rataRata: number | null;
		rataRataFormatted: string;
		ranking: number | null;
		rankingLabel: string;
		judul: string;
		subjudul: string;
		motivasi: string;
	};
	periode: {
		semester: string;
		tahunAjaran: string;
	};
	ttd: {
		tempat: string;
		tanggal: string;
		kepalaSekolah: {
			nama: string;
			nip: string;
			statusKepalaSekolah?: string | null;
		};
		waliKelas: {
			nama: string;
			nip: string;
		};
	};
	template?: '1' | '2';
	bgImage?: string | null;
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
 * Format title case
 */
function formatTitle(value: string | null | undefined): string {
	const formatted = formatValue(value, '');
	if (!formatted) return '';
	return formatted
		.toLowerCase()
		.split(/([\s-]+)/u)
		.map((part) => {
			if (/^[\s-]+$/u.test(part)) return part;
			return part.charAt(0).toUpperCase() + part.slice(1);
		})
		.join('')
		.trim();
}

/**
 * Build school heading
 */
function buildSekolahHeading(jenjangLabel: string, sekolahNama: string): string {
	const nameUpper = sekolahNama.trim();
	const jenjangUpper = jenjangLabel.trim();
	if (!nameUpper && !jenjangUpper) return '';
	if (!jenjangUpper) return nameUpper;
	if (!nameUpper) return jenjangUpper;

	const abbreviationPattern = /^(SD|SMP|SMA|SMK|SLB|PKBM)\b/u;
	if (
		nameUpper.startsWith(jenjangUpper) ||
		nameUpper.includes(jenjangUpper) ||
		abbreviationPattern.test(nameUpper)
	) {
		return nameUpper;
	}

	return `${jenjangUpper} ${nameUpper}`.trim();
}

/**
 * Get jenjang label
 */
function getJenjangLabel(jenjang: string | null): string {
	switch (jenjang) {
		case 'sd':
			return 'SEKOLAH DASAR';
		case 'smp':
			return 'SEKOLAH MENENGAH PERTAMA';
		case 'sma':
			return 'SEKOLAH MENENGAH ATAS';
		default:
			return 'SEKOLAH';
	}
}

/**
 * Generate Piagam PDF - Template 1
 */
async function generateTemplate1PDF(data: PiagamPDFData, bgImage: string | null): Promise<jsPDF> {
	const doc = new jsPDF({
		orientation: 'landscape',
		unit: 'mm',
		format: 'a4'
	});

	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 16;

	// Draw background image if provided
	if (bgImage) {
		try {
			doc.addImage(bgImage, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');

			// Add white overlay with 30% opacity
			doc.setFillColor(255, 255, 255);
			doc.setGState({ opacity: 0.3 });
			doc.rect(0, 0, pageWidth, pageHeight, 'F');
			doc.setGState({ opacity: 1.0 });
		} catch (error) {
			console.error('[PDF] Error adding background:', error);
		}
	}

	// Load logos
	let logoLeft: string | null = null;
	let logoRight: string | null = null;

	if (data.sekolah.logoDinasUrl) {
		try {
			const response = await fetch(data.sekolah.logoDinasUrl);
			const blob = await response.blob();
			logoLeft = await new Promise<string>((resolve) => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result as string);
				reader.readAsDataURL(blob);
			});
		} catch (error) {
			console.error('[PDF] Error loading logo dinas:', error);
		}
	}

	if (data.sekolah.logoUrl) {
		try {
			const response = await fetch(data.sekolah.logoUrl);
			const blob = await response.blob();
			logoRight = await new Promise<string>((resolve) => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result as string);
				reader.readAsDataURL(blob);
			});
		} catch (error) {
			console.error('[PDF] Error loading logo sekolah:', error);
		}
	}

	// Fallback logos
	if (!logoLeft) logoLeft = '/garudaPancasila.png';
	if (!logoRight) logoRight = '/tutwuri-bw.png';

	let currentY = margin;

	// === HEADER SECTION ===
	const headerHeight = 32; // mm for header area
	const logoSize = 20; // 80px ≈ 20mm
	const logoY = currentY;

	// Logo Left
	if (logoLeft) {
		const logoLeftX = margin;
		doc.addImage(logoLeft, 'PNG', logoLeftX, logoY, logoSize, logoSize, undefined, 'FAST');
	}

	// Logo Right
	if (logoRight) {
		const logoRightX = pageWidth - margin - logoSize;
		doc.addImage(logoRight, 'PNG', logoRightX, logoY, logoSize, logoSize, undefined, 'FAST');
	}

	// Header text (center)
	const headerTextX = pageWidth / 2;
	let headerTextY = currentY + 3;

	// Build header lines
	const kabupaten = formatUpper(data.sekolah.alamat.kabupaten, '');
	const kecamatan = formatUpper(data.sekolah.alamat.kecamatan, '');
	const jenjangLabel = getJenjangLabel(data.sekolah.jenjang);
	const sekolahNama = formatUpper(data.sekolah.nama);

	const headingLines: string[] = [];
	if (kabupaten) headingLines.push(`PEMERINTAH ${kabupaten}`);
	headingLines.push('DINAS PENDIDIKAN DAN KEBUDAYAAN');
	if (kecamatan) headingLines.push(`KOORDINATOR WILAYAH ${kecamatan}`);
	if (sekolahNama) {
		const heading = buildSekolahHeading(jenjangLabel, sekolahNama);
		if (heading) headingLines.push(heading);
	}

	doc.setFont('helvetica', 'bold');
	for (let i = 0; i < headingLines.length; i++) {
		const line = headingLines[i];
		const isLast = i === headingLines.length - 1;
		const isFirst = i === 0;

		if (isLast) {
			doc.setFontSize(14); // text-lg = 14pt
		} else if (isFirst) {
			doc.setFontSize(11); // text-sm = 11pt
		} else {
			doc.setFontSize(11);
		}

		doc.text(line, headerTextX, headerTextY, { align: 'center' });
		headerTextY += 4.5; // jarak sama untuk semua baris
	}

	// Info lines (alamat, contact)
	const alamatParts: string[] = [];
	const jalan = formatTitle(data.sekolah.alamat.jalan);
	const desaValue = formatTitle(data.sekolah.alamat.desa);
	const kecamatanValue = formatTitle(data.sekolah.alamat.kecamatan);
	if (jalan) alamatParts.push(`Alamat: ${jalan}`);
	if (desaValue) alamatParts.push(`Desa ${desaValue}`);
	if (kecamatanValue) alamatParts.push(`Kecamatan ${kecamatanValue}`);

	const kodePos = formatValue(data.sekolah.alamat.kodePos, '');
	if (kodePos) alamatParts.push(`Kode POS: ${kodePos}.`);

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(9);
	if (alamatParts.length > 0) {
		doc.text(alamatParts.join(', '), headerTextX, headerTextY, { align: 'center' });
		headerTextY += 4;
	}

	// Contact info
	const contactParts: string[] = [];
	if (data.sekolah.npsn) contactParts.push(`NPSN: ${data.sekolah.npsn}`);
	if (data.sekolah.website) contactParts.push(`Website: ${data.sekolah.website}`);
	if (data.sekolah.email) contactParts.push(`Email: ${data.sekolah.email}`);

	doc.setFont('helvetica', 'italic');
	doc.setFontSize(8);
	if (contactParts.length > 0) {
		doc.text(contactParts.join('  '), headerTextX, headerTextY, { align: 'center' });
		headerTextY += 3;
	}

	currentY += headerHeight;

	// Double line separator
	doc.setDrawColor(0, 0, 0);
	doc.setLineWidth(0.5);
	doc.line(margin, currentY, pageWidth - margin, currentY);
	currentY += 0.5;
	doc.setLineWidth(0.2);
	doc.line(margin, currentY, pageWidth - margin, currentY);
	currentY += 15;

	// === MAIN CONTENT ===
	const centerX = pageWidth / 2;

	// Title
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(20); // text-2xl
	doc.text(formatUpper(data.penghargaan.judul), centerX, currentY, { align: 'center' });
	currentY += 8;

	// Subtitle
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(11);
	doc.text(formatUpper(data.penghargaan.subjudul), centerX, currentY, { align: 'center' });
	currentY += 8;

	// Murid name (uppercase, bold)
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(16);
	doc.text(formatUpper(data.murid.nama), centerX, currentY, { align: 'center' });
	currentY += 8;

	// "Sebagai"
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(11);
	doc.text('SEBAGAI', centerX, currentY, { align: 'center' });
	currentY += 8;

	// Ranking label
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(16);
	doc.text(formatUpper(data.penghargaan.rankingLabel), centerX, currentY, { align: 'center' });
	currentY += 8;

	// Achievement text - rata kiri tapi posisi di tengah
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	const achievementText = `Dengan total nilai rata-rata ${data.penghargaan.rataRataFormatted} pada ${formatTitle(data.periode.semester)} tahun ajaran ${formatUpper(data.periode.tahunAjaran)}.`;
	const achievementWidth = 130; // max width
	const achievementLines = doc.splitTextToSize(achievementText, achievementWidth);
	const achievementStartX = (pageWidth - achievementWidth) / 2; // posisi kiri dari block di tengah
	for (const line of achievementLines) {
		doc.text(line, achievementStartX, currentY, { align: 'left' });
		currentY += 5;
	}

	currentY += 2;

	// Motivation text - rata kiri tapi posisi di tengah
	const motivationLines = doc.splitTextToSize(data.penghargaan.motivasi, achievementWidth);
	for (const line of motivationLines) {
		doc.text(line, achievementStartX, currentY, { align: 'left' });
		currentY += 5;
	}

	// === FOOTER SECTION ===
	// Position at bottom
	const footerY = pageHeight - margin - 28;
	const col1X = margin + 60;
	const col2X = pageWidth - margin - 60;

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(10);

	// Left column - Kepala Sekolah
	let leftY = footerY;
	doc.text('Mengetahui', col1X, leftY, { align: 'center' });
	leftY += 4;

	const kepalaTitle =
		data.ttd.kepalaSekolah.statusKepalaSekolah === 'plt'
			? `Plt. Kepala ${formatTitle(data.sekolah.nama)}`
			: `Kepala ${formatTitle(data.sekolah.nama)}`;
	doc.setFont('helvetica', 'normal');
	doc.text(kepalaTitle, col1X, leftY, { align: 'center' });
	leftY += 16; // space for signature

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(10);
	doc.text(formatValue(data.ttd.kepalaSekolah.nama), col1X, leftY, { align: 'center' });
	leftY += 4;

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	doc.text(formatValue(data.ttd.kepalaSekolah.nip), col1X, leftY, { align: 'center' });

	// Right column - Wali Kelas
	let rightY = footerY;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	const locationDate = `${formatTitle(data.ttd.tempat)}, ${data.ttd.tanggal}`;
	doc.text(locationDate, col2X, rightY, { align: 'center' });
	rightY += 4;

	doc.setFont('helvetica', 'bold');
	doc.text('Wali Kelas', col2X, rightY, { align: 'center' });
	rightY += 16;

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(10);
	doc.text(formatValue(data.ttd.waliKelas.nama), col2X, rightY, { align: 'center' });
	rightY += 4;

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	doc.text(formatValue(data.ttd.waliKelas.nip), col2X, rightY, { align: 'center' });

	return doc;
}

/**
 * Generate Piagam PDF - Template 2
 */
async function generateTemplate2PDF(data: PiagamPDFData, bgImage: string | null): Promise<jsPDF> {
	const doc = new jsPDF({
		orientation: 'landscape',
		unit: 'mm',
		format: 'a4'
	});

	const pageWidth = doc.internal.pageSize.getWidth();
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 14;

	// Draw background image if provided
	if (bgImage) {
		try {
			doc.addImage(bgImage, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
		} catch (error) {
			console.error('[PDF] Error adding background:', error);
		}
	}

	// Load logos
	let logoLeft: string | null = null;
	let logoRight: string | null = null;
	let logoKumer: string | null = null;

	if (data.sekolah.logoDinasUrl) {
		try {
			const response = await fetch(data.sekolah.logoDinasUrl);
			const blob = await response.blob();
			logoLeft = await new Promise<string>((resolve) => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result as string);
				reader.readAsDataURL(blob);
			});
		} catch (error) {
			console.error('[PDF] Error loading logo dinas:', error);
		}
	}

	if (data.sekolah.logoUrl) {
		try {
			const response = await fetch(data.sekolah.logoUrl);
			const blob = await response.blob();
			logoRight = await new Promise<string>((resolve) => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result as string);
				reader.readAsDataURL(blob);
			});
		} catch (error) {
			console.error('[PDF] Error loading logo sekolah:', error);
		}
	}

	// Load logo kumer
	try {
		const response = await fetch('/logo-kumer.png');
		const blob = await response.blob();
		logoKumer = await new Promise<string>((resolve) => {
			const reader = new FileReader();
			reader.onloadend = () => resolve(reader.result as string);
			reader.readAsDataURL(blob);
		});
	} catch (error) {
		console.error('[PDF] Error loading logo kumer:', error);
	}

	// Fallback logos
	if (!logoLeft) logoLeft = '/garudaPancasila.png';
	if (!logoRight) logoRight = '/tutwuri-bw.png';

	let currentY = margin + 1;

	// === HEADER: LOGOS HORIZONTAL ===
	const logoSize = 14; // h-14 = 14mm
	const logoGap = 1; // small gap
	const totalLogoWidth = logoSize * 3 + logoGap * 2;
	let logoX = (pageWidth - totalLogoWidth) / 2;

	if (logoLeft) {
		doc.addImage(logoLeft, 'PNG', logoX, currentY, logoSize, logoSize, undefined, 'FAST');
		logoX += logoSize + logoGap;
	}

	if (logoRight) {
		doc.addImage(logoRight, 'PNG', logoX, currentY, logoSize, logoSize, undefined, 'FAST');
		logoX += logoSize + logoGap;
	}

	if (logoKumer) {
		// Logo kumer slightly larger (h-16 = 16mm)
		const kumerSize = 16;
		doc.addImage(logoKumer, 'PNG', logoX, currentY - 1, kumerSize, kumerSize, undefined, 'FAST');
	}

	currentY += logoSize + 4;

	// === SCHOOL NAME ===
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(24); // text-3xl
	doc.text(formatUpper(data.sekolah.nama), pageWidth / 2, currentY, { align: 'center' });
	currentY += 10;

	// === MAIN TITLE ===
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(24);
	doc.text(formatUpper(data.penghargaan.judul), pageWidth / 2, currentY, { align: 'center' });
	currentY += 10;

	// Subtitle
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(14);
	doc.text(data.penghargaan.subjudul, pageWidth / 2, currentY, { align: 'center' });
	currentY += 8;

	// Murid name (title case, not cursive since PDF doesn't support custom fonts easily)
	doc.setFont('helvetica', 'bolditalic');
	doc.setFontSize(36); // text-5xl
	doc.text(formatTitle(data.murid.nama), pageWidth / 2, currentY, { align: 'center' });
	currentY += 12;

	// "Sebagai"
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(14);
	doc.text('Sebagai', pageWidth / 2, currentY, { align: 'center' });
	currentY += 6;

	// Ranking label
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(16);
	doc.text(formatUpper(data.penghargaan.rankingLabel), pageWidth / 2, currentY, {
		align: 'center'
	});
	currentY += 8;

	// Achievement text - rata kiri tapi posisi di tengah
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	const achievementText = `Dengan total nilai rata-rata ${data.penghargaan.rataRataFormatted} pada ${formatTitle(data.periode.semester)} tahun ajaran ${formatUpper(data.periode.tahunAjaran)}.`;
	const achievementWidth = 130; // max width
	const achievementLines = doc.splitTextToSize(achievementText, achievementWidth);
	const achievementStartX = (pageWidth - achievementWidth) / 2; // posisi kiri dari block di tengah
	for (const line of achievementLines) {
		doc.text(line, achievementStartX, currentY, { align: 'left' });
		currentY += 5;
	}

	currentY += 2;

	// Motivation - rata kiri tapi posisi di tengah
	const motivationLines = doc.splitTextToSize(data.penghargaan.motivasi, achievementWidth);
	for (const line of motivationLines) {
		doc.text(line, achievementStartX, currentY, { align: 'left' });
		currentY += 5;
	}

	// === FOOTER ===
	const footerY = pageHeight - margin - 26;
	const col1X = margin + 60;
	const col2X = pageWidth - margin - 60;

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(10);

	// Left - Kepala Sekolah
	let leftY = footerY;
	doc.text('Mengetahui', col1X, leftY, { align: 'center' });
	leftY += 4;

	const kepalaTitle =
		data.ttd.kepalaSekolah.statusKepalaSekolah === 'plt'
			? `Plt. Kepala ${formatTitle(data.sekolah.nama)}`
			: `Kepala ${formatTitle(data.sekolah.nama)}`;
	doc.setFont('helvetica', 'normal');
	doc.text(kepalaTitle, col1X, leftY, { align: 'center' });
	leftY += 16;

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(10);
	doc.text(formatValue(data.ttd.kepalaSekolah.nama), col1X, leftY, { align: 'center' });
	leftY += 4;

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	doc.text(formatValue(data.ttd.kepalaSekolah.nip), col1X, leftY, { align: 'center' });

	// Right - Wali Kelas
	let rightY = footerY;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	const locationDate = `${formatTitle(data.ttd.tempat)}, ${data.ttd.tanggal}`;
	doc.text(locationDate, col2X, rightY, { align: 'center' });
	rightY += 4;

	doc.setFont('helvetica', 'bold');
	doc.text('Wali Kelas', col2X, rightY, { align: 'center' });
	rightY += 16;

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(10);
	doc.text(formatValue(data.ttd.waliKelas.nama), col2X, rightY, { align: 'center' });
	rightY += 4;

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	doc.text(formatValue(data.ttd.waliKelas.nip), col2X, rightY, { align: 'center' });

	return doc;
}

/**
 * Generate Piagam PDF (selects template)
 */
export async function generatePiagamPDF(data: PiagamPDFData): Promise<jsPDF> {
	const template = data.template || '1';

	// Load background image if provided
	let bgImage: string | null = data.bgImage || null;
	if (!bgImage) {
		try {
			const response = await fetch(`/api/sekolah/piagam-bg/${template}`);
			const blob = await response.blob();
			bgImage = await new Promise<string>((resolve) => {
				const reader = new FileReader();
				reader.onloadend = () => resolve(reader.result as string);
				reader.readAsDataURL(blob);
			});
		} catch (error) {
			console.error('[PDF] Error loading background:', error);
		}
	}

	if (template === '2') {
		return generateTemplate2PDF(data, bgImage);
	} else {
		return generateTemplate1PDF(data, bgImage);
	}
}

/**
 * Download PDF for Piagam
 */
export async function downloadPiagamPDF(data: PiagamPDFData, filename?: string): Promise<void> {
	const doc = await generatePiagamPDF(data);
	const defaultFilename = `Piagam_${data.murid.nama.replace(/\s+/g, '_')}.pdf`;
	doc.save(filename ?? defaultFilename);
}
