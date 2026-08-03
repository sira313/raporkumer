import { redirect } from '@sveltejs/kit';
import { ensurePresensiGuruSchema } from '$lib/server/db/ensure-presensi-guru';
import {
	getPresensiGuruSettings,
	listPresensiBulanan,
	listPresensiHarian,
	parseSimulatedNow
} from '$lib/server/presensi-guru';
import { buildLiburDates } from '$lib/server/absen/libur';
import {
	dateStr,
	isSaturday,
	isSunday,
	isValidDate,
	todayDateString
} from '$lib/server/absen/utils';

const PER_PAGE = 20;

type PageState = {
	search: string | null;
	currentPage: number;
	totalPages: number;
	totalItems: number;
};

type Mode = 'harian' | 'bulanan';

export async function load({ locals, url, depends }) {
	depends('app:presensi-guru');

	if (!locals.user) throw redirect(303, '/login');

	if (locals.user.type !== 'admin' && locals.user.type !== 'kepala_sekolah') {
		throw redirect(303, '/forbidden?required=admin');
	}

	await ensurePresensiGuruSchema();

	const sekolahId = locals.sekolah?.id ?? null;

	const settings = sekolahId ? await getPresensiGuruSettings(sekolahId) : null;

	if (settings?.presensiGuruEnabled === false) {
		return {
			meta: { title: 'Presensi Guru' } satisfies PageMeta,
			disabled: true,
			mode: 'harian' as const,
			rows: [],
			page: { search: null, currentPage: 1, totalPages: 1, totalItems: 0 },
			guruCount: 0,
			tanggal: '',
			bulan: 0,
			tahun: 0,
			daysInMonth: 0,
			redDays: [],
			totalHariBelajar: 0,
			jamMasuk: settings.jamMasuk ?? null,
			jamPulang: settings.jamPulang ?? null,
			isLibur: false,
			isWeekend: false
		};
	}

	const modeParam = url.searchParams.get('mode');
	const mode: Mode = modeParam === 'bulanan' ? 'bulanan' : 'harian';

	const searchParam = url.searchParams.get('q');
	const search = searchParam?.trim() ? searchParam.trim() : null;
	const requestedPage = Number(url.searchParams.get('page')) || 1;
	const pageNumber =
		Number.isFinite(requestedPage) && requestedPage > 0 ? Math.floor(requestedPage) : 1;

	if (mode === 'bulanan') {
		const now = new Date();
		const bulanParam = Number(url.searchParams.get('bulan'));
		const tahunParam = Number(url.searchParams.get('tahun'));
		const bulan =
			Number.isInteger(bulanParam) && bulanParam >= 1 && bulanParam <= 12
				? bulanParam
				: now.getMonth() + 1;
		const tahun =
			Number.isInteger(tahunParam) && tahunParam >= 2000 && tahunParam <= 2099
				? tahunParam
				: now.getFullYear();

		const {
			rows: allRows,
			redDays,
			totalHariBelajar,
			daysInMonth
		} = sekolahId
			? await listPresensiBulanan(sekolahId, bulan, tahun)
			: { rows: [], redDays: [], totalHariBelajar: 0, daysInMonth: 0 };

		const filtered = search
			? allRows.filter((r) => r.nama.toLowerCase().includes(search.toLowerCase()))
			: allRows;

		const total = filtered.length;
		const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
		const currentPage = Math.min(Math.max(pageNumber, 1), totalPages);
		const offset = (currentPage - 1) * PER_PAGE;

		const rows = filtered.slice(offset, offset + PER_PAGE).map((row, index) => ({
			...row,
			no: offset + index + 1
		}));

		const page: PageState = {
			search,
			currentPage,
			totalPages,
			totalItems: total
		};

		return {
			meta: { title: 'Presensi Guru' } satisfies PageMeta,
			mode,
			rows,
			page,
			guruCount: allRows.length,
			tanggal: '',
			bulan,
			tahun,
			daysInMonth,
			redDays,
			totalHariBelajar,
			jamMasuk: settings?.jamMasuk ?? null,
			jamPulang: settings?.jamPulang ?? null,
			isLibur: false,
			isWeekend: false
		};
	}

	const tanggalParam = url.searchParams.get('tanggal');
	let tanggal: string;
	if (tanggalParam && isValidDate(tanggalParam)) {
		tanggal = tanggalParam;
	} else {
		const sim = parseSimulatedNow(url.searchParams.get('tanggal-jam'));
		tanggal = sim
			? dateStr(sim.getFullYear(), sim.getMonth() + 1, sim.getDate())
			: todayDateString();
	}

	const allRows = sekolahId ? await listPresensiHarian(sekolahId, tanggal) : [];

	const filtered = search
		? allRows.filter((r) => r.nama.toLowerCase().includes(search.toLowerCase()))
		: allRows;

	const total = filtered.length;
	const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));
	const currentPage = Math.min(Math.max(pageNumber, 1), totalPages);
	const offset = (currentPage - 1) * PER_PAGE;

	const rows = filtered.slice(offset, offset + PER_PAGE).map((row, index) => ({
		...row,
		no: offset + index + 1
	}));

	const page: PageState = {
		search,
		currentPage,
		totalPages,
		totalItems: total
	};

	let isLibur = false;
	let isWeekend = false;
	if (settings) {
		const [thn, bln, hri] = tanggal.split('-').map(Number);
		const hariSekolah = settings.hariSekolah ?? 6;
		isWeekend =
			hariSekolah === 5
				? isSaturday(thn, bln, hri) || isSunday(thn, bln, hri)
				: isSunday(thn, bln, hri);
		const liburDates = buildLiburDates(settings, thn, bln);
		isLibur = isWeekend || liburDates.has(tanggal);
	}

	return {
		meta: { title: 'Presensi Guru' } satisfies PageMeta,
		mode,
		rows,
		page,
		guruCount: allRows.length,
		tanggal,
		bulan: 0,
		tahun: 0,
		daysInMonth: 0,
		redDays: [],
		totalHariBelajar: 0,
		jamMasuk: settings?.jamMasuk ?? null,
		jamPulang: settings?.jamPulang ?? null,
		isLibur,
		isWeekend
	};
}
