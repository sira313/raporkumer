import db from '$lib/server/db';
import { ensureAsesmenEkstrakurikulerSchema } from '$lib/server/db/ensure-asesmen-ekstrakurikuler';
import {
	tableAsesmenEkstrakurikuler,
	tableEkstrakurikuler,
	tableEkstrakurikulerTujuan,
	tableMurid
} from '$lib/server/db/schema';
import {
	ekstrakurikulerNilaiLabelByValue,
	ekstrakurikulerNilaiOptions,
	isEkstrakurikulerNilaiKategori,
	type EkstrakurikulerNilaiKategori
} from '$lib/ekstrakurikuler';
import { unflattenFormData } from '$lib/utils';
import { fail, redirect, error } from '@sveltejs/kit';
import { asc, and, eq } from 'drizzle-orm';

type NilaiMap = Record<number, EkstrakurikulerNilaiKategori>;

function sanitizeRedirect(value: string | null | undefined) {
	if (!value) return '/nilai-ekstrakurikuler';
	let decoded: string;
	try {
		decoded = decodeURIComponent(value);
	} catch (err) {
		console.warn('Gagal mengurai redirect parameter', err);
		return '/nilai-ekstrakurikuler';
	}
	if (!decoded.startsWith('/')) {
		return '/nilai-ekstrakurikuler';
	}
	return decoded || '/nilai-ekstrakurikuler';
}

export async function load({ parent, url, depends }) {
	depends('app:nilai-ekstrakurikuler:form');
	const { kelasAktif } = await parent();
	const meta: PageMeta = { title: 'Form Asesmen Ekstrakurikuler' };

	const muridIdParam = url.searchParams.get('murid_id');
	const ekstrakurikulerIdParam = url.searchParams.get('ekstrakurikuler_id');

	if (!muridIdParam || !ekstrakurikulerIdParam) {
		throw redirect(302, '/nilai-ekstrakurikuler');
	}

	const muridId = Number(muridIdParam);
	const ekstrakurikulerId = Number(ekstrakurikulerIdParam);
	if (!Number.isInteger(muridId) || muridId <= 0) {
		throw error(400, 'Parameter murid tidak valid');
	}
	if (!Number.isInteger(ekstrakurikulerId) || ekstrakurikulerId <= 0) {
		throw error(400, 'Parameter ekstrakurikuler tidak valid');
	}

	const murid = await db.query.tableMurid.findFirst({
		columns: { id: true, nama: true, kelasId: true },
		where: eq(tableMurid.id, muridId)
	});
	if (!murid) {
		throw error(404, 'Data murid tidak ditemukan');
	}

	const ekstrak = await db.query.tableEkstrakurikuler.findFirst({
		columns: { id: true, nama: true, kelasId: true },
		where: eq(tableEkstrakurikuler.id, ekstrakurikulerId)
	});
	if (!ekstrak) {
		throw error(404, 'Data ekstrakurikuler tidak ditemukan');
	}

	if (murid.kelasId !== ekstrak.kelasId) {
		throw error(403, 'Murid dan ekstrakurikuler tidak berada pada kelas yang sama');
	}

	if (kelasAktif?.id && kelasAktif.id !== murid.kelasId) {
		throw error(403, 'Murid tidak termasuk dalam kelas aktif');
	}

	const tujuan = await db.query.tableEkstrakurikulerTujuan.findMany({
		columns: { id: true, deskripsi: true },
		where: eq(tableEkstrakurikulerTujuan.ekstrakurikulerId, ekstrak.id),
		orderBy: asc(tableEkstrakurikulerTujuan.createdAt)
	});

	await ensureAsesmenEkstrakurikulerSchema();

	const existing = await db.query.tableAsesmenEkstrakurikuler.findMany({
		columns: { tujuanId: true, kategori: true },
		where: and(
			eq(tableAsesmenEkstrakurikuler.muridId, murid.id),
			eq(tableAsesmenEkstrakurikuler.ekstrakurikulerId, ekstrak.id)
		)
	});

	const nilaiByTujuan = existing.reduce<NilaiMap>((acc, row) => {
		if (isEkstrakurikulerNilaiKategori(row.kategori)) {
			acc[row.tujuanId] = row.kategori;
		}
		return acc;
	}, {});

	const backUrl = sanitizeRedirect(url.searchParams.get('redirect'));

	return {
		meta,
		murid: { id: murid.id, nama: murid.nama },
		ekstrakurikuler: { id: ekstrak.id, nama: ekstrak.nama },
		tujuan,
		nilaiByTujuan,
		kategoriOptions: ekstrakurikulerNilaiOptions,
		kategoriLabelByValue: ekstrakurikulerNilaiLabelByValue,
		backUrl
	};
}

