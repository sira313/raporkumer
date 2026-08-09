import { sharedStyles } from './shared';

export interface BuktiFotoData {
	kegiatan: string;
	fotos: Array<{ src: string; nama: string }>;
}

/**
 * Renders an HTML page that lays out perjalanan dinas bukti photos for print.
 * Photos are embedded as data URLs; output is meant to be paginated by PagedJS.
 */
export function renderBuktiFotoHTML(data: BuktiFotoData): string {
	const fotoCards = data.fotos
		.map(
			(foto) => `
			<div class="foto-card">
				<img src="${foto.src}" alt="${foto.nama}" />
				<div class="foto-name">${foto.nama}</div>
			</div>`
		)
		.join('\n');

	return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="utf-8">
<style>
${sharedStyles()}

@page {
	size: A4 portrait;
	margin: 12mm;
}

body {
	font-size: 10pt;
}

.header {
	text-align: center;
	margin-bottom: 10px;
}

.header h2 {
	font-size: 13pt;
	margin-bottom: 4px;
}

.header p {
	font-size: 10pt;
	margin: 2px 0;
	color: #444;
}

.fotos {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.foto-card {
	width: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4px;
	padding: 6px;
	border: 1px solid #999;
	break-inside: avoid;
}

.foto-card img {
	width: 100%;
	max-height: 190mm;
	object-fit: contain;
}

.foto-name {
	font-size: 9pt;
	color: #333;
	text-align: center;
	word-break: break-all;
}
</style>
</head>
<body>
	<div class="header">
		<h2>Bukti Perjalanan Dinas</h2>
		<p>${data.kegiatan}</p>
	</div>
	<div class="fotos">
		${fotoCards}
	</div>
</body>
</html>`;
}
