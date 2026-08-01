import { dev } from '$app/environment';
import db from '$lib/server/db';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import {
	tableAuthUser,
	tableAuthUserKelas,
	tableAuthUserMataPelajaran,
	tableKelas,
	tableMataPelajaran,
	tablePresensiGuru,
	tablePresensiSettings
} from '$lib/server/db/schema';
import { resolveSekolahAcademicContext } from '$lib/server/db/academic';
import { buildLiburDates, buildRedDaysByType } from './absen/libur';
import { dateStr, getDaysInMonth, isSaturday, isSunday } from './absen/utils';

/**
 * Dev-only: allow overriding "now" via ?tanggal-jam=YYYY-MM-DDTHH:mm so the
 * presensi flow can be simulated. Ignored in production builds.
 */
export function parseSimulatedNow(value: string | null | undefined): Date | undefined {
	if (!value || !dev) return undefined;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? undefined : d;
}

export type PresensiGuruStatus = {
	ready: boolean;
	message: string;
	shouldPrompt: boolean;
	tanggal: string;
	isSchoolDay: boolean;
	inWindow: boolean;
	hasDoneToday: boolean;
	jamMasuk: string | null;
	jamPulang: string | null;
	hariSekolah: number | null;
	status: PresensiGuruStatusValue | null;
};

export type PresensiGuruStatusValue = 'hadir' | 'izin' | 'sakit' | 'dinas_luar';

function baseStatus(tanggal: string): PresensiGuruStatus {
	return {
		ready: false,
		message: '',
		shouldPrompt: false,
		tanggal,
		isSchoolDay: false,
		inWindow: false,
		hasDoneToday: false,
		jamMasuk: null,
		jamPulang: null,
		hariSekolah: null,
		status: null
	};
}

export async function getPresensiGuruStatus(
	sekolahId: number | null,
	userId: number,
	now: Date = new Date()
): Promise<PresensiGuruStatus> {
	const tanggal = dateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());
	const result = baseStatus(tanggal);

	if (!sekolahId) {
		result.message = 'Sekolah belum diatur.';
		return result;
	}

	const academic = await resolveSekolahAcademicContext(sekolahId);
	const tahunAjaranId = academic.activeTahunAjaranId;
	if (!tahunAjaranId) {
		result.message = 'Tahun ajaran belum diatur.';
		return result;
	}

	const settings = await db.query.tablePresensiSettings.findFirst({
		where: and(
			eq(tablePresensiSettings.sekolahId, sekolahId),
			eq(tablePresensiSettings.tahunAjaranId, tahunAjaranId)
		)
	});
	if (!settings) {
		result.message = 'Pengaturan presensi belum diatur di halaman Akademik.';
		return result;
	}

	const [thn, bln, hri] = tanggal.split('-').map(Number);
	const hariSekolah = settings.hariSekolah ?? 6;
	const isWeekend =
		hariSekolah === 5
			? isSaturday(thn, bln, hri) || isSunday(thn, bln, hri)
			: isSunday(thn, bln, hri);
	const liburDates = buildLiburDates(settings, thn, bln);
	const isSchoolDay = !isWeekend && !liburDates.has(tanggal);

	const existing = await db.query.tablePresensiGuru.findFirst({
		columns: { id: true, status: true },
		where: and(
			eq(tablePresensiGuru.sekolahId, sekolahId),
			eq(tablePresensiGuru.authUserId, userId),
			eq(tablePresensiGuru.tanggal, tanggal)
		)
	});

	const jamMasuk = settings.jamMasuk ?? '07:30';
	const jamPulang = settings.jamPulang ?? '15:00';
	const [hMasuk, mMasuk] = jamMasuk.split(':').map(Number);
	const [hPulang, mPulang] = jamPulang.split(':').map(Number);
	const masukMin =
		(Number.isFinite(hMasuk) ? hMasuk : 7) * 60 + (Number.isFinite(mMasuk) ? mMasuk : 30);
	const pulangMin =
		(Number.isFinite(hPulang) ? hPulang : 15) * 60 + (Number.isFinite(mPulang) ? mPulang : 0);
	const nowMin = now.getHours() * 60 + now.getMinutes();
	const inWindow = nowMin >= masukMin && nowMin <= pulangMin;

	return {
		ready: true,
		message: '',
		shouldPrompt: isSchoolDay && inWindow && !existing,
		tanggal,
		isSchoolDay,
		inWindow,
		hasDoneToday: !!existing,
		jamMasuk,
		jamPulang,
		hariSekolah,
		status: (existing?.status as PresensiGuruStatusValue | null) ?? null
	};
}

