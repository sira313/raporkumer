import db from '$lib/server/db';
import { resolveSekolahAcademicContext } from '$lib/server/db/academic';
import { tableKelas } from '$lib/server/db/schema';
import { cookieNames, findTitleByPath } from '$lib/utils.js';
import { and, asc, eq } from 'drizzle-orm';

export async function load({ url, locals, cookies }) {
	const meta: PageMeta = {
		title: url.pathname === '/' ? 'Rapor Kurikulum Merdeka' : findTitleByPath(url.pathname),
		description: ''
	};

	const sekolah = locals.sekolah;
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
	const kelasCandidate = kelasIdParam ?? kelasCookie ?? null;

	let kelasAktif: (typeof daftarKelas)[number] | null = null;
	if (kelasCandidate != null) {
		const kelasIdNumber = Number(kelasCandidate);
		if (Number.isInteger(kelasIdNumber)) {
			kelasAktif = daftarKelas.find((kelas) => kelas.id === kelasIdNumber) ?? null;
		}
	}

	if (!kelasAktif && daftarKelas.length) {
		kelasAktif = daftarKelas[0];
	}

	if (kelasAktif) {
		cookies.set(cookieNames.ACTIVE_KELAS_ID, String(kelasAktif.id), { path: '/' });
	} else {
		cookies.delete(cookieNames.ACTIVE_KELAS_ID, { path: '/' });
	}

	return { sekolah, meta, daftarKelas, kelasAktif };
}
