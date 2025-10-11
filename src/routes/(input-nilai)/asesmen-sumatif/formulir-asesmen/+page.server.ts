import db from '$lib/server/db';
import { ensureAsesmenSumatifSchema } from '$lib/server/db/ensure-asesmen-sumatif';
import {
	tableAsesmenSumatif,
	tableAsesmenSumatifTujuan,
	tableFeatureUnlock,
	tableMataPelajaran,
	tableMurid,
	tableTujuanPembelajaran
} from '$lib/server/db/schema';
import { unflattenFormData } from '$lib/utils';
import { fail, error } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';

const CHEAT_FEATURE_KEY = 'cheat-asesmen-sumatif';

const DEFAULT_LINGKUP = 'Tanpa lingkup materi';

function normalizeLingkup(value: string | null | undefined) {
	const trimmed = value?.trim();
	return trimmed && trimmed.length > 0 ? trimmed : DEFAULT_LINGKUP;
}

function normalizeScore(value: number | null | undefined) {
	if (value == null || Number.isNaN(value)) return null;
	return Math.round(Number(value) * 100) / 100;
}

function parseScore(raw: unknown, label: string, errors: string[]) {
	if (raw == null) return null;
	const text = typeof raw === 'string' ? raw.trim() : String(raw).trim();
	if (!text) return null;
	const normalized = text.replace(',', '.');
	const pattern = /^(?:100(?:\.0{1,2})?|\d{1,2}(?:\.\d{1,2})?)$/;
	if (!pattern.test(normalized)) {
		errors.push(`Nilai ${label} harus dalam rentang 0-100 dengan maksimal 2 desimal.`);
		return null;
	}
	const score = Number.parseFloat(normalized);
	if (!Number.isFinite(score) || score < 0 || score > 100) {
		errors.push(`Nilai ${label} harus dalam rentang 0-100 dengan maksimal 2 desimal.`);
		return null;
	}
	return Math.round(score * 100) / 100;
}

const BOBOT_TOTAL = 100;

function sanitizeBobot(value: number | null | undefined) {
	if (value == null || Number.isNaN(value)) return 0;
	const finite = Number(value);
	if (!Number.isFinite(finite) || finite <= 0) return 0;
	return Math.round(finite * 100) / 100;
}

function deriveLingkupBobot(
	tujuanList: Array<{ lingkupMateri: string | null; bobot: number | null }>
) {
	const groups = new Map<string, { bobot: number; isManual: boolean }>();

	for (const tujuan of tujuanList) {
		const lingkup = normalizeLingkup(tujuan.lingkupMateri);
		const sanitized = sanitizeBobot(tujuan.bobot);
		const existing = groups.get(lingkup);
		if (!existing) {
			groups.set(lingkup, { bobot: sanitized, isManual: sanitized > 0 });
			continue;
		}
		if (!existing.isManual && sanitized > 0) {
			existing.bobot = sanitized;
			existing.isManual = true;
		}
	}

	let manualSum = 0;
	const autoKeys: string[] = [];

	for (const [key, entry] of groups.entries()) {
		if (entry.isManual && entry.bobot > 0) {
			manualSum += entry.bobot;
		} else {
			autoKeys.push(key);
		}
	}

	let remaining = BOBOT_TOTAL - manualSum;
	if (!Number.isFinite(remaining) || remaining < 0) {
		remaining = 0;
	}

	const autoValue = autoKeys.length > 0 ? Math.round((remaining / autoKeys.length) * 100) / 100 : 0;

	const result = new Map<string, number>();

	for (const [key, entry] of groups.entries()) {
		if (entry.isManual && entry.bobot > 0) {
			result.set(key, entry.bobot);
		} else {
			result.set(key, autoKeys.length > 0 ? autoValue : 0);
		}
	}

	return result;
}