export async function savePresensiGuru(
	params: {
		sekolahId: number | null;
		userId: number;
		status: PresensiGuruStatusValue;
		tandaTangan?: string | null;
		keterangan?: string | null;
	},
	now: Date = new Date()
): Promise<void> {
	const { userId, status, tandaTangan, keterangan } = params;

	if (!params.sekolahId) {
		throw new Error('Sekolah belum diatur.');
	}
	const sekolahId = params.sekolahId;

	const check = await getPresensiGuruStatus(sekolahId, userId, now);
	if (!check.isSchoolDay) {
		throw new Error('Hari ini bukan hari sekolah.');
	}
	if (!check.inWindow) {
		throw new Error('Presensi guru hanya dapat dilakukan antara jam masuk dan jam pulang.');
	}

	const academic = await resolveSekolahAcademicContext(sekolahId);
	const tahunAjaranId = academic.activeTahunAjaranId;
	const semesterId = academic.activeSemesterId;
	if (!tahunAjaranId || !semesterId) {
		throw new Error('Tahun ajaran atau semester belum diatur.');
	}

	const tanggal = dateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());
	await db
		.insert(tablePresensiGuru)
		.values({
			sekolahId,
			tahunAjaranId,
			semesterId,
			authUserId: userId,
			tanggal,
			status,
			waktu: now.toISOString(),
			tandaTangan: tandaTangan || null,
			keterangan: keterangan || null
		})
		.onConflictDoUpdate({
			target: [
				tablePresensiGuru.sekolahId,
				tablePresensiGuru.authUserId,
				tablePresensiGuru.tanggal
			],
			set: {
				status,
				tandaTangan: tandaTangan || null,
				keterangan: keterangan || null,
				updatedAt: new Date().toISOString()
			}
		});
}

export async function getPresensiGuruSettings(
	sekolahId: number | null
): Promise<typeof tablePresensiSettings.$inferSelect | null> {
	if (!sekolahId) return null;
	const academic = await resolveSekolahAcademicContext(sekolahId);
	if (!academic.activeTahunAjaranId) return null;
	return (
		(await db.query.tablePresensiSettings.findFirst({
			where: and(
				eq(tablePresensiSettings.sekolahId, sekolahId),
				eq(tablePresensiSettings.tahunAjaranId, academic.activeTahunAjaranId)
			)
		})) ?? null
	);
}

export type GuruSekolah = { id: number; nama: string };

/**
 * All "guru" (non-admin, non-wali_asuh) accounts belonging to a sekolah.
 * Membership resolves via auth_user.sekolahId, auth_user.kelasId,
 * auth_user_kelas, or auth_user_mata_pelajaran (-> mapel -> kelas).
 */
