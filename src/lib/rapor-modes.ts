// TP Mode Builders - Robust & Testable
// Handles 'compact', 'full', 'full-desc' modes for capaian kompetensi

const LOCALE_ID = 'id-ID';

export type PredikatKey = 'perlu-bimbingan' | 'cukup' | 'baik' | 'sangat-baik';

export interface PredikatDetail {
	key: PredikatKey;
	label: string;
	narrative: string;
}

export type TujuanScoreEntry = {
	tujuanPembelajaranId: number;
	deskripsi: string;
	nilai: number;
};

export type CapaianDescriptor = TujuanScoreEntry & {
	predikat: PredikatDetail;
};

const PREDIKAT_ORDER: Record<PredikatKey, number> = {
	'perlu-bimbingan': 0,
	cukup: 1,
	baik: 2,
	'sangat-baik': 3
};

// Determine predikat based on nilai, KKM, and optional criteria ranges
export function determinePredikat(
	nilai: number,
	kkm: number | null | undefined,
	kritCukup?: number,
	kritBaik?: number
): PredikatDetail {
	const numericKkm = typeof kkm === 'number' && Number.isFinite(kkm) ? Math.round(kkm) : 0;
	const baseKkm = Math.max(0, numericKkm);
	const cUpper =
		typeof kritCukup === 'number' && Number.isFinite(kritCukup) ? Math.round(kritCukup) : 85;
	const bUpper =
		typeof kritBaik === 'number' && Number.isFinite(kritBaik) ? Math.round(kritBaik) : 95;

	if (nilai < baseKkm) {
		return { key: 'perlu-bimbingan', label: 'Perlu Bimbingan', narrative: 'masih perlu bimbingan' };
	}

	if (nilai <= cUpper) {
		return { key: 'cukup', label: 'Cukup', narrative: 'menunjukkan penguasaan yang cukup' };
	}

	if (nilai <= bUpper) {
		return { key: 'baik', label: 'Baik', narrative: 'menunjukkan penguasaan yang baik' };
	}

	return {
		key: 'sangat-baik',
		label: 'Sangat Baik',
		narrative: 'menunjukkan penguasaan yang sangat baik'
	};
}

/**
 * Compare two descriptors for sorting
 */
export function compareDescriptorAscending(a: CapaianDescriptor, b: CapaianDescriptor): number {
	const predikatDiff = PREDIKAT_ORDER[a.predikat.key] - PREDIKAT_ORDER[b.predikat.key];
	if (predikatDiff !== 0) return predikatDiff;
	if (a.nilai !== b.nilai) return a.nilai - b.nilai;
	if (a.tujuanPembelajaranId !== b.tujuanPembelajaranId) {
		return a.tujuanPembelajaranId - b.tujuanPembelajaranId;
	}
	return a.deskripsi.localeCompare(b.deskripsi, LOCALE_ID);
}

// Build a single deskripsi line for a descriptor
function buildDeskripsiLine(muridNama: string, descriptor: CapaianDescriptor): string {
	const nama = muridNama.trim().length > 0 ? muridNama.trim() : muridNama;
	const narrative = descriptor.predikat.narrative;

	if (descriptor.predikat.key === 'cukup') {
		return `Ananda ${nama} cukup mampu ${descriptor.deskripsi}`;
	}

	return `Ananda ${nama} ${narrative} dalam ${descriptor.deskripsi}`;
}

// Join list of items with Indonesian grammar
function joinList(items: string[]): string {
	if (!items.length) return '';
	if (items.length === 1) return items[0];
	if (items.length === 2) return `${items[0]} dan ${items[1]}`;
	return items.slice(0, -1).join(', ') + ', dan ' + items.at(-1);
}

// Capitalize first letter
function capitalizeFirst(s: string) {
	if (!s) return s;
	return s.charAt(0).toUpperCase() + s.slice(1);
}

// Compact mode: Show highest and lowest descriptors only
export function buildCompactMode(muridNama: string, descriptors: CapaianDescriptor[]): string {
	if (!descriptors.length) {
		return 'Belum ada penilaian sumatif.';
	}

	const sorted = descriptors.slice().sort(compareDescriptorAscending);
	const lowest = sorted[0];
	const highest = sorted.at(-1) ?? lowest;

	// If only 1 tujuan or highest === lowest, show 1 sentence
	if (sorted.length === 1 || highest.tujuanPembelajaranId === lowest.tujuanPembelajaranId) {
		return buildDeskripsiLine(muridNama, highest);
	}

	const highestLine = buildDeskripsiLine(muridNama, highest);
	const lowestLine = buildDeskripsiLine(muridNama, lowest);

	return `${highestLine}\n${lowestLine}`;
}

