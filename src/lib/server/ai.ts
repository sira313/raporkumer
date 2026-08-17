import db from '$lib/server/db';
import { tableAiSettings } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export type AiSettings = {
	apiKey: string;
	model: string;
	baseUrl: string | null;
};

export type GeneratedGroup = {
	lingkupMateri: string;
	deskripsi: string[];
};

export const DEFAULT_AI_MODEL = 'gemini-3.6-flash';
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * Read only the DB-stored AI settings (no env fallback). Used by /pengaturan to
 * show what the admin actually configured in the UI.
 */
export async function getStoredAiSettings(): Promise<AiSettings | null> {
	const row = await db.query.tableAiSettings.findFirst();
	if (!row?.apiKey) return null;
	return {
		apiKey: row.apiKey,
		model: row.model || DEFAULT_AI_MODEL,
		baseUrl: row.baseUrl || null
	};
}

/**
 * Resolve the active AI settings. Prefers the key stored in the DB (set via
 * /pengaturan), falling back to the GEMINI_API_KEY env var for development.
 */
export async function getAiSettings(): Promise<AiSettings | null> {
	const row = await db.query.tableAiSettings.findFirst();
	if (row?.apiKey) {
		return {
			apiKey: row.apiKey,
			model: row.model || DEFAULT_AI_MODEL,
			baseUrl: row.baseUrl || null
		};
	}
	const envKey = process.env.GEMINI_API_KEY;
	if (envKey) {
		return {
			apiKey: envKey,
			model: DEFAULT_AI_MODEL,
			baseUrl: 'https://generativelanguage.googleapis.com'
		};
	}
	return null;
}

export async function saveAiSettings(apiKey: string, model: string, baseUrl?: string) {
	const now = new Date().toISOString();
	const existing = await db.query.tableAiSettings.findFirst({ columns: { id: true } });
	if (existing) {
		await db
			.update(tableAiSettings)
			.set({ apiKey, model, baseUrl: baseUrl ?? null, updatedAt: now })
			.where(eq(tableAiSettings.id, existing.id));
	} else {
		await db.insert(tableAiSettings).values({
			apiKey,
			model,
			baseUrl: baseUrl ?? null,
			createdAt: now
		});
	}
}

export async function clearAiSettings() {
	await db.delete(tableAiSettings);
}