export async function listGuruBySekolah(sekolahId: number): Promise<GuruSekolah[]> {
	const users = await db.query.tableAuthUser.findMany({
		columns: {
			id: true,
			username: true,
			namaLengkap: true,
			type: true,
			sekolahId: true,
			kelasId: true
		},
		with: { pegawai: { columns: { nama: true } } },
		where: and(ne(tableAuthUser.type, 'admin'), ne(tableAuthUser.type, 'wali_asuh'))
	});

	const kelasRows = await db.query.tableKelas.findMany({
		columns: { id: true },
		where: eq(tableKelas.sekolahId, sekolahId)
	});
	const kelasIds = new Set(kelasRows.map((k) => k.id));

	let usersByKelasLink = new Set<number>();
	let usersByMapelLink = new Set<number>();
	if (kelasIds.size) {
		const kelasLinkRows = await db.query.tableAuthUserKelas.findMany({
			columns: { authUserId: true },
			where: inArray(tableAuthUserKelas.kelasId, [...kelasIds])
		});
		usersByKelasLink = new Set(kelasLinkRows.map((r) => r.authUserId));

		const mapelRows = await db.query.tableMataPelajaran.findMany({
			columns: { id: true },
			where: inArray(tableMataPelajaran.kelasId, [...kelasIds])
		});
		const mapelIds = mapelRows.map((m) => m.id);
		if (mapelIds.length) {
			const mapelLinkRows = await db.query.tableAuthUserMataPelajaran.findMany({
				columns: { authUserId: true },
				where: inArray(tableAuthUserMataPelajaran.mataPelajaranId, mapelIds)
			});
			usersByMapelLink = new Set(mapelLinkRows.map((r) => r.authUserId));
		}
	}

	const result: GuruSekolah[] = [];
	for (const u of users) {
		const inSchool =
			u.sekolahId === sekolahId ||
			(u.kelasId != null && kelasIds.has(u.kelasId)) ||
			usersByKelasLink.has(u.id) ||
			usersByMapelLink.has(u.id);
		if (!inSchool) continue;
		const nama = (u.namaLengkap ?? u.pegawai?.nama ?? u.username ?? '').trim();
		if (!nama) continue;
		result.push({ id: u.id, nama });
	}
	result.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
	return result;
}

export type PresensiHarianRow = {
	userId: number;
	nama: string;
	status: PresensiGuruStatusValue | null;
	waktu: string | null;
	tandaTangan: string | null;
	keterangan: string | null;
};

export async function listPresensiHarian(
	sekolahId: number,
	tanggal: string
): Promise<PresensiHarianRow[]> {
	const gurus = await listGuruBySekolah(sekolahId);
	if (!gurus.length) return [];

	const records = await db.query.tablePresensiGuru.findMany({
		columns: {
			authUserId: true,
			status: true,
			waktu: true,
			tandaTangan: true,
			keterangan: true
		},
		where: and(eq(tablePresensiGuru.sekolahId, sekolahId), eq(tablePresensiGuru.tanggal, tanggal))
	});
	const byUser = new Map(records.map((r) => [r.authUserId, r]));

	return gurus.map((g) => {
		const rec = byUser.get(g.id);
		return {
			userId: g.id,
			nama: g.nama,
			status: (rec?.status as PresensiGuruStatusValue | null) ?? null,
			waktu: rec?.waktu ?? null,
			tandaTangan: rec?.tandaTangan ?? null,
			keterangan: rec?.keterangan ?? null
		};
	});
}

export type PresensiBulananStatusPerDay = PresensiGuruStatusValue | 'belum' | '';

export type PresensiBulananRow = {
	userId: number;
	nama: string;
	statusPerDay: PresensiBulananStatusPerDay[];
	signaturesPerDay: string[];
	countHadir: number;
	countIzin: number;
	countSakit: number;
	countDinasLuar: number;
	countBelum: number;
};

