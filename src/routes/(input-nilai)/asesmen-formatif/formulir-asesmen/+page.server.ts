import db from '$lib/server/db';
import {
	tableAsesmenFormatif,
	tableMataPelajaran,
	tableMurid,
	tableTujuanPembelajaran
} from '$lib/server/db/schema';
import { ensureAsesmenFormatifSchema } from '$lib/server/db/ensure-asesmen-formatif';
import { unflattenFormData } from '$lib/utils';
import { fail, error } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';

const DEFAULT_LINGKUP = 'Tanpa lingkup materi';

export async function load({ url, locals, depends }) {
	depends('app:asesmen-formatif/formulir');
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
		columns: { id: true, nama: true, kelasId: true },
		where: eq(tableMataPelajaran.id, mapelId)
	});

	if (!mapel || mapel.kelasId !== murid.kelasId) {
		throw error(404, 'Mata pelajaran tidak ditemukan untuk murid ini.');
	}

	await ensureAsesmenFormatifSchema();

	const tujuanPembelajaran = await db.query.tableTujuanPembelajaran.findMany({
		columns: { id: true, deskripsi: true, lingkupMateri: true },
		where: eq(tableTujuanPembelajaran.mataPelajaranId, mapel.id),
		orderBy: [asc(tableTujuanPembelajaran.lingkupMateri), asc(tableTujuanPembelajaran.id)]
	});

	const tujuanIds = tujuanPembelajaran.map((item) => item.id);

	const asesmen = tujuanIds.length
		? await db.query.tableAsesmenFormatif.findMany({
			columns: { tujuanPembelajaranId: true, tuntas: true },
			where: and(
				eq(tableAsesmenFormatif.muridId, murid.id),
				inArray(tableAsesmenFormatif.tujuanPembelajaranId, tujuanIds)
			)
		})
		: [];

	const asesmenMap = new Map(asesmen.map((item) => [item.tujuanPembelajaranId, Boolean(item.tuntas)]));

	const entries = tujuanPembelajaran.map((item, index) => {
		const status = asesmenMap.has(item.id)
			? asesmenMap.get(item.id)
				? 'ya'
				: 'tidak'
			: null;
		return {
			index: index + 1,
			tujuanPembelajaranId: item.id,
			deskripsi: item.deskripsi,
			lingkupMateri: item.lingkupMateri?.trim() || DEFAULT_LINGKUP,
			status
		};
	});

	const meta: PageMeta = { title: `Form Asesmen Formatif - ${mapel.nama}` };

	return {
		meta,
		murid: { id: murid.id, nama: murid.nama },
		mapel: { id: mapel.id, nama: mapel.nama },
		hasTujuan: entries.length > 0,
		entries
	};
}

export const actions = {
	save: async ({ request, locals }) => {
		const formPayload = unflattenFormData<{
			muridId?: string;
			mapelId?: string;
			entries?: Record<string, { tujuanPembelajaranId?: string; status?: string }>;
		}>(await request.formData());

		const muridIdRaw = formPayload.muridId ?? '';
		const mapelIdRaw = formPayload.mapelId ?? '';
		const muridId = Number(muridIdRaw);
		const mapelId = Number(mapelIdRaw);

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

		const tujuanPembelajaran = await db.query.tableTujuanPembelajaran.findMany({
			columns: { id: true },
			where: eq(tableTujuanPembelajaran.mataPelajaranId, mapel.id)
		});
		const tujuanSet = new Set(tujuanPembelajaran.map((item) => item.id));

		if (!tujuanSet.size) {
			return fail(400, { fail: 'Belum ada tujuan pembelajaran untuk mata pelajaran ini.' });
		}

		await ensureAsesmenFormatifSchema();

		const entries = Object.values(formPayload.entries ?? {}).flatMap((entry) => {
			const tujuanId = Number(entry.tujuanPembelajaranId ?? '');
			if (!Number.isInteger(tujuanId) || !tujuanSet.has(tujuanId)) {
				return [] as Array<{ tujuanId: number; status: 'ya' | 'tidak' | null }>;
			}
			const rawStatus = entry.status?.toLowerCase();
			const status = rawStatus === 'ya' ? 'ya' : rawStatus === 'tidak' ? 'tidak' : null;
			return [{ tujuanId, status }];
		});

		const now = new Date().toISOString();

		await db.transaction(async (tx) => {
			for (const entry of entries) {
				if (!entry.status) {
					await tx
						.delete(tableAsesmenFormatif)
						.where(
							and(
								eq(tableAsesmenFormatif.muridId, murid.id),
								eq(tableAsesmenFormatif.tujuanPembelajaranId, entry.tujuanId)
							)
						);
					continue;
				}

				await tx
					.insert(tableAsesmenFormatif)
					.values({
						muridId: murid.id,
						mataPelajaranId: mapel.id,
						tujuanPembelajaranId: entry.tujuanId,
						tuntas: entry.status === 'ya',
						updatedAt: now
					})
					.onConflictDoUpdate({
						target: [tableAsesmenFormatif.muridId, tableAsesmenFormatif.tujuanPembelajaranId],
						set: {
							tuntas: entry.status === 'ya',
							mataPelajaranId: mapel.id,
							updatedAt: now
						}
					});
			}
		});

		return { message: 'Penilaian formatif berhasil disimpan.' };
	}
};