/** Mask a key for display, e.g. `AIza••••••••••••••••abcd`. */
export function maskApiKey(apiKey: string): string {
	const trimmed = apiKey.trim();
	if (trimmed.length <= 8) return '••••••••';
	return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`;
}

function normalizeGeneratedText(value: string): string {
	let text = value.trim().replace(/\s+/g, ' ');
	text = text.replace(/\.$/, '');
	text = text.slice(0, 100).trim();
	return text;
}

function parseGeneratedPayload(text: string): GeneratedGroup[] {
	const cleaned = text
		.trim()
		.replace(/^```(?:json)?/i, '')
		.replace(/```$/, '')
		.trim();
	let parsed: unknown;
	try {
		parsed = JSON.parse(cleaned);
	} catch {
		throw new Error('AI mengembalikan format yang tidak valid.');
	}

	const groups: GeneratedGroup[] = [];
	const rawGroups = Array.isArray(parsed)
		? parsed
		: (parsed as { lingkupMateri?: unknown }).lingkupMateri;
	if (!Array.isArray(rawGroups) || rawGroups.length === 0) {
		throw new Error('AI tidak menghasilkan lingkup materi.');
	}

	for (const rawGroup of rawGroups) {
		const obj = rawGroup as {
			nama?: unknown;
			lingkupMateri?: unknown;
			tujuanPembelajaran?: unknown;
		};
		const name = typeof obj.nama === 'string' ? obj.nama.trim() : '';
		const nameAlt = typeof obj.lingkupMateri === 'string' ? obj.lingkupMateri.trim() : '';
		const lingkupMateri = name || nameAlt;
		if (!lingkupMateri) continue;

		const rawTps = Array.isArray(obj.tujuanPembelajaran) ? obj.tujuanPembelajaran : [];
		const deskripsi = rawTps
			.map((tp) => (typeof tp === 'string' ? normalizeGeneratedText(tp) : ''))
			.filter((tp) => tp.length > 0);
		if (deskripsi.length === 0) continue;

		groups.push({ lingkupMateri, deskripsi });
	}

	if (groups.length === 0) {
		throw new Error('AI tidak menghasilkan tujuan pembelajaran yang valid.');
	}
	return groups;
}

export type GenerateTujuanPembelajaranInput = {
	apiKey: string;
	model: string;
	baseUrl: string | null;
	capaianPembelajaran: string;
	mapelNama: string;
	kelasLabel: string;
	semesterAktif: string;
	maxLingkupMateri: number;
	maxTujuanPembelajaran: number;
};

export async function generateTujuanPembelajaran(
	input: GenerateTujuanPembelajaranInput
): Promise<GeneratedGroup[]> {
	const {
		apiKey,
		model,
		baseUrl,
		capaianPembelajaran,
		mapelNama,
		kelasLabel,
		semesterAktif,
		maxLingkupMateri,
		maxTujuanPembelajaran
	} = input;

	const userPrompt = `${capaianPembelajaran}

Berdasarkan capaian pembelajaran untuk ${mapelNama} ${kelasLabel} ${semesterAktif} di atas, generate maksimal ${maxLingkupMateri} Lingkup Materi, tiap lingkup materi maksimal terdiri atas ${maxTujuanPembelajaran} Tujuan Pembelajaran. Tujuan Pembelajaran gunakan huruf kecil di awal kalimat, tanpa titik di akhir kalimat, limit 100 karakter.

Jawab HANYA dengan JSON tanpa teks lain, dengan format:
{"lingkupMateri":[{"nama":"nama lingkup materi","tujuanPembelajaran":["tujuan pembelajaran 1","tujuan pembelajaran 2"]}]}`;

	const responseSchema = {
		type: 'object',
		properties: {
			lingkupMateri: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						nama: { type: 'string' },
						tujuanPembelajaran: { type: 'array', items: { type: 'string' } }
					},
					required: ['nama', 'tujuanPembelajaran']
				}
			}
		},
		required: ['lingkupMateri']
	} as const;

	const base = resolveBaseUrl(baseUrl);
	const isGeminiNative = base.includes('generativelanguage.googleapis.com');

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
	let response: Response;
	try {
		if (isGeminiNative) {
			const endpoint = `${base}/v1beta/models/${model}:generateContent`;
			response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'x-goog-api-key': apiKey
				},
				signal: controller.signal,
				body: JSON.stringify({
					contents: [{ parts: [{ text: userPrompt }] }],
					generationConfig: {
						responseMimeType: 'application/json',
						responseSchema
					}
				})
			});
		} else {
			const endpoint = `${base}/chat/completions`;
			response = await fetch(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${apiKey}`
				},
				signal: controller.signal,
				body: JSON.stringify({
					model,
					messages: [{ role: 'user', content: userPrompt }],
					response_format: { type: 'json_object', schema: responseSchema }
				})
			});
		}
	} catch (err) {
		clearTimeout(timeout);
		if (err instanceof Error && err.name === 'AbortError') {
			throw new Error(
				'Waktu permintaan AI habis. Coba lagi dengan lingkup materi yang lebih kecil.',
				{ cause: err }
			);
		}
		throw new Error(`Gagal menghubungi layanan AI: ${(err as Error).message}`, { cause: err });
	}
	clearTimeout(timeout);

	if (!response.ok) {
		let detail = '';
		try {
			const body = await response.json();
			detail = (body?.error?.message ?? '') as string;
		} catch {
			// ignore body parse errors
		}
		if (response.status === 400 || response.status === 403) {
			throw new Error(
				'Kunci API tidak valid atau kuota tidak mencukupi. Periksa kembali di halaman Pengaturan.'
			);
		}
		throw new Error(detail || `Layanan AI merespons dengan status ${response.status}.`);
	}

	let data: unknown;
	try {
		data = await response.json();
	} catch {
		throw new Error('Gagal membaca respons AI.');
	}

	let text: string;
	if (isGeminiNative) {
		const geminiData = data as {
			candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
		};
		text = geminiData.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
	} else {
		const chatData = data as {
			choices?: Array<{ message?: { content?: string } }>;
		};
		text = chatData.choices?.[0]?.message?.content ?? '';
	}

	if (!text.trim()) {
		throw new Error('AI tidak mengembalikan hasil apapun.');
	}

	return parseGeneratedPayload(text);
}

function resolveBaseUrl(baseUrl: string | null): string {
	const url = (baseUrl ?? '').trim();
	if (!url)
		throw new Error('Base URL API belum dikonfigurasi. Silakan atur di halaman Pengaturan.');
	return url.replace(/\/+$/, '');
}
