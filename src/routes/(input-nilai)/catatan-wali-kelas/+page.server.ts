import db from '$lib/server/db';
import { ensureCatatanWaliSchema } from '$lib/server/db/ensure-catatan-wali';
import { resolveSekolahAcademicContext } from '$lib/server/db/academic';
import { tableCatatanWaliKelas, tableMurid } from '$lib/server/db/schema';
import { fail, redirect } from '@sveltejs/kit';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

const PER_PAGE = 20;

export async function load({ locals, url, depends, parent }) {
	depends('app:catatan-wali-kelas');
	await ensureCatatanWaliSchema();

	const parentData = await parent();
	const daftarKelas = (parentData.daftarKelas ?? []) as Array<{ id: number }>;
	const kelasAktif = (parentData.kelasAktif ?? null) as { id: number } | null;
	const sekolahId = locals.sekolah?.id ?? null;
	const academicContext = sekolahId ? await resolveSekolahAcademicContext(sekolahId) : null;
	const kelasParam =
		url.searchParams.get('kelas_id') ?? (kelasAktif ? String(kelasAktif.id) : null);
	const kelasId =
		kelasParam && daftarKelas.some((kelas) => kelas.id === Number(kelasParam))
			? String(kelasParam)
			: null;
	const kelasIds = daftarKelas.map((kelas) => kelas.id);
	const searchRaw = url.searchParams.get('q')?.trim() ?? '';
	const search = searchRaw || null;
	const requestedPage = Number(url.searchParams.get('page')) || 1;
	const pageNumber =
		Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

	if (!sekolahId || !kelasIds.length) {
		return {
			meta: { title: 'Catatan Wali Kelas' },
			academicContext,
			daftarCatatan: [],
			page: {
				kelasId,
				search,
				currentPage: 1,
				totalPages: 1,
				totalItems: 0,
				perPage: PER_PAGE
			}
		};
	}

	const filter = and(
		eq(tableMurid.sekolahId, sekolahId),
		kelasId ? eq(tableMurid.kelasId, Number(kelasId)) : inArray(tableMurid.kelasId, kelasIds),
		search ? sql`${tableMurid.nama} LIKE ${'%' + search + '%'} COLLATE NOCASE` : undefined
	);

	const [{ totalItems }] = await db
		.select({ totalItems: sql<number>`count(*)` })
		.from(tableMurid)
		.where(filter);

	const total = totalItems ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
	const currentPage = Math.min(Math.max(pageNumber, 1), totalPages);
	const offset = (currentPage - 1) * PER_PAGE;

	if (pageNumber !== currentPage) {
		const params = new URLSearchParams(url.searchParams);
		if (currentPage <= 1) {
			params.delete('page');
		} else {
			params.set('page', String(currentPage));
		}
		throw redirect(303, `${url.pathname}${params.size ? `?${params}` : ''}`);
	}

	const rows = await db
		.select({
			id: tableMurid.id,
			nama: tableMurid.nama,
			catatan: tableCatatanWaliKelas.catatan,
			updatedAt: tableCatatanWaliKelas.updatedAt
		})
		.from(tableMurid)
		.leftJoin(tableCatatanWaliKelas, eq(tableMurid.id, tableCatatanWaliKelas.muridId))
		.where(filter)
		.orderBy(asc(tableMurid.nama))
		.limit(PER_PAGE)
		.offset(offset);

	const daftarCatatan = rows.map((row, index) => ({
		id: row.id,
		nama: row.nama,
		catatan: row.catatan ?? null,
		updatedAt: row.updatedAt,
		no: offset + index + 1
	}));

	return {
		meta: { title: 'Catatan Wali Kelas' },
		academicContext,
		daftarCatatan,
		page: {
			kelasId,
			search,
			currentPage,
			totalPages,
			totalItems: total,
			perPage: PER_PAGE
		}
	};
}

export const actions = {
	save: async ({ request, locals }) => {
		const sekolahId = locals.sekolah?.id;
		if (!sekolahId) {
			return fail(401, { fail: 'Sekolah tidak ditemukan' });
		}

		await ensureCatatanWaliSchema();

		const formData = await request.formData();
		const muridIdRaw = formData.get('muridId');
		const catatanRaw = formData.get('catatan');

		const muridId = Number(muridIdRaw);
		if (!Number.isInteger(muridId) || muridId <= 0) {
			return fail(400, { fail: 'Data murid tidak valid' });
		}

		const murid = await db.query.tableMurid.findFirst({
			columns: { id: true },
			where: and(eq(tableMurid.id, muridId), eq(tableMurid.sekolahId, sekolahId))
		});

		if (!murid) {
			return fail(404, { fail: 'Murid tidak ditemukan' });
		}

		const catatanValue = typeof catatanRaw === 'string' ? catatanRaw : '';
		const trimmed = catatanValue.trim();
		const now = new Date().toISOString();

		if (!trimmed) {
			await db.delete(tableCatatanWaliKelas).where(eq(tableCatatanWaliKelas.muridId, muridId));
			return { message: 'Catatan dihapus' };
		}

		await db
			.insert(tableCatatanWaliKelas)
			.values({
				muridId,
				catatan: catatanValue,
				updatedAt: now
			})
			.onConflictDoUpdate({
				target: tableCatatanWaliKelas.muridId,
				set: {
					catatan: catatanValue,
					updatedAt: now
				}
			});

		return { message: 'Catatan tersimpan' };
	}
};
