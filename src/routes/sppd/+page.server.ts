import { ensureSppdSchema } from '$lib/server/db/ensure-sppd';
import { tableSppd, tableSppdPegawai, tableSppdPengikut } from '$lib/server/db/schema';
import db from '$lib/server/db';
import { listGuruBySekolah } from '$lib/server/presensi-guru';
import { redirect } from '@sveltejs/kit';
import { and, desc, eq, like, sql } from 'drizzle-orm';

const PER_PAGE = 20;

type PageState = {
	search: string | null;
	currentPage: number;
	totalPages: number;
	totalItems: number;
};

export type SppdPengikutRow = {
	id: number;
	nama: string;
	tempatLahir: string;
	tanggalLahir: string;
};

export type SppdPegawaiRow = {
	id: number;
	authUserId: number | null;
	nama: string;
};

export type SppdRow = {
	id: number;
	no: number;
	maksud: string;
	nomorSuratTugas: string | null;
	tanggalSuratTugas: string | null;
	dasarSuratTugas: string | null;
	alatAngkut: string | null;
	tempatBerangkat: string | null;
	tempatTujuan: string | null;
	lamanya: string | null;
	tanggalBerangkat: string;
	tanggalKembali: string;
	keteranganPengikut: string | null;
	kodeRekening: string | null;
	tingkatBiaya: string | null;
	keteranganLain: string | null;
	namaLengkap: string;
	jumlah: number;
	pegawai: SppdPegawaiRow[];
	pengikut: SppdPengikutRow[];
};

export async function load({ locals, url, depends }) {
	depends('app:sppd');

	if (!locals.user) throw redirect(303, '/login');

	if (locals.user.type !== 'admin' && locals.user.type !== 'kepala_sekolah') {
		throw redirect(303, '/forbidden?required=admin');
	}

	await ensureSppdSchema();

	const sekolahId = locals.sekolah?.id ?? null;
	const guruList = sekolahId ? await listGuruBySekolah(sekolahId) : [];

	const searchParam = url.searchParams.get('q');
	const search = searchParam?.trim() ? searchParam.trim() : null;
	const requestedPage = Number(url.searchParams.get('page')) || 1;
	const pageNumber =
		Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

	const searchFilter = search ? like(tableSppd.maksud, `%${search}%`) : undefined;
	const sekolahScope = sekolahId ? eq(tableSppd.sekolahId, sekolahId) : undefined;
	const whereFilter =
		searchFilter && sekolahScope ? and(searchFilter, sekolahScope) : (searchFilter ?? sekolahScope);

	const [{ totalItems }] = await db
		.select({ totalItems: sql<number>`count(*)` })
		.from(tableSppd)
		.where(whereFilter);

	const total = totalItems ?? 0;
	const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
	const currentPage = Math.min(Math.max(pageNumber, 1), totalPages);
	const offset = (currentPage - 1) * PER_PAGE;

	const rows = await db.query.tableSppd.findMany({
		where: whereFilter,
		with: {
			pegawai: {
				columns: { id: true, authUserId: true, nama: true, urutan: true },
				orderBy: [sql`${tableSppdPegawai.urutan} asc, ${tableSppdPegawai.id} asc`]
			},
			pengikut: {
				columns: { id: true, nama: true, tempatLahir: true, tanggalLahir: true },
				orderBy: [sql`${tableSppdPengikut.id} asc`]
			}
		},
		orderBy: [desc(tableSppd.tanggalBerangkat), desc(tableSppd.id)],
		limit: PER_PAGE,
		offset
	});

	const daftarSppd: SppdRow[] = rows.map((row, index) => {
		const pegawai = row.pegawai.map((p) => ({
			id: p.id,
			authUserId: p.authUserId,
			nama: p.nama
		}));
		const pengikut = row.pengikut.map((p) => ({
			id: p.id,
			nama: p.nama,
			tempatLahir: p.tempatLahir,
			tanggalLahir: p.tanggalLahir
		}));
		return {
			id: row.id,
			no: offset + index + 1,
			maksud: row.maksud,
			nomorSuratTugas: row.nomorSuratTugas,
			tanggalSuratTugas: row.tanggalSuratTugas,
			dasarSuratTugas: row.dasarSuratTugas,
			alatAngkut: row.alatAngkut,
			tempatBerangkat: row.tempatBerangkat,
			tempatTujuan: row.tempatTujuan,
			lamanya: row.lamanya,
			tanggalBerangkat: row.tanggalBerangkat,
			tanggalKembali: row.tanggalKembali,
			keteranganPengikut: row.keteranganPengikut,
			kodeRekening: row.kodeRekening,
			tingkatBiaya: row.tingkatBiaya,
			keteranganLain: row.keteranganLain,
			namaLengkap: pegawai[0]?.nama ?? '—',
			jumlah: pegawai.length,
			pegawai,
			pengikut
		};
	});

	const page: PageState = {
		search,
		currentPage,
		totalPages,
		totalItems: total
	};

	return {
		meta: { title: 'Dinas Luar' } satisfies PageMeta,
		daftarSppd,
		guruList,
		page,
		sppdCount: total
	};
}
