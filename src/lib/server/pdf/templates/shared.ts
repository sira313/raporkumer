import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let tutwuriBwDataUri: string | null = null;
let tutwuriBwChecked = false;

export function getTutwuriBwDataUri(): string {
	if (tutwuriBwChecked) return tutwuriBwDataUri ?? '';
	tutwuriBwChecked = true;
	try {
		const buf = readFileSync(resolve('static/tutwuri-bw.png'));
		tutwuriBwDataUri = `data:image/png;base64,${buf.toString('base64')}`;
	} catch {
		tutwuriBwDataUri = '';
	}
	return tutwuriBwDataUri;
}

export function sharedStyles(): string {
	return `
* {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
}

@page {
	size: A4 portrait;
	margin: 20mm;
}

html, body {
	height: 100%;
}

body {
	font-family: Helvetica, Arial, sans-serif;
	font-size: 12pt;
	color: #000;
	line-height: 1.4;
}

.page-break {
	page-break-before: always;
}

.text-center { text-align: center; }
.text-left { text-align: left; }
.text-right { text-align: right; }

.font-bold { font-weight: bold; }
.font-normal { font-weight: normal; }
.uppercase { text-transform: uppercase; }

table {
	border-collapse: collapse;
	width: 100%;
}

.watermark {
	position: fixed;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	opacity: 0.12;
	width: 45%;
	pointer-events: none;
	z-index: -1;
}

@media print {
	.watermark { position: fixed; }
}
`;
}

export const FALLBACK = '\u2014';

// Escape a string for safe interpolation into an HTML template. Used before any
// user-supplied text is placed into a template's text node or a double-quoted
// attribute, preventing stored-HTML injection.
export function escHtml(val: string | number | null | undefined): string {
	if (val === null || val === undefined) return '';
	return String(val)
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export function formatValue(val: string | number | null | undefined): string {
	if (val === null || val === undefined || val === '') return FALLBACK;
	return escHtml(val);
}

export function formatUpper(val: string | null | undefined): string {
	if (val === null || val === undefined || val === '') return FALLBACK;
	// Uppercase the raw value first, then escape, so HTML entities like ``&amp;``
	// are not uppercased into ``&AMP;``.
	return escHtml(String(val).toUpperCase());
}
