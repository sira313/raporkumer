import db from '$lib/server/db';
import { tableEkstrakurikuler } from '$lib/server/db/schema';
import { fail, redirect } from '@sveltejs/kit';
import { and, asc, eq, inArray } from 'drizzle-orm';

const TABLE_MISSING_MESSAGE =
	'Tabel ekstrakurikuler belum tersedia. Jalankan "pnpm db:push" untuk menerapkan migrasi terbaru.';

function isDuplicateNameError(error: unknown) {
	return (
		error instanceof Error &&
		error.message.includes('UNIQUE constraint failed') &&
		error.message.includes('ekstrakurikuler') &&
		error.message.includes('kelas_id')
	);
}

function isTableMissingError(error: unknown) {
	return (
		error instanceof Error &&
		error.message.includes('no such table') &&
		error.message.includes('ekstrakurikuler')
	);
}

export async function load({ depends, parent }) {
	depends('app:ekstrakurikuler');
	const { kelasAktif } = await parent();
	const kelasId = kelasAktif?.id ?? null;

	let ekstrakurikulerRaw: Awaited<ReturnType<typeof db.query.tableEkstrakurikuler.findMany>> = [];
	let tableReady = true;

	if (kelasId) {
		try {
			ekstrakurikulerRaw = await db.query.tableEkstrakurikuler.findMany({
				where: eq(tableEkstrakurikuler.kelasId, kelasId),
				orderBy: asc(tableEkstrakurikuler.createdAt)
			});
		} catch (error) {
			if (isTableMissingError(error)) {
				tableReady = false;
				ekstrakurikulerRaw = [];
			} else {
				throw error;
			}
		}
	}

	return {
		kelasId,
		tableReady,
		ekstrakurikuler: ekstrakurikulerRaw
	};
}

export const actions = {
	add: async ({ request, locals }) => {
		const formData = await request.formData();
		const kelasIdRaw = formData.get('kelasId');
		const nama = formData.get('nama')?.toString().trim() ?? '';

		if (!kelasIdRaw) {
			return fail(400, { fail: 'Kelas aktif tidak ditemukan' });
		}

		const kelasId = Number(kelasIdRaw);
		if (!Number.isInteger(kelasId)) {
			return fail(400, { fail: 'Kelas tidak valid' });
		}

		// Server-side permission: wali_kelas may only add for their own kelas
		if (locals?.user && (locals.user as unknown as { type?: string }).type === 'wali_kelas') {
			const u = locals.user as { kelasId?: number; permissions?: string[] };
			const allowed = Number(u.kelasId);
			const hasAccessOther = Array.isArray(u.permissions)
				? u.permissions.includes('kelas_pindah')
				: false;
			if (Number.isInteger(allowed) && kelasId !== allowed && !hasAccessOther) {
				throw redirect(303, `/forbidden?required=kelas_id`);
			}
		}

		if (!nama) {
			return fail(400, { fail: 'Nama ekstrakurikuler wajib diisi' });
		}

		try {
			await db.insert(tableEkstrakurikuler).values({ kelasId, nama });
			return { message: 'Ekstrakurikuler berhasil ditambahkan' };
		} catch (error) {
			if (isTableMissingError(error)) {
				return fail(500, { fail: TABLE_MISSING_MESSAGE });
			}
			if (isDuplicateNameError(error)) {
				return fail(400, { fail: 'Nama ekstrakurikuler sudah digunakan di kelas ini' });
			}
			throw error;
		}
	},

	update: async ({ request, locals }) => {
		const formData = await request.formData();
		const idRaw = formData.get('id');
		const kelasIdRaw = formData.get('kelasId');
		const nama = formData.get('nama')?.toString().trim() ?? '';

		if (!idRaw) {
			return fail(400, { fail: 'ID ekstrakurikuler tidak ditemukan' });
		}

		const id = Number(idRaw);
		if (!Number.isInteger(id) || id <= 0) {
			return fail(400, { fail: 'ID ekstrakurikuler tidak valid' });
		}

		if (!kelasIdRaw) {
			return fail(400, { fail: 'Kelas aktif tidak ditemukan' });
		}

		const kelasId = Number(kelasIdRaw);
		if (!Number.isInteger(kelasId)) {
			return fail(400, { fail: 'Kelas tidak valid' });
		}

		// Server-side permission: wali_kelas may only update for their own kelas
		if (locals?.user && (locals.user as unknown as { type?: string }).type === 'wali_kelas') {
			const u = locals.user as { kelasId?: number; permissions?: string[] };
			const allowed = Number(u.kelasId);
			const hasAccessOther = Array.isArray(u.permissions)
				? u.permissions.includes('kelas_pindah')
				: false;
			if (Number.isInteger(allowed) && kelasId !== allowed && !hasAccessOther) {
				throw redirect(303, `/forbidden?required=kelas_id`);
			}
		}

		if (!nama) {
			return fail(400, { fail: 'Nama ekstrakurikuler wajib diisi' });
		}

		try {
			const updated = await db
				.update(tableEkstrakurikuler)
				.set({ nama, updatedAt: new Date().toISOString() })
				.where(and(eq(tableEkstrakurikuler.id, id), eq(tableEkstrakurikuler.kelasId, kelasId)))
				.returning({ id: tableEkstrakurikuler.id });

			if (!updated.length) {
				return fail(404, { fail: 'Ekstrakurikuler tidak ditemukan atau sudah dihapus' });
			}

			return { message: 'Ekstrakurikuler berhasil diperbarui', id: updated[0].id };
		} catch (error) {
			if (isTableMissingError(error)) {
				return fail(500, { fail: TABLE_MISSING_MESSAGE });
			}
			if (isDuplicateNameError(error)) {
				return fail(400, { fail: 'Nama ekstrakurikuler sudah digunakan di kelas ini' });
			}
			throw error;
		}
	},

	delete: async ({ request, locals }) => {
		const formData = await request.formData();
		const rawIds = formData.getAll('ids');
		const fallbackId = formData.get('id');

		const ids = Array.from(
			new Set(
				[
					...rawIds
						.map((value) => Number(value))
						.filter((id): id is number => Number.isInteger(id) && id > 0),
					...(fallbackId ? [Number(fallbackId)] : [])
				].filter((id): id is number => Number.isInteger(id) && id > 0)
			)
		);

		if (!ids.length) {
			return fail(400, { fail: 'Pilih data ekstrakurikuler yang akan dihapus' });
		}

		try {
			// If caller is wali_kelas without akses_lain, ensure all target rows belong to their kelas
			if (locals?.user && (locals.user as unknown as { type?: string }).type === 'wali_kelas') {
				const u = locals.user as { kelasId?: number; permissions?: string[] };
				const allowed = Number(u.kelasId);
				const hasAccessOther = Array.isArray(u.permissions)
					? u.permissions.includes('kelas_pindah')
					: false;
				if (Number.isInteger(allowed) && !hasAccessOther) {
					const rows = await db.query.tableEkstrakurikuler.findMany({
						columns: { id: true, kelasId: true },
						where: inArray(tableEkstrakurikuler.id, ids)
					});
					const other = rows.some((r) => r.kelasId !== allowed);
					if (other) throw redirect(303, `/forbidden?required=kelas_id`);
				}
			}
			await db.delete(tableEkstrakurikuler).where(inArray(tableEkstrakurikuler.id, ids));
			return { message: `${ids.length} ekstrakurikuler berhasil dihapus` };
		} catch (error) {
			if (isTableMissingError(error)) {
				return fail(500, { fail: TABLE_MISSING_MESSAGE });
			}
			throw error;
		}
	}
};
