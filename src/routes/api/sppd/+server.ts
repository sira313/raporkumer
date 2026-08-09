import { ensureSppdSchema } from '$lib/server/db/ensure-sppd';
import {
	tableDinasLuarBukti,
	tableDinasLuarPermohonan,
	tableSppd,
	tableSppdPegawai,
	tableSppdPengikut,
	tableTahunAjaran,
	tableSemester
} from '$lib/server/db/schema';
import db from '$lib/server/db';
import { deleteBuktiFile, deleteUndanganFile } from '$lib/server/dinas-luar';
import { listGuruBySekolah } from '$lib/server/presensi-guru';
import { eq, desc } from 'drizzle-orm';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

async function resolveSekolahContext(sekolahId?: number) {
	let sid: number;
	if (sekolahId) {
		sid = sekolahId;
	} else {
		const sekolah = await db.query.tableSekolah.findFirst();
		if (!sekolah) throw error(500, { message: 'Belum ada data sekolah' });
		sid = sekolah.id;
	}

	let tahunAjaranId: number | null = null;
	let semesterId: number | null = null;

	const ta = await db.query.tableTahunAjaran.findFirst({
		where: eq(tableTahunAjaran.sekolahId, sid),
		orderBy: [desc(tableTahunAjaran.id)]
	});
	if (ta) {
		tahunAjaranId = ta.id;
		const smt = await db.query.tableSemester.findFirst({
			where: eq(tableSemester.tahunAjaranId, ta.id),
			orderBy: [desc(tableSemester.id)]
		});
		if (smt) semesterId = smt.id;
	}

	return { sekolahId: sid, tahunAjaranId, semesterId };
}

type SppdFieldValues = {
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
};

async function buildSppdPayload(body: unknown, sekolahId: number | undefined) {
	const {
		maksud,
		nomorSuratTugas,
		tanggalSuratTugas,
		dasarSuratTugas,
		alatAngkut,
		tempatBerangkat,
		tempatTujuan,
		lamanya,
		tanggalBerangkat,
		tanggalKembali,
		pegawaiIds,
		pengikut,
		keteranganPengikut,
		kodeRekening,
		tingkatBiaya,
		keteranganLain
	} = (body ?? {}) as Record<string, unknown>;

	const trimmedMaksud = typeof maksud === 'string' ? maksud.trim() : '';
	if (!trimmedMaksud) {
		throw error(400, { message: 'Maksud Perjalanan Dinas wajib diisi' });
	}

	const rawPegawaiIds = Array.isArray(pegawaiIds) ? pegawaiIds : [];
	const pegawaiIdSet = new Set<number>(
		rawPegawaiIds
			.map((id: unknown) => Number(id))
			.filter((id: number) => Number.isInteger(id) && id > 0)
	);
	if (pegawaiIdSet.size === 0) {
		throw error(400, { message: 'Pilih minimal satu pegawai yang melaksanakan perjalanan dinas' });
	}

	const trimmedBerangkat = typeof tanggalBerangkat === 'string' ? tanggalBerangkat.trim() : '';
	const trimmedKembali = typeof tanggalKembali === 'string' ? tanggalKembali.trim() : '';
	if (!trimmedBerangkat) {
		throw error(400, { message: 'Tanggal berangkat wajib diisi' });
	}
	if (!trimmedKembali) {
		throw error(400, { message: 'Tanggal kembali wajib diisi' });
	}

	const rawPengikut = Array.isArray(pengikut) ? pengikut : [];
	const validPengikut: Array<{ nama: string; tempatLahir: string; tanggalLahir: string }> = [];
	for (const item of rawPengikut) {
		if (!item || typeof item !== 'object') continue;
		const rec = item as Record<string, unknown>;
		const nama = typeof rec.nama === 'string' ? rec.nama.trim() : '';
		const tempatLahir = typeof rec.tempatLahir === 'string' ? rec.tempatLahir.trim() : '';
		const tanggalLahir = typeof rec.tanggalLahir === 'string' ? rec.tanggalLahir.trim() : '';
		if (!nama && !tempatLahir && !tanggalLahir) continue;
		if (!nama) throw error(400, { message: 'Nama pengikut wajib diisi' });
		if (!tempatLahir) throw error(400, { message: 'Tempat lahir pengikut wajib diisi' });
		if (!tanggalLahir) throw error(400, { message: 'Tanggal lahir pengikut wajib diisi' });
		validPengikut.push({ nama, tempatLahir, tanggalLahir });
	}

	// Resolve pegawai names server-side (only guru/staff belonging to the active sekolah).
	const ctx = await resolveSekolahContext(sekolahId);
	const gurus = await listGuruBySekolah(ctx.sekolahId);
	const guruById = new Map(gurus.map((g) => [g.id, g.nama]));
	const selectedGuru = Array.from(pegawaiIdSet)
		.map((id) => ({ id, nama: guruById.get(id) }))
		.filter((entry): entry is { id: number; nama: string } => !!entry.nama)
		.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
	if (selectedGuru.length === 0) {
		throw error(400, { message: 'Pegawai terpilih tidak valid untuk sekolah ini' });
	}

	const values: SppdFieldValues = {
		maksud: trimmedMaksud,
		nomorSuratTugas:
			typeof nomorSuratTugas === 'string' && nomorSuratTugas.trim() ? nomorSuratTugas.trim() : null,
		tanggalSuratTugas:
			typeof tanggalSuratTugas === 'string' && tanggalSuratTugas.trim()
				? tanggalSuratTugas.trim()
				: null,
		dasarSuratTugas:
			typeof dasarSuratTugas === 'string' && dasarSuratTugas.trim() ? dasarSuratTugas.trim() : null,
		alatAngkut: typeof alatAngkut === 'string' && alatAngkut.trim() ? alatAngkut.trim() : null,
		tempatBerangkat:
			typeof tempatBerangkat === 'string' && tempatBerangkat.trim() ? tempatBerangkat.trim() : null,
		tempatTujuan:
			typeof tempatTujuan === 'string' && tempatTujuan.trim() ? tempatTujuan.trim() : null,
		lamanya: typeof lamanya === 'string' && lamanya.trim() ? lamanya.trim() : null,
		tanggalBerangkat: trimmedBerangkat,
		tanggalKembali: trimmedKembali,
		keteranganPengikut:
			typeof keteranganPengikut === 'string' && keteranganPengikut.trim()
				? keteranganPengikut.trim()
				: null,
		kodeRekening:
			typeof kodeRekening === 'string' && kodeRekening.trim() ? kodeRekening.trim() : null,
		tingkatBiaya:
			typeof tingkatBiaya === 'string' && tingkatBiaya.trim() ? tingkatBiaya.trim() : null,
		keteranganLain:
			typeof keteranganLain === 'string' && keteranganLain.trim() ? keteranganLain.trim() : null
	};

	return { ctx, values, selectedGuru, validPengikut };
}

