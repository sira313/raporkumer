import { ensureDinasLuarSchema } from '$lib/server/db/ensure-dinas-luar';
import { tableDinasLuarPermohonan, tableSppd } from '$lib/server/db/schema';
import db from '$lib/server/db';
import { deleteUndanganFile, resolveUserName, saveUndanganFile } from '$lib/server/dinas-luar';
import { isAuthorizedUser } from '../../pengguna/permissions';
import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

function isAdminUserType(user: Pick<AuthUser, 'type'> | null | undefined): boolean {
	return user?.type === 'admin' || user?.type === 'kepala_sekolah';
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) throw error(401, { message: 'Harus login terlebih dahulu' });

	// /dinas-luar is scoped to non-admin roles; admin & kepala_sekolah manage
	// perjalanan dinas via /sppd.
	if (isAdminUserType(locals.user)) {
		throw error(403, { message: 'Akses tidak diizinkan untuk role ini' });
	}
	if (!isAuthorizedUser(['administrasi_dinas_luar'], locals.user)) {
		throw error(403, { message: 'Akses tidak diizinkan' });
	}

	await ensureDinasLuarSchema();

	const formData = await request.formData();

	const rawMaksud = formData.get('maksud');
	const maksud = typeof rawMaksud === 'string' ? rawMaksud.trim() : '';
	if (!maksud) {
		throw error(400, { message: 'Maksud perjalanan dinas wajib diisi' });
	}

	const file = formData.get('undangan');
	let undanganFile: string | null = null;
	if (file && typeof file !== 'string') {
		const upload = file as File;
		if (upload.size > 0) {
			const isPdf = upload.type === 'application/pdf' || upload.name.toLowerCase().endsWith('.pdf');
			if (!isPdf) {
				throw error(400, { message: 'File undangan harus berupa PDF' });
			}
			const buffer = Buffer.from(await upload.arrayBuffer());
			const filename = `${locals.user.id}_${Date.now()}.pdf`;
			undanganFile = await saveUndanganFile(filename, buffer);
		}
	}

	const sekolahId = locals.sekolah?.id;
	if (!sekolahId) {
		throw error(500, { message: 'Belum ada data sekolah' });
	}
	const nama = await resolveUserName(locals.user);

	try {
		const [inserted] = await db
			.insert(tableDinasLuarPermohonan)
			.values({
				sekolahId,
				authUserId: locals.user.id,
				nama,
				maksud,
				undanganFile
			})
			.returning({ id: tableDinasLuarPermohonan.id });

		if (!inserted) throw new Error('Insert returned no row');

		return json({ message: 'Permohonan perjalanan dinas berhasil disimpan' });
	} catch (e) {
		if (undanganFile) {
			await deleteUndanganFile(undanganFile);
		}
		console.error('[api/dinas-luar] gagal menyimpan:', e);
		throw error(500, { message: 'Gagal menyimpan data' });
	}
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, { message: 'Harus login terlebih dahulu' });

	if (locals.user.type !== 'admin' && locals.user.type !== 'kepala_sekolah') {
		if (!isAuthorizedUser(['administrasi_dinas_luar'], locals.user)) {
			throw error(403, { message: 'Akses tidak diizinkan' });
		}
	}

	await ensureDinasLuarSchema();

	const idParam = url.searchParams.get('id');
	const id = Number(idParam);
	if (!Number.isInteger(id) || id <= 0) {
		throw error(400, { message: 'ID tidak valid' });
	}

	const existing = await db.query.tableDinasLuarPermohonan.findFirst({
		where: eq(tableDinasLuarPermohonan.id, id),
		columns: { id: true, sekolahId: true, authUserId: true, undanganFile: true }
	});
	if (!existing) {
		throw error(404, { message: 'Data tidak ditemukan' });
	}
	if (locals.user.type !== 'admin' && locals.user.type !== 'kepala_sekolah') {
		if (existing.authUserId !== locals.user.id) {
			throw error(403, { message: 'Tidak dapat menghapus permohonan pengguna lain' });
		}
	} else if (locals.sekolah?.id && existing.sekolahId !== locals.sekolah.id) {
		throw error(403, { message: 'Tidak dapat menghapus permohonan sekolah lain' });
	}

	// Keep the undangan file if it was carried over to an approved SPPD; it is
	// now owned by that SPPD and must survive permohonan deletion.
	const referencedBySppd = existing.undanganFile
		? await db.query.tableSppd.findFirst({
				where: eq(tableSppd.undanganFile, existing.undanganFile),
				columns: { id: true }
			})
		: undefined;
	if (!referencedBySppd) {
		await deleteUndanganFile(existing.undanganFile);
	}
	await db.delete(tableDinasLuarPermohonan).where(eq(tableDinasLuarPermohonan.id, id));

	return json({ message: 'Permohonan perjalanan dinas berhasil dihapus' });
};