export const actions = {
	save: async ({ request }) => {
		const formData = await request.formData();
		const muridIdRaw = formData.get('muridId');
		const ekstrakurikulerIdRaw = formData.get('ekstrakurikulerId');

		if (!muridIdRaw || !ekstrakurikulerIdRaw) {
			return fail(400, { fail: 'Data murid atau ekstrakurikuler tidak lengkap' });
		}

		const muridId = Number(muridIdRaw);
		const ekstrakurikulerId = Number(ekstrakurikulerIdRaw);
		if (!Number.isInteger(muridId) || muridId <= 0) {
			return fail(400, { fail: 'Murid tidak valid' });
		}
		if (!Number.isInteger(ekstrakurikulerId) || ekstrakurikulerId <= 0) {
			return fail(400, { fail: 'Ekstrakurikuler tidak valid' });
		}

		const muridRecord = await db.query.tableMurid.findFirst({
			columns: { id: true, kelasId: true },
			where: eq(tableMurid.id, muridId)
		});
		if (!muridRecord) {
			return fail(404, { fail: 'Data murid tidak ditemukan' });
		}

		const ekstrakRecord = await db.query.tableEkstrakurikuler.findFirst({
			columns: { id: true, kelasId: true },
			where: eq(tableEkstrakurikuler.id, ekstrakurikulerId)
		});
		if (!ekstrakRecord) {
			return fail(404, { fail: 'Data ekstrakurikuler tidak ditemukan' });
		}

		if (muridRecord.kelasId !== ekstrakRecord.kelasId) {
			return fail(400, { fail: 'Murid dan ekstrakurikuler tidak berada pada kelas yang sama' });
		}

		const tujuanRecords = await db.query.tableEkstrakurikulerTujuan.findMany({
			columns: { id: true },
			where: eq(tableEkstrakurikulerTujuan.ekstrakurikulerId, ekstrakRecord.id)
		});
		const tujuanIdSet = new Set(tujuanRecords.map((item) => item.id));

		const payload = unflattenFormData<{ nilai?: Record<string, FormDataEntryValue> }>(
			formData,
			false
		);
		const nilaiEntries = payload.nilai ?? {};

		const sanitized: Array<{ tujuanId: number; kategori: EkstrakurikulerNilaiKategori }> = [];

		for (const [tujuanKey, rawValue] of Object.entries(nilaiEntries)) {
			const tujuanId = Number(tujuanKey);
			if (!Number.isInteger(tujuanId) || !tujuanIdSet.has(tujuanId)) continue;
			const value = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue ?? '').trim();
			if (!value) continue;
			if (!isEkstrakurikulerNilaiKategori(value)) continue;
			sanitized.push({ tujuanId, kategori: value });
		}

		await ensureAsesmenEkstrakurikulerSchema();

		await db.transaction(async (tx) => {
			await tx
				.delete(tableAsesmenEkstrakurikuler)
				.where(
					and(
						eq(tableAsesmenEkstrakurikuler.muridId, muridRecord.id),
						eq(tableAsesmenEkstrakurikuler.ekstrakurikulerId, ekstrakRecord.id)
					)
				);

			if (sanitized.length) {
				const now = new Date().toISOString();
				await tx.insert(tableAsesmenEkstrakurikuler).values(
					sanitized.map((entry) => ({
						muridId: muridRecord.id,
						ekstrakurikulerId: ekstrakRecord.id,
						tujuanId: entry.tujuanId,
						kategori: entry.kategori,
						dinilaiPada: now,
						updatedAt: now
					}))
				);
			}
		});

		const message = sanitized.length
			? 'Nilai ekstrakurikuler berhasil disimpan'
			: 'Nilai ekstrakurikuler dibersihkan';

		return {
			message,
			nilai: sanitized.map((entry) => ({
				tujuanId: entry.tujuanId,
				kategori: entry.kategori,
				kategoriLabel: ekstrakurikulerNilaiLabelByValue[entry.kategori]
			}))
		};
	}
};