/** Minimal db/tx handle for `insertPegawaiPengikut` (works for both the global
 *  drizzle instance and a `db.transaction` callback). */
type SppdDbHandle = {
	insert: typeof db.insert;
};

async function insertPegawaiPengikut(
	sppdId: number,
	selectedGuru: Array<{ id: number; nama: string }>,
	validPengikut: Array<{ nama: string; tempatLahir: string; tanggalLahir: string }>,
	d: SppdDbHandle = db
) {
	if (selectedGuru.length > 0) {
		await d.insert(tableSppdPegawai).values(
			selectedGuru.map((g, index) => ({
				sppdId,
				authUserId: g.id,
				nama: g.nama,
				urutan: index
			}))
		);
	}

	if (validPengikut.length > 0) {
		await d.insert(tableSppdPengikut).values(
			validPengikut.map((p) => ({
				sppdId,
				...p
			}))
		);
	}
}

export const POST = (async ({ request, locals }) => {
	if (!locals.user || (locals.user.type !== 'admin' && locals.user.type !== 'kepala_sekolah')) {
		throw error(403, { message: 'Hanya admin yang dapat menambah data' });
	}

	await ensureSppdSchema();

	const body = await request.json();
	const { ctx, values, selectedGuru, validPengikut } = await buildSppdPayload(
		body,
		locals.sekolah?.id
	);

	// When the SPPD is created from an approved permohonan, carry the undangan
	// file over and consume the permohonan atomically so it can't be approved
	// twice (which would create duplicate SPPDs sharing the same undangan file).
	let undanganFile: string | null = null;
	let permohonanToConsume: { id: number; undanganFile: string | null } | null = null;
	const permohonanId = (body as { permohonanId?: unknown }).permohonanId;
	if (Number.isInteger(permohonanId) && (permohonanId as number) > 0) {
		const permohonan = await db.query.tableDinasLuarPermohonan.findFirst({
			where: eq(tableDinasLuarPermohonan.id, permohonanId as number),
			columns: { id: true, sekolahId: true, undanganFile: true }
		});
		if (permohonan) {
			if (locals.sekolah?.id && permohonan.sekolahId !== locals.sekolah.id) {
				throw error(403, { message: 'Tidak dapat menyetujui pengajuan sekolah lain' });
			}
			undanganFile = permohonan.undanganFile;
			permohonanToConsume = { id: permohonan.id, undanganFile: permohonan.undanganFile };
		}
	}

	try {
		await db.transaction(async (tx) => {
			const [inserted] = await tx
				.insert(tableSppd)
				.values({ ...ctx, ...values, undanganFile })
				.returning({ id: tableSppd.id });

			const sppdId = inserted.id;
			await insertPegawaiPengikut(sppdId, selectedGuru, validPengikut, tx);

			if (permohonanToConsume) {
				await tx
					.delete(tableDinasLuarPermohonan)
					.where(eq(tableDinasLuarPermohonan.id, permohonanToConsume.id));
			}
		});

		return json({ message: 'Dinas luar berhasil disimpan' });
	} catch (e) {
		console.error('[api/sppd] gagal menyimpan:', e);
		throw error(500, { message: 'Gagal menyimpan data' });
	}
}) satisfies RequestHandler;

