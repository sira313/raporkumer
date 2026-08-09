import { ensureDinasLuarSchema } from '$lib/server/db/ensure-dinas-luar';
import { ensureSppdSchema } from '$lib/server/db/ensure-sppd';
import {
	tableDinasLuarBukti,
	tableDinasLuarPermohonan,
	tableSppd,
	tableSppdPegawai,
	tableSppdPengikut
} from '$lib/server/db/schema';
import db from '$lib/server/db';
import { listGuruBySekolah } from '$lib/server/presensi-guru';
import { redirect } from '@sveltejs/kit';
import { and, desc, eq, inArray, like, sql } from 'drizzle-orm';

const PER_PAGE = 20;

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
	undanganFile: string | null;
	pegawai: SppdPegawaiRow[];
	pengikut: SppdPengikutRow[];
	bukti: { id: number; jenis: 'pdf' | 'foto'; namaFile: string }[];
};

export type DinasLuarPermohonanRow = {
	id: number;
	no: number;
	authUserId: number;
	nama: string;
	maksud: string;
	undanganFile: string | null;
	tanggal: string;
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
			sppd: SppdRow;
	  };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

type DinasLuarItemBase = DistributiveOmit<DinasLuarItem, 'no'>;

export async function load({ locals, url, depends }) {
	depends('app:sppd');

	if (!locals.user) throw redirect(303, '/login');

	if (locals.user.type !== 'admin' && locals.user.type !== 'kepala_sekolah') {
		throw redirect(303, '/forbidden?required=admin');
	}

	await ensureSppdSchema();
	await ensureDinasLuarSchema();

	const sekolahId = locals.sekolah?.id ?? null;
	const guruList = sekolahId ? await listGuruBySekolah(sekolahId) : [];

	const searchParam = url.searchParams.get('q');
	const search = searchParam?.trim() ? searchParam.trim() : null;
	const requestedPage = Number(url.searchParams.get('page')) || 1;
	const pageNumber =
		Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

	const sekolahScope = sekolahId ? eq(tableSppd.sekolahId, sekolahId) : undefined;
	const permohonanSekolahScope = sekolahId
		? eq(tableDinasLuarPermohonan.sekolahId, sekolahId)
		: undefined;

	// Unfiltered counts for the summary.
	const [{ total: sppdTotal }] = await db
		.select({ total: sql<number>`count(*)` })
		.from(tableSppd)
		.where(sekolahScope);
	const [{ total: permohonanTotal }] = await db
		.select({ total: sql<number>`count(*)` })
		.from(tableDinasLuarPermohonan)
		.where(permohonanSekolahScope);

	const permohonanSearchFilter = search
		? like(tableDinasLuarPermohonan.maksud, `%${search}%`)
		: undefined;
	const permohonanRows = await db.query.tableDinasLuarPermohonan.findMany({
		where: and(permohonanSearchFilter, permohonanSekolahScope),
		columns: {
			id: true,
			authUserId: true,
			nama: true,
			maksud: true,
			undanganFile: true,
			createdAt: true
		},
		orderBy: [desc(tableDinasLuarPermohonan.createdAt), desc(tableDinasLuarPermohonan.id)]
	});

	const sppdSearchFilter = search ? like(tableSppd.maksud, `%${search}%`) : undefined;
	const sppdRows = await db.query.tableSppd.findMany({
		where: and(sppdSearchFilter, sekolahScope),
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

	const buktiBySppd = new Map<number, SppdRow['bukti']>();
	if (sppdRows.length > 0) {
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
	}

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
				authUserId: row.authUserId,
				nama: row.nama,
				maksud: row.maksud,
				undanganFile: row.undanganFile,
				tanggal: row.createdAt
			}
		});
	}

	for (const row of sppdRows) {
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
		const sppd: SppdRow = {
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
			namaLengkap: pegawai[0]?.nama ?? '—',
			jumlah: pegawai.length,
			undanganFile: row.undanganFile,
			pegawai,
			pengikut,
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
		guruList,
		page: {
			search,
			currentPage,
			totalPages,
			totalItems: total
		},
		sppdCount: sppdTotal ?? 0,
		permohonanCount: permohonanTotal ?? 0
	};
}
