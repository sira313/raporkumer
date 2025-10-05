import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import db from '$lib/server/db';
import { tableMurid } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

function requireInteger(paramName: string, value: string | null): number {
	if (!value) {
		throw error(400, `Parameter ${paramName} wajib diisi.`);
	}
	const parsed = Number(value);
	if (!Number.isInteger(parsed)) {
		throw error(400, `Parameter ${paramName} tidak valid.`);
	}
	return parsed;
}

function optionalInteger(paramName: string, value: string | null): number | null {
	if (!value) return null;
	const parsed = Number(value);
	if (!Number.isInteger(parsed)) {
		throw error(400, `Parameter ${paramName} tidak valid.`);
	}
	return parsed;
}

function buildLogoUrl(sekolah: NonNullable<App.Locals['sekolah']>): string | null {
	if (!sekolah.id) return null;
	const updatedAt = sekolah.updatedAt ? Date.parse(sekolah.updatedAt) : NaN;
	const suffix = Number.isFinite(updatedAt) ? `?v=${updatedAt}` : '';
	return `/sekolah/logo${suffix}`;
}

export const load = (async ({ locals, url, depends }) => {
	depends('app:cetak-cover');

	const sekolah = locals.sekolah;
	if (!sekolah?.id) {
		throw error(404, 'Sekolah tidak ditemukan.');
	}

	const muridId = requireInteger('murid_id', url.searchParams.get('murid_id'));
	const kelasId = optionalInteger('kelas_id', url.searchParams.get('kelas_id'));

	const murid = await db.query.tableMurid.findFirst({
		columns: {
			id: true,
			kelasId: true,
			nama: true,
			nis: true,
			nisn: true
		},
		where: and(
			eq(tableMurid.id, muridId),
			eq(tableMurid.sekolahId, sekolah.id),
			kelasId ? eq(tableMurid.kelasId, kelasId) : undefined
		)
	});

	if (!murid) {
		throw error(404, 'Data murid tidak ditemukan.');
	}

	if (kelasId && murid.kelasId !== kelasId) {
		throw error(400, 'Murid tidak terdaftar pada kelas yang diminta.');
	}

	const coverData: CoverPrintData = {
		sekolah: {
			nama: sekolah.nama,
			logoUrl: buildLogoUrl(sekolah)
		},
		murid: {
			nama: murid.nama,
			nis: murid.nis ?? '',
			nisn: murid.nisn ?? ''
		}
	};

	return {
		meta: {
			title: `Cover Rapor - ${murid.nama}`
		},
		coverData
	};
}) satisfies PageServerLoad;
