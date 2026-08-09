import { ensureDinasLuarSchema } from '$lib/server/db/ensure-dinas-luar';
import {
	tableDinasLuarBukti,
	tableDinasLuarPermohonan,
	tableSppd,
	tableSppdPegawai,
	tableSppdPengikut
} from '$lib/server/db/schema';
import db from '$lib/server/db';
import { redirect } from '@sveltejs/kit';
import { and, desc, eq, inArray, like, sql } from 'drizzle-orm';

const PER_PAGE = 20;

export type DinasLuarPermohonanRow = {
	id: number;
	no: number;
	nama: string;
	maksud: string;
	undanganFile: string | null;
	tanggal: string;
};

export type SppdDisetujuiRow = {
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
	undanganFile: string | null;
	pegawai: { id: number; authUserId: number | null; nama: string }[];
	pengikut: { id: number; nama: string; tempatLahir: string; tanggalLahir: string }[];
	bukti: { id: number; jenis: 'pdf' | 'foto'; namaFile: string }[];
};

export type DinasLuarItem =
	| {
			status: 'pengajuan';
			no: number;
			tanggal: string;
			nama: string;
			jumlah: number;
			maksud: string;
			permohonan: DinasLuarPermohonanRow;
	  }
	| {
			status: 'disetujui';
			no: number;
			tanggal: string;
			nama: string;
			jumlah: number;
			maksud: string;
			sppd: SppdDisetujuiRow;
	  };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

type DinasLuarItemBase = DistributiveOmit<DinasLuarItem, 'no'>;

export async function load({ locals, url, depends }) {
	depends('app:dinas-luar');

	if (!locals.user) throw redirect(303, '/login');

	if (locals.user.type === 'admin' || locals.user.type === 'kepala_sekolah') {
		throw redirect(303, '/sppd');
	}

	await ensureDinasLuarSchema();

	const sekolahId = locals.sekolah?.id ?? null;
	const authUserId = locals.user.id;

	const searchParam = url.searchParams.get('q');
	const search = searchParam?.trim() ? searchParam.trim() : null;
	const requestedPage = Number(url.searchParams.get('page')) || 1;
	const pageNumber =
		Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

	const userFilter = eq(tableDinasLuarPermohonan.authUserId, authUserId);
	const sekolahFilter = sekolahId ? eq(tableDinasLuarPermohonan.sekolahId, sekolahId) : undefined;

	// Approved perjalanan dinas (SPPD) where this user is one of the pelaksana.
	const pelaksanaRows = await db.query.tableSppdPegawai.findMany({
		columns: { sppdId: true },
		where: eq(tableSppdPegawai.authUserId, authUserId)
	});
	const sppdIds = [...new Set(pelaksanaRows.map((r) => r.sppdId))];

	// Unfiltered counts for the summary.
	const permohonanCountFilter = and(userFilter, sekolahFilter);
	const [{ total: permohonanTotal }] = await db
		.select({ total: sql<number>`count(*)` })
		.from(tableDinasLuarPermohonan)
		.where(permohonanCountFilter);

	let disetujuiTotal = 0;
	if (sppdIds.length > 0) {
		const [{ total }] = await db
			.select({ total: sql<number>`count(*)` })
			.from(tableSppd)
			.where(
				and(
					inArray(tableSppd.id, sppdIds),
					sekolahId ? eq(tableSppd.sekolahId, sekolahId) : undefined
				)
			);
		disetujuiTotal = total ?? 0;
	}

	const permohonanSearchFilter = search
		? like(tableDinasLuarPermohonan.maksud, `%${search}%`)
		: undefined;
	const permohonanRows = await db.query.tableDinasLuarPermohonan.findMany({
		where: and(userFilter, sekolahFilter, permohonanSearchFilter),
		orderBy: [desc(tableDinasLuarPermohonan.createdAt), desc(tableDinasLuarPermohonan.id)]
	});

	const allItems: DinasLuarItemBase[] = [];

	for (const row of permohonanRows) {
		allItems.push({
			status: 'pengajuan',
			tanggal: row.createdAt,
			nama: row.nama,
			jumlah: 1,
			maksud: row.maksud,
			permohonan: {
				id: row.id,
				no: 0,
				nama: row.nama,
				maksud: row.maksud,
				undanganFile: row.undanganFile,
				tanggal: row.createdAt
			}
		});
	}

	if (sppdIds.length > 0) {
		const searchFilter = search ? like(tableSppd.maksud, `%${search}%`) : undefined;
		const whereFilter = and(
			inArray(tableSppd.id, sppdIds),
			sekolahId ? eq(tableSppd.sekolahId, sekolahId) : undefined,
			searchFilter
		);

		const sppdRows = await db.query.tableSppd.findMany({
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
			orderBy: [desc(tableSppd.tanggalBerangkat), desc(tableSppd.id)]
		});

		const buktiBySppd = new Map<number, SppdDisetujuiRow['bukti']>();
		const buktiRows = await db.query.tableDinasLuarBukti.findMany({
			where: inArray(
				tableDinasLuarBukti.sppdId,
				sppdRows.map((s) => s.id)
			),
			columns: { id: true, sppdId: true, jenis: true, namaFile: true },
			orderBy: [desc(tableDinasLuarBukti.id)]
		});
		for (const b of buktiRows) {
			const list = buktiBySppd.get(b.sppdId) ?? [];
			list.push({ id: b.id, jenis: b.jenis, namaFile: b.namaFile });
			buktiBySppd.set(b.sppdId, list);
		}

		for (const row of sppdRows) {
			const sppd: SppdDisetujuiRow = {
				id: row.id,
				no: 0,
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
				namaLengkap: row.pegawai[0]?.nama ?? '—',
				jumlah: row.pegawai.length,
				undanganFile: row.undanganFile,
				pegawai: row.pegawai.map((p) => ({
					id: p.id,
					authUserId: p.authUserId,
					nama: p.nama
				})),
				pengikut: row.pengikut.map((p) => ({
					id: p.id,
					nama: p.nama,
					tempatLahir: p.tempatLahir,
					tanggalLahir: p.tanggalLahir
				})),
				bukti: buktiBySppd.get(row.id) ?? []
			};
			allItems.push({
				status: 'disetujui',
				tanggal: row.tanggalBerangkat,
				nama: sppd.namaLengkap,
				jumlah: sppd.jumlah,
				maksud: row.maksud,
				sppd
			});
		}
	}

	allItems.sort((a, b) => {
		const ta = Date.parse(a.tanggal) || 0;
		const tb = Date.parse(b.tanggal) || 0;
		return tb - ta;
	});

	const total = allItems.length;
	const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
	const currentPage = Math.min(Math.max(pageNumber, 1), totalPages);
	const offset = (currentPage - 1) * PER_PAGE;

	const daftarItem = allItems.slice(offset, offset + PER_PAGE).map((item, index) => ({
		...item,
		no: offset + index + 1
	}));

	return {
		meta: { title: 'Dinas Luar' } satisfies PageMeta,
		daftarItem,
		page: {
			search,
			currentPage,
			totalPages,
			totalItems: total
		},
		permohonanCount: permohonanTotal ?? 0,
		disetujuiCount: disetujuiTotal
	};
}
