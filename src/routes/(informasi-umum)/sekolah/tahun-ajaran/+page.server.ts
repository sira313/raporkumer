import db from '$lib/server/db';
import {
	tableKelas,
	tableSekolah,
	tableSemester,
	tableTahunAjaran
} from '$lib/server/db/schema';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

const meta: PageMeta = {
	title: 'Tahun Ajaran',
	description: 'Pengelolaan tahun ajaran per sekolah'
};

type TahunAjaranWithMeta = typeof tableTahunAjaran.$inferSelect & {
	semester: typeof tableSemester.$inferSelect[];
	rombel: number;
};

async function getTahunAjaran(sekolahId: number): Promise<TahunAjaranWithMeta[]> {
	const tahunAjaranRows = await db.query.tableTahunAjaran.findMany({
		where: eq(tableTahunAjaran.sekolahId, sekolahId),
		orderBy: [desc(tableTahunAjaran.id)],
		with: { semester: true }
	});

	const kelasCounts = await db
		.select({
			tahunAjaranId: tableKelas.tahunAjaranId,
			jumlah: sql<number>`count(*)`
		})
		.from(tableKelas)
		.where(eq(tableKelas.sekolahId, sekolahId))
		.groupBy(tableKelas.tahunAjaranId);

	const kelasCountMap = new Map<number, number>();
	for (const row of kelasCounts) {
		if (row.tahunAjaranId) kelasCountMap.set(row.tahunAjaranId, row.jumlah);
	}

	return tahunAjaranRows.map((ta) => ({
		...ta,
		semester: [...ta.semester].sort((a, b) => a.tipe.localeCompare(b.tipe)),
		rombel: kelasCountMap.get(ta.id) ?? 0
	}));
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const sekolahList = await db.query.tableSekolah.findMany({
		columns: { id: true, nama: true },
		orderBy: [desc(tableSekolah.id)]
	});

	if (sekolahList.length === 0) {
		throw redirect(303, '/sekolah/form?init');
	}

	const requestedId = Number(url.searchParams.get('sekolahId'));
	const validRequested = Number.isFinite(requestedId) &&
		sekolahList.some((item) => item.id === requestedId);

	const fallbackId = locals.sekolah?.id &&
		sekolahList.some((item) => item.id === locals.sekolah?.id)
		? locals.sekolah?.id
		: sekolahList[0]?.id;

	const selectedSekolahId = validRequested ? requestedId : fallbackId ?? null;

	const selectedSekolah = selectedSekolahId
		? await db.query.tableSekolah.findFirst({
			columns: {
				id: true,
				nama: true,
				npsn: true,
				jenjangPendidikan: true
			},
			where: eq(tableSekolah.id, selectedSekolahId)
		})
		: null;

	const tahunAjaran = selectedSekolahId ? await getTahunAjaran(selectedSekolahId) : [];

	return {
		meta,
		sekolahList,
		selectedSekolahId,
		selectedSekolah,
		tahunAjaran
	};
};

export const actions: Actions = {
	create: async ({ request }) => {
		const formData = await request.formData();
		const nama = (formData.get('nama') as string | null)?.trim();
		const sekolahId = Number(formData.get('sekolahId'));

		if (!sekolahId || Number.isNaN(sekolahId)) {
			return fail(400, { fail: 'Pilih sekolah terlebih dahulu.' });
		}

		if (!nama) {
			return fail(400, { fail: 'Nama tahun ajaran wajib diisi.' });
		}

		const sekolah = await db.query.tableSekolah.findFirst({
			columns: { id: true },
			where: eq(tableSekolah.id, sekolahId)
		});

		if (!sekolah) {
			return fail(404, { fail: 'Data sekolah tidak ditemukan.' });
		}

		await db.transaction(async (tx) => {
			const [tahunAjaran] = await tx
				.insert(tableTahunAjaran)
				.values({ sekolahId, nama })
				.returning({ id: tableTahunAjaran.id });

			if (!tahunAjaran?.id) {
				throw fail(500, { fail: 'Gagal menyimpan tahun ajaran.' });
			}

			await tx.insert(tableSemester).values([
				{
					tahunAjaranId: tahunAjaran.id,
					tipe: 'ganjil',
					nama: 'Semester Ganjil'
				},
				{
					tahunAjaranId: tahunAjaran.id,
					tipe: 'genap',
					nama: 'Semester Genap'
				}
			]);
		});

		return {
			message: 'Tahun ajaran baru ditambahkan.',
			tahunAjaran: await getTahunAjaran(sekolahId)
		};
	},
	update: async ({ request }) => {
		const formData = await request.formData();
		const tahunAjaranId = Number(formData.get('id'));
		const sekolahId = Number(formData.get('sekolahId'));
		const nama = (formData.get('nama') as string | null)?.trim();

		if (!sekolahId || Number.isNaN(sekolahId)) {
			return fail(400, { fail: 'Pilih sekolah terlebih dahulu.' });
		}

		if (!tahunAjaranId || Number.isNaN(tahunAjaranId)) {
			return fail(400, { fail: 'Identitas tahun ajaran tidak valid.' });
		}

		if (!nama) {
			return fail(400, { fail: 'Nama tahun ajaran wajib diisi.' });
		}

		const tahunAjaran = await db.query.tableTahunAjaran.findFirst({
			where: and(eq(tableTahunAjaran.id, tahunAjaranId), eq(tableTahunAjaran.sekolahId, sekolahId))
		});

		if (!tahunAjaran) {
			return fail(404, { fail: 'Data tahun ajaran tidak ditemukan.' });
		}

		await db
			.update(tableTahunAjaran)
			.set({ nama })
			.where(eq(tableTahunAjaran.id, tahunAjaranId));

		return {
			message: 'Tahun ajaran diperbarui.',
			tahunAjaran: await getTahunAjaran(sekolahId)
		};
	},
	delete: async ({ request }) => {
		const formData = await request.formData();
		const sekolahId = Number(formData.get('sekolahId'));
		const idsRaw = formData.getAll('ids');
		const ids = idsRaw.map((val) => Number(val)).filter((val) => Number.isFinite(val));

		if (!sekolahId || Number.isNaN(sekolahId)) {
			return fail(400, { fail: 'Pilih sekolah terlebih dahulu.' });
		}

		if (!ids.length) {
			return fail(400, { fail: 'Tidak ada tahun ajaran terpilih.' });
		}

		await db
			.delete(tableTahunAjaran)
			.where(and(eq(tableTahunAjaran.sekolahId, sekolahId), inArray(tableTahunAjaran.id, ids)));

		return {
			message: 'Tahun ajaran terhapus.',
			tahunAjaran: await getTahunAjaran(sekolahId)
		};
	}
};
