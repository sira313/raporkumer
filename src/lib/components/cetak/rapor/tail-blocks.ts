export type TailBlockKey =
	| 'kokurikuler'
	| 'ekstrakurikuler' // Keep for backward compatibility but handled as rows now
	| 'ketidakhadiran'
	| 'tanggapan'
	| 'footer';

export const tailBlockOrder: TailBlockKey[] = [
	'kokurikuler',
	'ekstrakurikuler', // Keep in order but handled as individual rows in pagination
	'ketidakhadiran',
	'tanggapan',
	'footer'
];