export const PATCH = (async ({ request, url, locals }) => {
	if (!locals.user || (locals.user.type !== 'admin' && locals.user.type !== 'kepala_sekolah')) {
		throw error(403, { message: 'Hanya admin yang dapat mengubah data' });
	}

	await ensureSppdSchema();

	const idParam = url.searchParams.get('id');
	const id = Number(idParam);
	if (!Number.isInteger(id) || id <= 0) {
		throw error(400, { message: 'ID tidak valid' });
	}

	const existing = await db.query.tableSppd.findFirst({
		where: eq(tableSppd.id, id),
		columns: { id: true, sekolahId: true }
	});
	if (!existing) {
		throw error(404, { message: 'Data tidak ditemukan' });
	}
	if (locals.user.type === 'kepala_sekolah' && existing.sekolahId !== locals.sekolah?.id) {
		throw error(403, { message: 'Tidak dapat mengubah data sekolah lain' });
	}

	const { values, selectedGuru, validPengikut } = await buildSppdPayload(
		await request.json(),
		locals.sekolah?.id
	);

	try {
		// Keep the original sekolah/tahun ajaran/semester context on edit.
		await db.update(tableSppd).set(values).where(eq(tableSppd.id, id));

		await db.delete(tableSppdPegawai).where(eq(tableSppdPegawai.sppdId, id));
		await db.delete(tableSppdPengikut).where(eq(tableSppdPengikut.sppdId, id));
		await insertPegawaiPengikut(id, selectedGuru, validPengikut);

		return json({ message: 'Dinas luar berhasil diperbarui' });
	} catch (e) {
		console.error('[api/sppd] gagal memperbarui:', e);
		throw error(500, { message: 'Gagal memperbarui data' });
	}
}) satisfies RequestHandler;

export const DELETE = (async ({ url, locals }) => {
	if (!locals.user || (locals.user.type !== 'admin' && locals.user.type !== 'kepala_sekolah')) {
		throw error(403, { message: 'Hanya admin yang dapat menghapus data' });
	}

	await ensureSppdSchema();

	const idParam = url.searchParams.get('id');
	const id = Number(idParam);
	if (!Number.isInteger(id) || id <= 0) {
		throw error(400, { message: 'ID tidak valid' });
	}

	const existing = await db.query.tableSppd.findFirst({
		where: eq(tableSppd.id, id),
		columns: { id: true, sekolahId: true, undanganFile: true }
	});
	if (!existing) {
		throw error(404, { message: 'Data tidak ditemukan' });
	}
	if (locals.user.type === 'kepala_sekolah' && existing.sekolahId !== locals.sekolah?.id) {
		throw error(403, { message: 'Tidak dapat menghapus data sekolah lain' });
	}

	// Delete child rows first (FK cascade isn't enforced in this app).
	await db.delete(tableSppdPegawai).where(eq(tableSppdPegawai.sppdId, id));
	await db.delete(tableSppdPengikut).where(eq(tableSppdPengikut.sppdId, id));

	// Remove stored bukti files and the carried-over undangan file.
	const buktiRows = await db.query.tableDinasLuarBukti.findMany({
		where: eq(tableDinasLuarBukti.sppdId, id),
		columns: { namaFile: true }
	});
	for (const b of buktiRows) {
		await deleteBuktiFile(b.namaFile);
	}
	await db.delete(tableDinasLuarBukti).where(eq(tableDinasLuarBukti.sppdId, id));
	await deleteUndanganFile(existing.undanganFile);

	await db.delete(tableSppd).where(eq(tableSppd.id, id));

	return json({ message: 'Data dinas luar berhasil dihapus' });
}) satisfies RequestHandler;