export async function load({ url, locals, depends }) {
	depends('app:asesmen-sumatif/formulir');
	const muridIdParam = url.searchParams.get('murid_id');
	const mapelIdParam = url.searchParams.get('mapel_id');

	const muridId = muridIdParam ? Number(muridIdParam) : Number.NaN;
	const mapelId = mapelIdParam ? Number(mapelIdParam) : Number.NaN;

	if (!Number.isInteger(muridId) || !Number.isInteger(mapelId)) {
		throw error(400, 'Parameter asesmen tidak valid.');
	}

	const sekolahId = locals.sekolah?.id ?? null;
	if (!sekolahId) {
		throw error(401, 'Sekolah aktif tidak ditemukan.');
	}

	const murid = await db.query.tableMurid.findFirst({
		columns: { id: true, nama: true, kelasId: true },
		where: and(eq(tableMurid.id, muridId), eq(tableMurid.sekolahId, sekolahId))
	});

	if (!murid) {
		throw error(404, 'Data murid tidak ditemukan.');
	}

	const mapel = await db.query.tableMataPelajaran.findFirst({
		columns: { id: true, nama: true, kelasId: true, kkm: true },
		where: eq(tableMataPelajaran.id, mapelId)
	});

	if (!mapel || mapel.kelasId !== murid.kelasId) {
		throw error(404, 'Mata pelajaran tidak ditemukan untuk murid ini.');
	}

	const featureUnlock = await db.query.tableFeatureUnlock.findFirst({
		columns: { id: true },
		where: and(
			eq(tableFeatureUnlock.sekolahId, sekolahId),
			eq(tableFeatureUnlock.featureKey, CHEAT_FEATURE_KEY)
		)
	});

	await ensureAsesmenSumatifSchema();

	const tujuanPembelajaran = await db.query.tableTujuanPembelajaran.findMany({
		columns: { id: true, deskripsi: true, lingkupMateri: true, bobot: true },
		where: eq(tableTujuanPembelajaran.mataPelajaranId, mapel.id),
		orderBy: [asc(tableTujuanPembelajaran.lingkupMateri), asc(tableTujuanPembelajaran.id)]
	});

	const tujuanIds = tujuanPembelajaran.map((item) => item.id);
	const lingkupBobotMap = deriveLingkupBobot(tujuanPembelajaran);

	const nilaiTujuan = tujuanIds.length
		? await db.query.tableAsesmenSumatifTujuan.findMany({
				columns: { tujuanPembelajaranId: true, nilai: true },
				where: and(
					eq(tableAsesmenSumatifTujuan.muridId, murid.id),
					inArray(tableAsesmenSumatifTujuan.tujuanPembelajaranId, tujuanIds)
				)
			})
		: [];

	const nilaiMap = new Map(
		nilaiTujuan.map((item) => [item.tujuanPembelajaranId, normalizeScore(item.nilai)])
	);

	const sumatifRecord = await db.query.tableAsesmenSumatif.findFirst({
		columns: {
			naLingkup: true,
			sasTes: true,
			sasNonTes: true,
			sas: true,
			nilaiAkhir: true
		},
		where: and(
			eq(tableAsesmenSumatif.muridId, murid.id),
			eq(tableAsesmenSumatif.mataPelajaranId, mapel.id)
		)
	});

	const entries = tujuanPembelajaran.map((item, index) => {
		const lingkupMateri = normalizeLingkup(item.lingkupMateri);
		const bobot = lingkupBobotMap.get(lingkupMateri) ?? null;
		return {
			index: index + 1,
			tujuanPembelajaranId: item.id,
			deskripsi: item.deskripsi,
			lingkupMateri,
			bobot,
			nilai: nilaiMap.has(item.id) ? (nilaiMap.get(item.id) ?? null) : null
		};
	});

	const meta: PageMeta = { title: `Form Asesmen Sumatif - ${mapel.nama}` };

	return {
		meta,
		murid: { id: murid.id, nama: murid.nama },
		mapel: { id: mapel.id, nama: mapel.nama, kkm: mapel.kkm ?? 0 },
		hasTujuan: entries.length > 0,
		entries,
		cheatUnlocked: Boolean(featureUnlock),
		initialScores: {
			naLingkup: normalizeScore(sumatifRecord?.naLingkup ?? null),
			sasTes: normalizeScore(sumatifRecord?.sasTes ?? null),
			sasNonTes: normalizeScore(sumatifRecord?.sasNonTes ?? null),
			sas: normalizeScore(sumatifRecord?.sas ?? null),
			nilaiAkhir: normalizeScore(sumatifRecord?.nilaiAkhir ?? null)
		}
	};
}