// Full mode: Group tujuan by predikat and list each with bullet points
export function buildFullMode(muridNama: string, descriptors: CapaianDescriptor[]): string {
	if (!descriptors.length) {
		return 'Belum ada penilaian sumatif.';
	}

	const sorted = descriptors.slice().sort(compareDescriptorAscending);

	const groups: Record<PredikatKey, CapaianDescriptor[]> = {
		'sangat-baik': [],
		baik: [],
		cukup: [],
		'perlu-bimbingan': []
	};

	for (const d of sorted) {
		groups[d.predikat.key].push(d);
	}

	const order: PredikatKey[] = ['sangat-baik', 'baik', 'cukup', 'perlu-bimbingan'];
	const lines: string[] = [];

	for (const key of order) {
		const list = groups[key];
		if (!list.length) continue;

		let headingPhrase = '';
		if (key === 'sangat-baik') headingPhrase = 'Menunjukkan penguasaan yang sangat baik dalam:';
		else if (key === 'baik') headingPhrase = 'Menunjukkan penguasaan yang baik dalam:';
		else if (key === 'cukup') headingPhrase = 'Cukup menguasai dalam:';
		else headingPhrase = 'Masih perlu bimbingan dalam:';

		lines.push(headingPhrase);

		// Sort by nilai descending, then by id
		list.sort((a, b) => {
			if (a.nilai !== b.nilai) return b.nilai - a.nilai;
			return a.tujuanPembelajaranId - b.tujuanPembelajaranId;
		});

		for (const item of list) {
			lines.push(`- ${item.deskripsi}`);
		}

		lines.push('');
	}

	// Remove trailing blank
	if (lines.length > 0 && lines.at(-1) === '') lines.pop();

	return `Ananda ${muridNama}\n${lines.join('\n')}`;
}

// Full-desc mode: Paragraph-style with sentences grouped as tercapai/tidak tercapai
export function buildFullDescMode(muridNama: string, descriptors: CapaianDescriptor[]): string {
	if (!descriptors.length) {
		return 'Belum ada penilaian sumatif.';
	}

	const sorted = descriptors.slice().sort(compareDescriptorAscending);

	const groups: Record<PredikatKey, CapaianDescriptor[]> = {
		'sangat-baik': [],
		baik: [],
		cukup: [],
		'perlu-bimbingan': []
	};

	for (const d of sorted) {
		groups[d.predikat.key].push(d);
	}

	const achievedOrder: PredikatKey[] = ['sangat-baik', 'baik', 'cukup'];
	const achievedSentences: string[] = [];

	for (let i = 0; i < achievedOrder.length; i++) {
		const key = achievedOrder[i];
		const list = groups[key];
		if (!list.length) continue;

		const descs = list.map((it) => it.deskripsi.replace(/[.!?]+$/gu, '').trim());
		const joined = joinList(descs);

		let phrase = '';
		if (key === 'sangat-baik') phrase = `menunjukkan penguasaan yang sangat baik dalam ${joined}.`;
		else if (key === 'baik') phrase = `menunjukkan penguasaan yang baik dalam ${joined}.`;
		else phrase = `cukup mampu ${joined}.`;

		if (achievedSentences.length === 0) {
			achievedSentences.push(`Ananda ${muridNama} ${phrase}`);
		} else {
			achievedSentences.push(capitalizeFirst(phrase));
		}
	}

	const achievedParagraph = achievedSentences.length ? achievedSentences.join(' ') : '';

	// Build "tidak tercapai" paragraph
	const needList = groups['perlu-bimbingan'];
	let notAchievedParagraph = '';
	if (needList.length) {
		const descs = needList.map((it) => it.deskripsi.replace(/[.!?]+$/gu, '').trim());
		const joined = joinList(descs);
		notAchievedParagraph = `Ananda ${muridNama} masih perlu bimbingan dalam ${joined}.`;
	}

	if (achievedParagraph && notAchievedParagraph) {
		return `${achievedParagraph}\n\n${notAchievedParagraph}`;
	}
	if (achievedParagraph) return achievedParagraph;
	if (notAchievedParagraph) return notAchievedParagraph;
	return '';
}

// Main builder function - orchestrates all modes
export function buildCapaianKompetensi(
	muridNama: string,
	tujuanScores: TujuanScoreEntry[],
	kkm: number | null | undefined,
	mode: 'compact' | 'full' | 'full-desc' = 'compact',
	kritCukup?: number,
	kritBaik?: number
): string {
	if (!tujuanScores.length) {
		return 'Belum ada penilaian sumatif.';
	}

	// Build descriptors
	const descriptors = tujuanScores.map<CapaianDescriptor>((entry) => ({
		...entry,
		predikat: determinePredikat(entry.nilai, kkm, kritCukup, kritBaik)
	}));

	// Route to appropriate mode builder
	switch (mode) {
		case 'full':
			return buildFullMode(muridNama, descriptors);
		case 'full-desc':
			return buildFullDescMode(muridNama, descriptors);
		default:
			return buildCompactMode(muridNama, descriptors);
	}
}
