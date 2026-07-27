import { ensureBukuTamuSchema } from '$lib/server/db/ensure-buku-tamu';
import { tableBukuTamu } from '$lib/server/db/schema';
import db from '$lib/server/db';
import { redirect } from '@sveltejs/kit';
import { desc, sql, like } from 'drizzle-orm';

const PER_PAGE = 20;

type PageState = {
	search: string | null;
	currentPage: number;
	totalPages: number;
	totalItems: number;
};

type BukuTamuRow = {
	id: number;
	no: number;
	nama: string;
	asalInstansi: string;
	nip: string | null;
	keperluan: string;
	pesanKesan: string | null;
	tandaTangan: string | null;
	createdAt: string;
};

export async function load({ locals, url, depends }) {
	depends('app:buku-tamu');

	if (!locals.user) throw redirect(303, '/login');

	if (locals.user.type !== 'admin') {
		throw redirect(303, '/forbidden?required=admin');
	}

	await ensureBukuTamuSchema();

	const searchParam = url.searchParams.get('q');
	const search = searchParam?.trim() ? searchParam.trim() : null;
	const requestedPage = Number(url.searchParams.get('page')) || 1;
	const pageNumber =
		Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

	const searchFilter = search ? like(tableBukuTamu.nama, `%${search}%`) : undefined;

	const [{ totalItems }] = await db
		.select({ totalItems: sql<number>`count(*)` })
		.from(tableBukuTamu)
		.where(searchFilter);

	const total = totalItems ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
	const currentPage = Math.min(Math.max(pageNumber, 1), totalPages);
	const offset = (currentPage - 1) * PER_PAGE;

	const rows = await db
		.select({
			id: tableBukuTamu.id,
			nama: tableBukuTamu.nama,
			asalInstansi: tableBukuTamu.asalInstansi,
			nip: tableBukuTamu.nip,
			keperluan: tableBukuTamu.keperluan,
			pesanKesan: tableBukuTamu.pesanKesan,
			tandaTangan: tableBukuTamu.tandaTangan,
			createdAt: tableBukuTamu.createdAt
		})
		.from(tableBukuTamu)
		.where(searchFilter)
		.orderBy(desc(tableBukuTamu.createdAt))
		.limit(PER_PAGE)
		.offset(offset);

	const daftarTamu: BukuTamuRow[] = rows.map((row, index) => ({
		id: row.id,
		no: offset + index + 1,
		nama: row.nama,
		asalInstansi: row.asalInstansi,
		nip: row.nip,
		keperluan: row.keperluan,
		pesanKesan: row.pesanKesan,
		tandaTangan: row.tandaTangan,
		createdAt: row.createdAt
	}));

	const page: PageState = {
		search,
		currentPage,
		totalPages,
		totalItems: total
	};

	return {
		meta: { title: 'Buku Tamu' } satisfies PageMeta,
		daftarTamu,
		page,
		tamuCount: total
	};
}
