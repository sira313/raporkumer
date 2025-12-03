import db from '$lib/server/db';
import { tableKeasramaan, tableKeasramaanIndikator } from '$lib/server/db/schema';
import { redirect } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';

interface KeasramaanWithIndikator {
	id: number;
	nama: string;
	indikator: Array<{
		id: number;
		deskripsi: string;
	}>;
}

function isTableMissingError(error: unknown) {
	if (error instanceof Error) {
		return error.message.includes('no such table');
	}
	return false;
}

export async function load({ depends, parent }) {
	depends('app:keasramaan');
	const { kelasAktif } = await parent();

	if (!kelasAktif?.id) {
		throw redirect(303, `/forbidden?required=kelas_id`);
	}

	let keasramaanRaw: KeasramaanWithIndikator[] = [];
	let tableReady = true;

	try {
		keasramaanRaw = await db.query.tableKeasramaan.findMany({
			where: eq(tableKeasramaan.kelasId, kelasAktif.id),
			orderBy: asc(tableKeasramaan.createdAt),
			with: { indikator: { orderBy: asc(tableKeasramaanIndikator.createdAt) } }
		});
	} catch (error) {
		if (isTableMissingError(error)) {
			tableReady = false;
			keasramaanRaw = [];
		} else {
			throw error;
		}
	}

	return {
		meta: { title: 'Daftar Nilai Keasramaan' },
		mataEvaluasi: keasramaanRaw,
		tableReady
	};
}