export const actions = {
	save: async ({ request, locals }) => {
		const formPayload = unflattenFormData<{
			muridId?: string;
			mapelId?: string;
			entries?: Record<string, { tujuanPembelajaranId?: string; nilai?: string }>;
			sasTes?: string;
			sasNonTes?: string;
		}>(await request.formData());

		const muridId = Number(formPayload.muridId ?? '');
		const mapelId = Number(formPayload.mapelId ?? '');

		if (!Number.isInteger(muridId) || !Number.isInteger(mapelId)) {
			return fail(400, { fail: 'Data murid atau mata pelajaran tidak valid.' });
		}

		const sekolahId = locals.sekolah?.id ?? null;
		if (!sekolahId) {
			return fail(401, { fail: 'Sekolah aktif tidak ditemukan.' });
		}

		const murid = await db.query.tableMurid.findFirst({
			columns: { id: true, kelasId: true },
			where: and(eq(tableMurid.id, muridId), eq(tableMurid.sekolahId, sekolahId))
		});

		if (!murid) {
			return fail(404, { fail: 'Murid tidak ditemukan.' });
		}

		const mapel = await db.query.tableMataPelajaran.findFirst({
			columns: { id: true, kelasId: true },
			where: eq(tableMataPelajaran.id, mapelId)
		});

		if (!mapel || mapel.kelasId !== murid.kelasId) {
			return fail(404, { fail: 'Mata pelajaran tidak ditemukan.' });
		}

		await ensureAsesmenSumatifSchema();

		const tujuanList = await db.query.tableTujuanPembelajaran.findMany({
			columns: { id: true, lingkupMateri: true, bobot: true },
			where: eq(tableTujuanPembelajaran.mataPelajaranId, mapel.id),
			orderBy: [asc(tableTujuanPembelajaran.lingkupMateri), asc(tableTujuanPembelajaran.id)]
		});

		if (!tujuanList.length) {
			return fail(400, { fail: 'Belum ada tujuan pembelajaran untuk mata pelajaran ini.' });
		}

		const lingkupBobotMap = deriveLingkupBobot(tujuanList);
		const tujuanSet = new Set(tujuanList.map((item) => item.id));
		const rawEntries = Object.values(formPayload.entries ?? {});
		const entriesByTujuan = new Map<number, { nilai?: string }>();

		for (const entry of rawEntries) {
			const tujuanIdRaw = entry?.tujuanPembelajaranId ?? '';
			const tujuanId = Number(tujuanIdRaw);
			if (!Number.isInteger(tujuanId) || !tujuanSet.has(tujuanId)) {
				continue;
			}
			if (!entriesByTujuan.has(tujuanId)) {
				entriesByTujuan.set(tujuanId, { nilai: entry?.nilai });
			}
		}

		const errors: string[] = [];
		const nilaiByTujuan = new Map<number, number | null>();

		tujuanList.forEach((tujuan, index) => {
			const payload = entriesByTujuan.get(tujuan.id);
			const nilai = parseScore(payload?.nilai, `tujuan pembelajaran nomor ${index + 1}`, errors);
			nilaiByTujuan.set(tujuan.id, nilai);
		});

		const sasTes = parseScore(formPayload.sasTes, 'tes Sumatif Akhir Semester', errors);
		const sasNonTes = parseScore(formPayload.sasNonTes, 'non tes Sumatif Akhir Semester', errors);

		if (errors.length) {
			return fail(400, { fail: errors[0] });
		}

		const grouped = new Map<
			string,
			{
				bobot: number | null;
				values: number[];
			}
		>();

		for (const tujuan of tujuanList) {
			const lingkup = normalizeLingkup(tujuan.lingkupMateri);
			let group = grouped.get(lingkup);
			if (!group) {
				group = {
					bobot: lingkupBobotMap.get(lingkup) ?? null,
					values: []
				};
				grouped.set(lingkup, group);
			} else if (group.bobot == null) {
				const derivedBobot = lingkupBobotMap.get(lingkup);
				if (derivedBobot != null) {
					group.bobot = derivedBobot;
				}
			}
			const nilai = nilaiByTujuan.get(tujuan.id) ?? null;
			if (nilai != null) {
				group.values.push(nilai);
			}
		}

		let weightedSum = 0;
		let totalWeight = 0;
		let averageSum = 0;
		let averageCount = 0;

		for (const group of grouped.values()) {
			if (!group.values.length) continue;
			const avg = group.values.reduce((total, value) => total + value, 0) / group.values.length;
			const roundedAvg = Math.round(avg * 100) / 100;
			averageSum += roundedAvg;
			averageCount += 1;
			const bobot = group.bobot ?? 0;
			if (bobot > 0) {
				weightedSum += roundedAvg * bobot;
				totalWeight += bobot;
			}
		}

		let naLingkup: number | null = null;
		if (totalWeight > 0) {
			naLingkup = Math.round((weightedSum / totalWeight) * 100) / 100;
		} else if (averageCount > 0) {
			naLingkup = Math.round((averageSum / averageCount) * 100) / 100;
		}

		const sasValues = [sasTes, sasNonTes].filter((value): value is number => value != null);
		let sas: number | null = null;
		if (sasValues.length) {
			const sum = sasValues.reduce((total, value) => total + value, 0);
			sas = Math.round((sum / sasValues.length) * 100) / 100;
		}

		const finalValues = [naLingkup, sas].filter((value): value is number => value != null);
		let nilaiAkhir: number | null = null;
		if (finalValues.length) {
			const sum = finalValues.reduce((total, value) => total + value, 0);
			nilaiAkhir = Math.round((sum / finalValues.length) * 100) / 100;
		}

		const hasTujuanScores = Array.from(nilaiByTujuan.values()).some((value) => value != null);
		const shouldPersistAggregate =
			hasTujuanScores ||
			sasTes != null ||
			sasNonTes != null ||
			sas != null ||
			naLingkup != null ||
			nilaiAkhir != null;

		const now = new Date().toISOString();

		await db.transaction(async (tx) => {
			for (const tujuan of tujuanList) {
				const nilai = nilaiByTujuan.get(tujuan.id) ?? null;
				if (nilai == null) {
					await tx
						.delete(tableAsesmenSumatifTujuan)
						.where(
							and(
								eq(tableAsesmenSumatifTujuan.muridId, murid.id),
								eq(tableAsesmenSumatifTujuan.tujuanPembelajaranId, tujuan.id)
							)
						);
					continue;
				}

				await tx
					.insert(tableAsesmenSumatifTujuan)
					.values({
						muridId: murid.id,
						mataPelajaranId: mapel.id,
						tujuanPembelajaranId: tujuan.id,
						nilai,
						updatedAt: now
					})
					.onConflictDoUpdate({
						target: [
							tableAsesmenSumatifTujuan.muridId,
							tableAsesmenSumatifTujuan.tujuanPembelajaranId
						],
						set: {
							nilai,
							mataPelajaranId: mapel.id,
							updatedAt: now
						}
					});
			}

			if (!shouldPersistAggregate) {
				await tx
					.delete(tableAsesmenSumatif)
					.where(
						and(
							eq(tableAsesmenSumatif.muridId, murid.id),
							eq(tableAsesmenSumatif.mataPelajaranId, mapel.id)
						)
					);
				return;
			}

			await tx
				.insert(tableAsesmenSumatif)
				.values({
					muridId: murid.id,
					mataPelajaranId: mapel.id,
					naLingkup,
					sasTes,
					sasNonTes,
					sas,
					nilaiAkhir,
					updatedAt: now
				})
				.onConflictDoUpdate({
					target: [tableAsesmenSumatif.muridId, tableAsesmenSumatif.mataPelajaranId],
					set: {
						naLingkup,
						sasTes,
						sasNonTes,
						sas,
						nilaiAkhir,
						updatedAt: now
					}
				});
		});

		return {
			message: 'Penilaian sumatif berhasil disimpan.',
			payload: {
				tujuanScores: tujuanList.map((tujuan) => ({
					tujuanPembelajaranId: tujuan.id,
					nilai: nilaiByTujuan.get(tujuan.id) ?? null
				})),
				aggregates: {
					naLingkup,
					sasTes,
					sasNonTes,
					sas,
					nilaiAkhir
				}
			}
		};
	}
};
