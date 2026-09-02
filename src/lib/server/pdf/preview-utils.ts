import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import db from '$lib/server/db';
import { tableSekolah } from '$lib/server/db/schema';

export function requireInteger(paramName: string, value: string | null): number {
	if (!value) {
		throw error(400, `Parameter ${paramName} wajib diisi.`);
	}
	const parsed = Number(value);
	if (!Number.isInteger(parsed)) {
		throw error(400, `Parameter ${paramName} tidak valid.`);
	}
	return parsed;
}

export function optionalInteger(paramName: string, value: string | null): number | null {
	if (!value) return null;
	const parsed = Number(value);
	if (!Number.isInteger(parsed)) {
		throw error(400, `Parameter ${paramName} tidak valid.`);
	}
	return parsed;
}

const LOCALE_ID = 'id-ID';

const LOGO_CACHE_TTL = 60_000;
const logoSrcCache = new Map<number, { src: string; expires: number }>();
const logoDinasSrcCache = new Map<number, { src: string; expires: number }>();

export function formatTanggal(value: string | Date | null | undefined): string {
	if (!value) return '';
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return new Intl.DateTimeFormat(LOCALE_ID, {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	}).format(date);
}

export async function getLogoSrc(sekolahId: number): Promise<string | null> {
	const cached = logoSrcCache.get(sekolahId);
	if (cached && cached.expires > Date.now()) return cached.src;

	const row = await db.query.tableSekolah.findFirst({
		columns: { logo: true, logoType: true },
		where: eq(tableSekolah.id, sekolahId)
	});
	if (row?.logo?.length) {
		const src = `data:${row.logoType || 'image/png'};base64,${Buffer.from(row.logo).toString('base64')}`;
		logoSrcCache.set(sekolahId, { src, expires: Date.now() + LOGO_CACHE_TTL });
		return src;
	}
	return null;
}

export async function getLogoDinasSrc(sekolahId: number): Promise<string | null> {
	const cached = logoDinasSrcCache.get(sekolahId);
	if (cached && cached.expires > Date.now()) return cached.src;

	const row = await db.query.tableSekolah.findFirst({
		columns: { logoDinas: true, logoDinasType: true },
		where: eq(tableSekolah.id, sekolahId)
	});
	if (row?.logoDinas?.length) {
		const src = `data:${row.logoDinasType || 'image/png'};base64,${Buffer.from(row.logoDinas).toString('base64')}`;
		logoDinasSrcCache.set(sekolahId, { src, expires: Date.now() + LOGO_CACHE_TTL });
		return src;
	}
	return null;
}

export function fallbackTempat(sekolah: NonNullable<App.Locals['sekolah']>): string {
	const explicit = sekolah.lokasiTandaTangan?.trim();
	if (explicit) return explicit;
	const alamat = sekolah.alamat;
	if (!alamat) return '';
	return alamat.kabupaten || alamat.kecamatan || alamat.desa || '';
}

export function composeAlamat(sekolah: NonNullable<App.Locals['sekolah']>): string {
	const alamat = sekolah.alamat;
	if (!alamat) return '';
	const parts = [alamat.jalan, alamat.desa, alamat.kecamatan, alamat.kabupaten, alamat.provinsi]
		.map((part) => (part ?? '').trim())
		.filter(Boolean);
	return parts.join(', ');
}
