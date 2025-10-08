import type { EntryDraft, TujuanEntry } from './types';

export function formatScore(value: number | null): string {
	if (value == null || Number.isNaN(value)) return '—';
	return value.toFixed(2);
}

export function toInputText(value: number | null): string {
	return value != null ? value.toFixed(2) : '';
}

export function toDraft(entry: TujuanEntry): EntryDraft {
	const nilaiText = toInputText(entry.nilai);
	return { ...entry, nilaiText };
}

export function normalizeScoreText(input: unknown): number | null {
	if (input == null) return null;
	const raw =
		typeof input === 'number' ? (Number.isFinite(input) ? input.toString() : '') : String(input);
	const trimmed = raw.trim();
	if (!trimmed) return null;
	const normalized = trimmed.replace(',', '.');
	const pattern = /^(?:100(?:\.0{1,2})?|\d{1,2}(?:\.\d{1,2})?)$/;
	if (!pattern.test(normalized)) return null;
	const value = Number.parseFloat(normalized);
	if (!Number.isFinite(value) || value < 0 || value > 100) return null;
	return Math.round(value * 100) / 100;
}

export function isScoreValid(text: string): boolean {
	if (!text.trim()) return true;
	return normalizeScoreText(text) != null;
}
