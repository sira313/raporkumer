import db from '$lib/server/db';
import { resolveSekolahAcademicContext } from '$lib/server/db/academic';
import { tableKelas } from '$lib/server/db/schema';
import { cookieNames, findTitleByPath } from '$lib/utils.js';
import { redirect } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';

export async function load({ url, locals, cookies }) {
	const meta: PageMeta = {
		title: url.pathname === '/' ? 'Rapor Kurikulum Merdeka' : findTitleByPath(url.pathname),
		description: ''
	};

	const sekolah = locals.sekolah;
	const user = locals.user ?? null;
	const academicContext = sekolah?.id ? await resolveSekolahAcademicContext(sekolah.id) : null;
	const daftarKelas = sekolah?.id
		? await db.query.tableKelas.findMany({
				columns: { id: true, nama: true, fase: true },
				with: { waliKelas: { columns: { id: true, nama: true } } },
				where: academicContext?.activeSemesterId
					? and(
							eq(tableKelas.sekolahId, sekolah.id),
							eq(tableKelas.semesterId, academicContext.activeSemesterId)
						)
					: eq(tableKelas.sekolahId, sekolah.id),
				orderBy: asc(tableKelas.nama)
			})
		: [];

	const kelasIdParam = url.searchParams.get('kelas_id');
	const kelasCookie = cookies.get(cookieNames.ACTIVE_KELAS_ID);

	let kelasAktif: (typeof daftarKelas)[number] | null = null;

	// 1) If explicit param provided, prefer it
	if (kelasIdParam != null) {
		const kelasIdNumber = Number(kelasIdParam);
		if (Number.isInteger(kelasIdNumber)) {
			// If the current user is a wali_kelas, they may only access their own kelas
			// unless they have explicit permission `kelas_akses_lain`.
			if (user) {
				const userWithType = user as { type?: string; kelasId?: number };
				if (userWithType.type === 'wali_kelas' && Number.isInteger(Number(userWithType.kelasId))) {
					const allowed = Number(userWithType.kelasId);
					if (kelasIdNumber !== allowed) {
						// Check permission to access other kelas
						const authUser = user as AuthUser;
						const hasAccessOther = Array.isArray(authUser.permissions)
							? authUser.permissions.includes('kelas_akses_lain')
							: false;
						if (!hasAccessOther) {
							// Deny access when a wali_kelas tries to switch to another kelas via URL param
							throw redirect(303, `/forbidden?required=kelas_id`);
						}
					}
				}
			}
			kelasAktif = daftarKelas.find((kelas) => kelas.id === kelasIdNumber) ?? null;
		}
	}

	// 2) If no explicit param, and the user is a wali_kelas, prefer their assigned kelas
	if (!kelasAktif && user) {
		const userWithType = user as { type?: string; kelasId?: number };
		if (userWithType.type === 'wali_kelas' && userWithType.kelasId) {
			const waliKelasId = Number(userWithType.kelasId);
			if (Number.isInteger(waliKelasId)) {
				// prefer kelas from daftarKelas (same semester), otherwise attempt to load the kelas by id
				kelasAktif = daftarKelas.find((kelas) => kelas.id === waliKelasId) ?? null;
				if (!kelasAktif) {
					// load the kelas record by id even if it's not in the current semester list
					const kelasRecord = await db.query.tableKelas.findFirst({
						columns: { id: true, nama: true, fase: true },
						with: { waliKelas: { columns: { id: true, nama: true } } },
						where: eq(tableKelas.id, waliKelasId)
					});
					if (kelasRecord) kelasAktif = kelasRecord;
				}
			}
		}
	}

	// 3) Next, fall back to cookie candidate
	if (!kelasAktif && kelasCookie) {
		const kelasCookieNumber = Number(kelasCookie);
		if (Number.isInteger(kelasCookieNumber)) {
			kelasAktif = daftarKelas.find((kelas) => kelas.id === kelasCookieNumber) ?? null;
		}
	}

	// If no explicit candidate, and the user is a wali_kelas, prefer their assigned kelas
	if (!kelasAktif && user) {
		const userWithType = user as { type?: string; kelasId?: number };
		if (userWithType.type === 'wali_kelas' && userWithType.kelasId) {
			const waliKelasId = Number(userWithType.kelasId);
			if (Number.isInteger(waliKelasId)) {
				kelasAktif = daftarKelas.find((kelas) => kelas.id === waliKelasId) ?? null;
			}
		}
	}

	if (!kelasAktif && daftarKelas.length) {
		kelasAktif = daftarKelas[0];
	}

	const secure = locals.requestIsSecure ?? false;
	if (kelasAktif) {
		cookies.set(cookieNames.ACTIVE_KELAS_ID, String(kelasAktif.id), {
			path: '/',
			secure
		});
	} else {
		cookies.delete(cookieNames.ACTIVE_KELAS_ID, { path: '/', secure });
	}

	return { sekolah, meta, daftarKelas, kelasAktif, user };
}
