import db from '$lib/server/db/index.js';
import { resolveSekolahAcademicContext } from '$lib/server/db/academic';
import { tableMurid } from '$lib/server/db/schema.js';
import { fail, redirect } from '@sveltejs/kit';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';

export async function load({ locals, url, depends, parent }) {
	depends('app:murid');
	const search = url.searchParams.get('q');
	const parentData = await parent();
	const daftarKelas = (parentData.daftarKelas ?? []) as Array<{ id: number }>;
	const kelasAktif = (parentData.kelasAktif ?? null) as { id: number } | null;
	const sekolahId = locals.sekolah?.id ?? null;
	const academicContext = sekolahId ? await resolveSekolahAcademicContext(sekolahId) : null;
	const kelasParam = url.searchParams.get('kelas_id') ?? (kelasAktif ? String(kelasAktif.id) : null);
	const kelasId =
		kelasParam && daftarKelas.some((kelas) => kelas.id === Number(kelasParam))
			? String(kelasParam)
			: null;
	const kelasIds = daftarKelas.map((kelas) => kelas.id);
	const perPage = 20;
	const requestedPage = Number(url.searchParams.get('page')) || 1;
	const pageNumber =
		Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

	if (!kelasIds.length) {
		return {
			daftarMurid: [],
			academicContext,
			page: {
				kelasId,
				search,
				currentPage: 1,
				totalPages: 1,
				totalItems: 0,
				perPage
			}
		};
	}

	const filter = and(
		eq(tableMurid.sekolahId, locals.sekolah!.id),
		kelasId ? eq(tableMurid.kelasId, +kelasId) : inArray(tableMurid.kelasId, kelasIds),
		search ? sql`${tableMurid.nama} LIKE ${'%' + search + '%'} COLLATE NOCASE` : undefined
	);

	const [{ totalItems }] = await db
		.select({ totalItems: sql<number>`count(*)` })
		.from(tableMurid)
		.where(filter);

	const total = totalItems ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / perPage));
	const currentPage = Math.min(Math.max(pageNumber, 1), totalPages);
	const offset = (currentPage - 1) * perPage;

	const daftarMurid = await db.query.tableMurid.findMany({
		where: filter,
		orderBy: asc(tableMurid.nama),
		limit: perPage,
		offset
	});

	if (pageNumber !== currentPage) {
		const params = new URLSearchParams(url.searchParams);
		if (currentPage <= 1) {
			params.delete('page');
		} else {
			params.set('page', String(currentPage));
		}
		throw redirect(303, `${url.pathname}${params.size ? `?${params}` : ''}`);
	}

	return {
		daftarMurid,
		academicContext,
		page: {
			kelasId,
			search,
			currentPage,
			totalPages,
			totalItems: total,
			perPage
		}
	};
}

export const actions = {
	async deleteSelected({ request, locals }) {
		const sekolahId = locals.sekolah?.id;
		if (!sekolahId) {
			return fail(401, { fail: 'Sekolah tidak ditemukan' });
		}

		const formData = await request.formData();
		const rawIds = formData.getAll('muridIds');
		const muridIds = rawIds.map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0);

		if (!muridIds.length) {
			return fail(400, { fail: 'Pilih minimal satu murid untuk dihapus' });
		}

		await db
			.delete(tableMurid)
			.where(and(eq(tableMurid.sekolahId, sekolahId), inArray(tableMurid.id, muridIds)));

		return { message: `${muridIds.length} murid berhasil dihapus` };
	}
};
