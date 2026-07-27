import { sharedStyles, formatValue } from './shared';

export interface BukuTamuPrintData {
	sekolah: {
		nama: string;
	};
	periode: {
		tanggalMulai: string;
		tanggalSelesai: string;
	};
	rows: Array<{
		no: number;
		tanggal: string;
		nama: string;
		asalInstansi: string;
		nip: string;
		keperluan: string;
		pesanKesan: string;
		tandaTangan: string;
	}>;
	totalKunjungan: number;
}

export function renderBukuTamuHTML(data: BukuTamuPrintData): string {
	const rows = data.rows ?? [];

	const tableRows = rows
		.map(
			(row, i) => `
		<tr${i % 2 === 1 ? ' class="striped"' : ''}>
			<td class="text-center">${row.no}</td>
			<td>${formatValue(row.tanggal)}</td>
			<td>${formatValue(row.nama)}</td>
			<td>${formatValue(row.asalInstansi)}</td>
			<td>${formatValue(row.nip)}</td>
			<td>${formatValue(row.keperluan)}</td>
			<td>${formatValue(row.pesanKesan)}</td>
			<td class="sig-cell">${row.tandaTangan ? `<img src="${row.tandaTangan}" class="sig-img" />` : ''}</td>
		</tr>`
		)
		.join('');

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
${sharedStyles()}

@page {
	size: A4 landscape;
	margin: 15mm;
}

body {
	font-size: 10pt;
}

.header {
	text-align: center;
	margin-bottom: 12px;
}

.header h2 {
	font-size: 14pt;
	margin-bottom: 4px;
}

.header p {
	font-size: 10pt;
	margin: 2px 0;
	color: #444;
}

.filter-info {
	margin-bottom: 10px;
	font-size: 9pt;
	color: #555;
}

table {
	width: 100%;
	border-collapse: collapse;
	font-size: 9pt;
}

table, th, td {
	border: 1px solid #333;
}

th {
	background-color: #e0e0e0;
	font-weight: bold;
	text-align: center;
	padding: 5px 4px;
	font-size: 8.5pt;
}

td {
	padding: 4px;
	vertical-align: top;
}

tr.striped td {
	background-color: #f5f5f5;
}

.text-center {
	text-align: center;
}

.footer-info {
	margin-top: 12pt;
	font-size: 9pt;
	color: #555;
}

.sig-cell {
	text-align: center;
	vertical-align: middle;
}

.sig-img {
	max-height: 40px;
	max-width: 100%;
	object-fit: contain;
}
</style>
</head>
<body>
	<div class="header">
		<h2>BUKU TAMU</h2>
		<p><strong>${formatValue(data.sekolah.nama)}</strong></p>
		<p>Periode: ${formatValue(data.periode.tanggalMulai)} s.d. ${formatValue(data.periode.tanggalSelesai)}</p>
	</div>

	<div class="filter-info">
		<strong>Total Kunjungan:</strong> ${data.totalKunjungan}
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 4%;">No</th>
				<th style="width: 11%;">Tanggal</th>
				<th style="width: 13%;">Nama</th>
				<th style="width: 13%;">Asal/Instansi</th>
				<th style="width: 10%;">NIP</th>
				<th style="width: 18%;">Keperluan</th>
				<th style="width: 19%;">Pesan & Kesan</th>
				<th style="width: 12%;">Tanda Tangan</th>
			</tr>
		</thead>
		<tbody>
			${tableRows || '<tr><td colspan="8" class="text-center" style="padding:20px;">Tidak ada data kunjungan</td></tr>'}
		</tbody>
	</table>
</body>
</html>`;
}