export async function listPresensiBulanan(
	sekolahId: number,
	bulan: number,
	tahun: number
): Promise<{
	rows: PresensiBulananRow[];
	redDays: number[];
	weekendDays: number[];
	liburNasionalDays: number[];
	liburSemesterDays: number[];
	totalHariBelajar: number;
	daysInMonth: number;
}> {
	const gurus = await listGuruBySekolah(sekolahId);

	const settings = await getPresensiGuruSettings(sekolahId);
	const daysInMonth = getDaysInMonth(tahun, bulan);
	const hariSekolah = settings?.hariSekolah ?? 6;
	const { weekend, liburNasional, liburSemester } = buildRedDaysByType(
		hariSekolah,
		tahun,
		bulan,
		daysInMonth,
		settings
	);
	const redDays = [...weekend, ...liburNasional, ...liburSemester];

	const monthStart = dateStr(tahun, bulan, 1);
	const monthEnd = dateStr(tahun, bulan, daysInMonth);

	const records = await db.query.tablePresensiGuru.findMany({
		columns: { authUserId: true, tanggal: true, status: true, tandaTangan: true },
		where: and(
			eq(tablePresensiGuru.sekolahId, sekolahId),
			sql`${tablePresensiGuru.tanggal} >= ${monthStart}`,
			sql`${tablePresensiGuru.tanggal} <= ${monthEnd}`
		)
	});

	const byUserDay = new Map<string, PresensiGuruStatusValue>();
	const sigByUserDay = new Map<string, string | null>();
	for (const r of records) {
		byUserDay.set(`${r.authUserId}:${r.tanggal}`, r.status as PresensiGuruStatusValue);
		sigByUserDay.set(`${r.authUserId}:${r.tanggal}`, r.tandaTangan);
	}

	const rows: PresensiBulananRow[] = gurus.map((g) => {
		let countHadir = 0;
		let countIzin = 0;
		let countSakit = 0;
		let countDinasLuar = 0;
		let countBelum = 0;
		const statusPerDay: PresensiBulananStatusPerDay[] = [];
		const signaturesPerDay: string[] = [];

		for (let d = 1; d <= daysInMonth; d++) {
			if (redDays.includes(d)) {
				statusPerDay.push('');
				signaturesPerDay.push('');
				continue;
			}
			const status = byUserDay.get(`${g.id}:${dateStr(tahun, bulan, d)}`);
			if (!status) {
				statusPerDay.push('belum');
				signaturesPerDay.push('');
				countBelum++;
			} else {
				statusPerDay.push(status);
				signaturesPerDay.push(sigByUserDay.get(`${g.id}:${dateStr(tahun, bulan, d)}`) ?? '');
				if (status === 'hadir') countHadir++;
				else if (status === 'izin') countIzin++;
				else if (status === 'sakit') countSakit++;
				else if (status === 'dinas_luar') countDinasLuar++;
			}
		}

		return {
			userId: g.id,
			nama: g.nama,
			statusPerDay,
			signaturesPerDay,
			countHadir,
			countIzin,
			countSakit,
			countDinasLuar,
			countBelum
		};
	});

	return {
		rows,
		redDays,
		weekendDays: weekend,
		liburNasionalDays: liburNasional,
		liburSemesterDays: liburSemester,
		totalHariBelajar: daysInMonth - redDays.length,
		daysInMonth
	};
}

export async function savePresensiGuruAdmin(params: {
	sekolahId: number;
	userId: number;
	tanggal: string;
	status: PresensiGuruStatusValue;
	tandaTangan?: string | null;
	keterangan?: string | null;
	now?: Date;
}): Promise<void> {
	const { userId, tanggal, status, tandaTangan, keterangan } = params;
	const now = params.now ?? new Date();

	const existing = await db.query.tablePresensiGuru.findFirst({
		columns: { id: true, tandaTangan: true },
		where: and(
			eq(tablePresensiGuru.sekolahId, params.sekolahId),
			eq(tablePresensiGuru.authUserId, userId),
			eq(tablePresensiGuru.tanggal, tanggal)
		)
	});

	const effectiveSignature = tandaTangan || existing?.tandaTangan || null;
	if (status === 'hadir' && !effectiveSignature) {
		throw new Error('Paraf wajib diisi untuk status Hadir.');
	}

	const academic = await resolveSekolahAcademicContext(params.sekolahId);
	const tahunAjaranId = academic.activeTahunAjaranId;
	const semesterId = academic.activeSemesterId;
	if (!tahunAjaranId || !semesterId) {
		throw new Error('Tahun ajaran atau semester belum diatur.');
	}

	await db
		.insert(tablePresensiGuru)
		.values({
			sekolahId: params.sekolahId,
			tahunAjaranId,
			semesterId,
			authUserId: userId,
			tanggal,
			status,
			waktu: now.toISOString(),
			tandaTangan: effectiveSignature,
			keterangan: keterangan || null
		})
		.onConflictDoUpdate({
			target: [
				tablePresensiGuru.sekolahId,
				tablePresensiGuru.authUserId,
				tablePresensiGuru.tanggal
			],
			set: {
				status,
				tandaTangan: effectiveSignature,
				keterangan: keterangan || null,
				updatedAt: new Date().toISOString()
			}
		});
}
