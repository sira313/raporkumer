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

	// Draw background image if provided with opacity
	if (bgImage) {
		try {
			// Load and process image with opacity using canvas
			await new Promise<void>((resolve) => {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					console.error('[PDF] Failed to get canvas context');
					resolve();
					return;
				}

				const img = new Image();
				img.onload = () => {
					// Set canvas size to match PDF page (in pixels, approx 3.78 pixels per mm)
					canvas.width = pageWidth * 3.78;
					canvas.height = pageHeight * 3.78;

					// Fill with white background first
					ctx.fillStyle = '#FFFFFF';
					ctx.fillRect(0, 0, canvas.width, canvas.height);

					// Draw image with 30% opacity on top of white background
					ctx.globalAlpha = 0.7;
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

					// Convert canvas to data URL and add to PDF
					const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
					doc.addImage(dataUrl, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
					resolve();
				};
				img.onerror = () => {
					console.error('[PDF] Error loading background image');
					resolve();
				};
				img.src = bgImage;
			});
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
	const headerHeight = 28; // mm for header area
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

		// Jarak: tambah spacing sebelum nama sekolah
		const isBeforeLast = i === headingLines.length - 2;
		if (isBeforeLast) {
			headerTextY += 6; // jarak lebih sebelum nama sekolah
		} else if (isLast) {
			headerTextY += 5.5; // jarak setelah nama sekolah
		} else {
			headerTextY += 4.5; // jarak normal
		}
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
	}

	currentY += headerHeight;
	currentY += 2; // jarak antara kop dan border

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
	doc.setFontSize(26);
	doc.text(formatUpper(data.penghargaan.judul), centerX, currentY, { align: 'center' });
	currentY += 10;

	// Subtitle
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(14);
	doc.text(formatUpper(data.penghargaan.subjudul), centerX, currentY, { align: 'center' });
	currentY += 10;

	// Murid name (uppercase, bold)
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(21);
	doc.text(formatUpper(data.murid.nama), centerX, currentY, { align: 'center' });
	currentY += 10;

	// "Sebagai"
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(14);
	doc.text('SEBAGAI', centerX, currentY, { align: 'center' });
	currentY += 10;

	// Ranking label
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(21);
	doc.text(formatUpper(data.penghargaan.rankingLabel), centerX, currentY, { align: 'center' });
	currentY += 10;

	// Achievement text - rata kiri tapi posisi di tengah
	doc.setFontSize(13);
	const achievementWidth = 130; // max width
	const achievementStartX = (pageWidth - achievementWidth) / 2; // posisi kiri dari block di tengah

	// Split teks untuk membuat nilai rata-rata bold
	const textBefore = 'Dengan total nilai rata-rata ';
	const nilaiRataRata = data.penghargaan.rataRataFormatted;
	const textAfter = ` pada ${formatTitle(data.periode.semester)} tahun ajaran ${formatUpper(data.periode.tahunAjaran)}.`;

	// Tulis teks normal
	doc.setFont('helvetica', 'normal');
	let currentX = achievementStartX;
	doc.text(textBefore, currentX, currentY, { align: 'left' });
	currentX += doc.getTextWidth(textBefore);

	// Tulis nilai dengan bold
	doc.setFont('helvetica', 'bold');
	doc.text(nilaiRataRata, currentX, currentY, { align: 'left' });
	currentX += doc.getTextWidth(nilaiRataRata);

	// Tulis sisa teks dengan normal, handle wrapping
	doc.setFont('helvetica', 'normal');
	const remainingWidth = achievementWidth - (currentX - achievementStartX);
	const wrappedAfterText = doc.splitTextToSize(textAfter, remainingWidth);

	if (wrappedAfterText.length === 1) {
		doc.text(wrappedAfterText[0], currentX, currentY, { align: 'left' });
	} else {
		// Jika wrap, tulis baris pertama di baris saat ini
		doc.text(wrappedAfterText[0], currentX, currentY, { align: 'left' });
		currentY += 5;
		// Tulis baris berikutnya
		for (let i = 1; i < wrappedAfterText.length; i++) {
			doc.text(wrappedAfterText[i], achievementStartX, currentY, { align: 'left' });
			currentY += 5;
		}
		currentY -= 5; // adjust karena loop akan menambah lagi
	}
	currentY += 5;

	currentY += 2;

	// Motivation text - rata kiri tapi posisi di tengah
	const motivationLines = doc.splitTextToSize(data.penghargaan.motivasi, achievementWidth);
	for (const line of motivationLines) {
		doc.text(line, achievementStartX, currentY, { align: 'left' });
		currentY += 5;
	}

	// === FOOTER SECTION ===
	// Position at bottom
	const footerY = pageHeight - margin - 33;
	const col1X = margin + 60;
	const col2X = pageWidth - margin - 60;

	// Left column - Kepala Sekolah
	let leftY = footerY;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(13);
	doc.text('Mengetahui', col1X, leftY, { align: 'center' });
	leftY += 5;

	// Right column - Wali Kelas
	let rightY = footerY;

	// "Kepala" sejajar dengan tanggal
	const kepalatitlePrefix =
		data.ttd.kepalaSekolah.statusKepalaSekolah === 'plt' ? 'Plt. Kepala' : 'Kepala';
	doc.text(kepalatitlePrefix, col1X, leftY, { align: 'center' });

	const locationDate = `${formatTitle(data.ttd.tempat)}, ${data.ttd.tanggal}`;
	doc.text(locationDate, col2X, leftY, { align: 'center' });
	leftY += 5;
	rightY = leftY;

	// Nama sekolah sejajar dengan "Wali Kelas" - gunakan kapitalisasi asli dari user
	doc.text(data.sekolah.nama, col1X, leftY, { align: 'center' });

	doc.setFont('helvetica', 'bold');
	doc.text('Wali Kelas', col2X, rightY, { align: 'center' });
	leftY += 20; // space for signature
	rightY += 20;

	// Nama kepala sekolah sejajar dengan nama wali kelas
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(13);
	const kepalaName = formatValue(data.ttd.kepalaSekolah.nama);
	doc.text(kepalaName, col1X, leftY, { align: 'center' });

	// Underline nama kepala sekolah
	const kepalaNameWidth = doc.getTextWidth(kepalaName);
	doc.setLineWidth(0.3);
	doc.line(col1X - kepalaNameWidth / 2, leftY + 1, col1X + kepalaNameWidth / 2, leftY + 1);

	const waliName = formatValue(data.ttd.waliKelas.nama);
	doc.text(waliName, col2X, rightY, { align: 'center' });

	// Underline nama wali kelas
	const waliNameWidth = doc.getTextWidth(waliName);
	doc.setLineWidth(0.3);
	doc.line(col2X - waliNameWidth / 2, rightY + 1, col2X + waliNameWidth / 2, rightY + 1);

	leftY += 5;
	rightY += 5;

	// NIP sejajar
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(13);
	doc.text(formatValue(data.ttd.kepalaSekolah.nip), col1X, leftY, { align: 'center' });
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

	// Draw background image if provided with opacity
	if (bgImage) {
		try {
			// Load and process image with opacity using canvas
			await new Promise<void>((resolve) => {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');
				if (!ctx) {
					console.error('[PDF] Failed to get canvas context');
					resolve();
					return;
				}

				const img = new Image();
				img.onload = () => {
					// Set canvas size to match PDF page (in pixels, approx 3.78 pixels per mm)
					canvas.width = pageWidth * 3.78;
					canvas.height = pageHeight * 3.78;

					// Fill with white background first
					ctx.fillStyle = '#FFFFFF';
					ctx.fillRect(0, 0, canvas.width, canvas.height);

					// Draw image with 70% opacity on top of white background
					ctx.globalAlpha = 0.7;
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

					// Convert canvas to data URL and add to PDF
					const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
					doc.addImage(dataUrl, 'JPEG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
					resolve();
				};
				img.onerror = () => {
					console.error('[PDF] Error loading background image');
					resolve();
				};
				img.src = bgImage;
			});
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

	let currentY = margin + 4;

	// === HEADER: LOGOS HORIZONTAL ===
	const logoSize = 14; // Ukuran logo
	const logoGap = 3; // Gap antar logo
	const kumerHeight = 14; // Tinggi logo kumer sama dengan logo lain

	// Hitung posisi center untuk logo (estimasi lebar total)
	const estimatedTotalWidth = logoSize * 2 + 80 + logoGap * 2; // estimasi untuk centering
	let logoX = (pageWidth - estimatedTotalWidth) / 2;

	if (logoLeft) {
		doc.addImage(logoLeft, 'PNG', logoX, currentY, logoSize, logoSize, undefined, 'FAST');
		logoX += logoSize + logoGap;
	}

	if (logoRight) {
		doc.addImage(logoRight, 'PNG', logoX, currentY, logoSize, logoSize, undefined, 'FAST');
		logoX += logoSize + logoGap;
	}

	if (logoKumer) {
		// Logo kumer dengan aspect ratio proporsional (logo horizontal panjang)
		// Ratio asli logo kumer sekitar 6:1 (width:height)
		const kumerWidth = kumerHeight * 6;
		doc.addImage(logoKumer, 'PNG', logoX, currentY, kumerWidth, kumerHeight, undefined, 'FAST');
	}

	currentY += logoSize + 14; // Jarak lebih lebar lagi antara logo dan nama sekolah

	// === SCHOOL NAME ===
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(22);
	doc.text(formatUpper(data.sekolah.nama), pageWidth / 2, currentY, { align: 'center' });
	currentY += 12;

	// === MAIN TITLE ===
	doc.setFont('times', 'bold');
	doc.setFontSize(28);
	doc.text(formatUpper(data.penghargaan.judul), pageWidth / 2, currentY, { align: 'center' });
	currentY += 12;

	// Subtitle
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(14);
	doc.text(formatUpper(data.penghargaan.subjudul), pageWidth / 2, currentY, { align: 'center' });
	currentY += 12;

	// Murid name - menggunakan Times italic untuk kesan elegan seperti tegak bersambung
	doc.setFont('times', 'bolditalic');
	doc.setFontSize(24);
	doc.text(formatTitle(data.murid.nama), pageWidth / 2, currentY, { align: 'center' });
	currentY += 12;

	// "Sebagai"
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(14);
	doc.text('SEBAGAI', pageWidth / 2, currentY, { align: 'center' });
	currentY += 12;

	// Ranking label
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(21);
	doc.text(formatUpper(data.penghargaan.rankingLabel), pageWidth / 2, currentY, {
		align: 'center'
	});
	currentY += 10;

	// Achievement text - rata kiri tapi posisi di tengah
	doc.setFontSize(13);
	const achievementWidth = 130; // max width sama dengan template 1
	const achievementStartX = (pageWidth - achievementWidth) / 2;

	// Split teks untuk membuat nilai rata-rata bold
	const textBefore2 = 'Dengan total nilai rata-rata ';
	const nilaiRataRata2 = data.penghargaan.rataRataFormatted;
	const textAfter2 = ` pada ${formatTitle(data.periode.semester)} tahun ajaran ${formatUpper(data.periode.tahunAjaran)}.`;

	// Tulis teks normal
	doc.setFont('helvetica', 'normal');
	let currentX2 = achievementStartX;
	doc.text(textBefore2, currentX2, currentY, { align: 'left' });
	currentX2 += doc.getTextWidth(textBefore2);

	// Tulis nilai dengan bold
	doc.setFont('helvetica', 'bold');
	doc.text(nilaiRataRata2, currentX2, currentY, { align: 'left' });
	currentX2 += doc.getTextWidth(nilaiRataRata2);

	// Tulis sisa teks dengan normal, handle wrapping
	doc.setFont('helvetica', 'normal');
	const remainingWidth2 = achievementWidth - (currentX2 - achievementStartX);
	const wrappedAfterText2 = doc.splitTextToSize(textAfter2, remainingWidth2);

	if (wrappedAfterText2.length === 1) {
		doc.text(wrappedAfterText2[0], currentX2, currentY, { align: 'left' });
	} else {
		// Jika wrap, tulis baris pertama di baris saat ini
		doc.text(wrappedAfterText2[0], currentX2, currentY, { align: 'left' });
		currentY += 5;
		// Tulis baris berikutnya
		for (let i = 1; i < wrappedAfterText2.length; i++) {
			doc.text(wrappedAfterText2[i], achievementStartX, currentY, { align: 'left' });
			currentY += 5;
		}
		currentY -= 5; // adjust karena loop akan menambah lagi
	}
	currentY += 5;

	currentY += 2;

	// Motivation - rata kiri tapi posisi di tengah
	const motivationLines = doc.splitTextToSize(data.penghargaan.motivasi, achievementWidth);
	for (const line of motivationLines) {
		doc.text(line, achievementStartX, currentY, { align: 'left' });
		currentY += 5;
	}

	// === FOOTER ===
	const footerY = pageHeight - margin - 33;
	const col1X = margin + 60;
	const col2X = pageWidth - margin - 60;

	// Left - Kepala Sekolah
	let leftY = footerY;
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(13);
	doc.text('Mengetahui', col1X, leftY, { align: 'center' });
	leftY += 5;

	// Right - Wali Kelas
	let rightY = footerY;

	// "Kepala" sejajar dengan tanggal
	const kepalatitlePrefix =
		data.ttd.kepalaSekolah.statusKepalaSekolah === 'plt' ? 'Plt. Kepala' : 'Kepala';
	doc.text(kepalatitlePrefix, col1X, leftY, { align: 'center' });

	const locationDate = `${formatTitle(data.ttd.tempat)}, ${data.ttd.tanggal}`;
	doc.text(locationDate, col2X, leftY, { align: 'center' });
	leftY += 5;
	rightY = leftY;

	// Nama sekolah sejajar dengan "Wali Kelas" - gunakan kapitalisasi asli dari user
	doc.text(data.sekolah.nama, col1X, leftY, { align: 'center' });

	doc.setFont('helvetica', 'bold');
	doc.text('Wali Kelas', col2X, rightY, { align: 'center' });
	leftY += 20; // space for signature
	rightY += 20;

	// Nama kepala sekolah sejajar dengan nama wali kelas
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(13);
	const kepalaName = formatValue(data.ttd.kepalaSekolah.nama);
	doc.text(kepalaName, col1X, leftY, { align: 'center' });

	// Underline nama kepala sekolah
	const kepalaNameWidth = doc.getTextWidth(kepalaName);
	doc.setLineWidth(0.3);
	doc.line(col1X - kepalaNameWidth / 2, leftY + 1, col1X + kepalaNameWidth / 2, leftY + 1);

	const waliName = formatValue(data.ttd.waliKelas.nama);
	doc.text(waliName, col2X, rightY, { align: 'center' });

	// Underline nama wali kelas
	const waliNameWidth = doc.getTextWidth(waliName);
	doc.setLineWidth(0.3);
	doc.line(col2X - waliNameWidth / 2, rightY + 1, col2X + waliNameWidth / 2, rightY + 1);

	leftY += 5;
	rightY += 5;

	// NIP sejajar
	doc.setFont('helvetica', 'normal');
	doc.setFontSize(13);
	doc.text(formatValue(data.ttd.kepalaSekolah.nip), col1X, leftY, { align: 'center' });
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
