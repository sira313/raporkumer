import type { EntryDraft } from './types';
import { normalizeScoreText, toInputText } from './utils';

export type CheatResult = {
	drafts: EntryDraft[];
	sasTes: number;
	sasNonTes: number;
};

const MAX_ATTEMPTS = 40;

function roundToTwo(value: number): number {
	return Math.round(value * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

function randomBetween(min: number, max: number): number {
	if (max <= min) return min;
	return Math.random() * (max - min) + min;
}

function ensureUniqueValue(value: number, used: Set<string>): number {
	const candidate = roundToTwo(value);
	const formatted = candidate.toFixed(2);
	if (!used.has(formatted)) {
		used.add(formatted);
		return candidate;
	}
	const step = 0.01;
	for (let offset = 1; offset < 500; offset += 1) {
		const up = roundToTwo(value + step * offset);
		if (up <= 100) {
			const upKey = up.toFixed(2);
			if (!used.has(upKey)) {
				used.add(upKey);
				return up;
			}
		}
		const down = roundToTwo(value - step * offset);
		if (down >= 0) {
			const downKey = down.toFixed(2);
			if (!used.has(downKey)) {
				used.add(downKey);
				return down;
			}
		}
	}
	used.add(formatted);
	return candidate;
}

function shuffle<T>(values: T[]): T[] {
	const array = [...values];
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array;
}

function buildCheatDrafts(entries: EntryDraft[], target: number, attempt: number): EntryDraft[] {
	const count = entries.length;
	if (!count) return [];
	const indexes = shuffle(entries.map((_, index) => index));
	const used = new Set<string>();
	const baseStep = Math.min(6, Math.max(0.25, 24 / Math.max(1, count - 1)));
	const shrink = 1 + attempt / 5;
	const step = baseStep / shrink;
	const jitter = Math.max(0.05, step / 2);
	const values = new Array<number>(count);

	for (let position = 0; position < indexes.length; position += 1) {
		const idx = indexes[position];
		const offsetIndex = position - (count - 1) / 2;
		const randomOffset = offsetIndex * step + randomBetween(-jitter, jitter);
		const raw = clamp(target + randomOffset, 0, 100);
		const uniqueValue = ensureUniqueValue(raw, used);
		values[idx] = uniqueValue;
	}

	return entries.map((entry, idx) => {
		const nilai = roundToTwo(values[idx]);
		const nilaiText = toInputText(nilai);
		return {
			...entry,
			nilai,
			nilaiText
		};
	});
}

function calculateNaSumatifLingkupFromDrafts(drafts: EntryDraft[]): number | null {
	const grouped = new Map<
		string,
		{
			bobot: number | null;
			values: number[];
		}
	>();

	for (const entry of drafts) {
		const key = entry.lingkupMateri;
		let group = grouped.get(key);
		if (!group) {
			group = { bobot: entry.bobot ?? null, values: [] };
			grouped.set(key, group);
		} else if (group.bobot == null && entry.bobot != null) {
			group.bobot = entry.bobot;
		}
		const score = entry.nilai ?? normalizeScoreText(entry.nilaiText);
		if (score != null) {
			group.values.push(score);
		}
	}

	if (!grouped.size) return null;

	let weightedSum = 0;
	let totalWeight = 0;
	let fallbackSum = 0;
	let fallbackCount = 0;
	let hasValues = false;

	for (const { bobot, values } of grouped.values()) {
		if (!values.length) continue;
		hasValues = true;
		const avg = roundToTwo(values.reduce((sum, value) => sum + value, 0) / values.length);
		const weight = bobot ?? 0;
		if (weight > 0) {
			weightedSum += avg * weight;
			totalWeight += weight;
			continue;
		}
		fallbackSum += avg;
		fallbackCount += 1;
	}

	if (!hasValues) return null;

	if (totalWeight > 0) {
		return roundToTwo(weightedSum / totalWeight);
	}
	if (fallbackCount > 0) {
		return roundToTwo(fallbackSum / fallbackCount);
	}
	return null;
}

export function generateCheatResult(entries: EntryDraft[], target: number): CheatResult | null {
	if (!entries.length) return null;

	for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
		const drafts = buildCheatDrafts(entries, target, attempt);
		if (!drafts.length) return null;
		const naCandidate = calculateNaSumatifLingkupFromDrafts(drafts);
		if (naCandidate == null) continue;
		const nilaiSasCandidate = roundToTwo(2 * target - naCandidate);
		if (nilaiSasCandidate < 0 || nilaiSasCandidate > 100) {
			continue;
		}
		let sasTes = nilaiSasCandidate;
		let sasNonTes = nilaiSasCandidate;
		const spreadLimit = Math.min(0.6, Math.min(100 - nilaiSasCandidate, nilaiSasCandidate));
		if (spreadLimit > 0) {
			const spreadBase = spreadLimit <= 0.1 ? spreadLimit : randomBetween(0.1, spreadLimit);
			const spread = roundToTwo(spreadBase);
			sasTes = roundToTwo(nilaiSasCandidate + spread / 2);
			sasNonTes = roundToTwo(2 * nilaiSasCandidate - sasTes);
			if (sasTes < 0 || sasTes > 100 || sasNonTes < 0 || sasNonTes > 100) {
				sasTes = roundToTwo(nilaiSasCandidate);
				sasNonTes = sasTes;
			}
		}

		const finalDrafts = drafts.map((draft) => ({
			...draft,
			nilai: normalizeScoreText(draft.nilaiText)
		}));

		return {
			drafts: finalDrafts,
			sasTes,
			sasNonTes
		};
	}

	return null;
}
