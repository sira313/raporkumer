import db from '$lib/server/db';
import {
	tableAsesmenFormatif,
	tableMataPelajaran,
	tableMurid,
	tableTujuanPembelajaran
} from '$lib/server/db/schema';
import { ensureAsesmenFormatifSchema } from '$lib/server/db/ensure-asesmen-formatif';
import { asc, and, eq, inArray } from 'drizzle-orm';

const CATEGORY_LABEL: Record<ProgressCategory, string> = {
	'sangat-baik': 'Sangat baik',
	baik: 'Baik',
	'perlu-pendalaman': 'Perlu pendalaman',
	'perlu-bimbingan': 'Perlu bimbingan'
};

const DEFAULT_LINGKUP = 'Tanpa lingkup materi';

type ProgressCategory = 'sangat-baik' | 'baik' | 'perlu-pendalaman' | 'perlu-bimbingan';

type ProgressSummaryPart = {
	kategori: ProgressCategory;
	kategoriLabel: string;
	lingkupMateri: string;
	tuntas: number;
	totalTujuan: number;
};

function resolveCategory(tuntas: number, total: number): ProgressCategory {
	if (total <= 0) return 'perlu-bimbingan';
	const ratio = tuntas / total;
	if (ratio >= 1) return 'sangat-baik';
	if (ratio >= 2 / 3) return 'baik';
	if (ratio >= 0.5) return 'perlu-pendalaman';
	return 'perlu-bimbingan';
}

function buildSummarySentence(parts: ProgressSummaryPart[]): string | null {
	if (!parts.length) return null;
	const formatted = parts.map((part, index) => {
		const kategoriLabel = index === 0 ? part.kategoriLabel : part.kategoriLabel.toLowerCase();
		const lingkup = part.lingkupMateri.toLowerCase();
		return `${kategoriLabel} dalam materi ${lingkup} (${part.tuntas}/${part.totalTujuan} TP)`;
	});
	let sentence = '';
	if (formatted.length === 1) {
		sentence = formatted[0];
	} else if (formatted.length === 2) {
		sentence = `${formatted[0]} dan ${formatted[1]}`;
	} else {
		sentence = `${formatted.slice(0, -1).join(', ')}, dan ${formatted.at(-1)}`;
	}
	if (!sentence) return null;
	const capitalized = sentence.charAt(0).toUpperCase() + sentence.slice(1);
	return capitalized.endsWith('.') ? capitalized : `${capitalized}.`;
}

export async function load({ parent, url, depends }) {
	depends('app:asesmen-formatif');
	const { kelasAktif } = await parent();
	const meta: PageMeta = { title: 'Asesmen Formatif' };

	if (!kelasAktif?.id) {
		return {
			meta,
			mapelList: [],
			selectedMapelId: null,
			selectedMapel: null,
			tujuanGroups: [] as Array<{ lingkupMateri: string; totalTujuan: number }>,
			jumlahTujuan: 0,
			daftarMurid: []
		};
	}

	const mapelList = await db.query.tableMataPelajaran.findMany({
		columns: { id: true, nama: true },
		where: eq(tableMataPelajaran.kelasId, kelasAktif.id),
		orderBy: asc(tableMataPelajaran.nama)
	});

	const requestedMapelId = Number(url.searchParams.get('mapel_id'));
	let selectedMapel = Number.isInteger(requestedMapelId)
		? mapelList.find((item) => item.id === requestedMapelId) ?? null
		: null;
	if (!selectedMapel && mapelList.length) {
		selectedMapel = mapelList[0];
	}

	const selectedMapelId = selectedMapel?.id ?? null;

	const muridList = await db.query.tableMurid.findMany({
		columns: { id: true, nama: true },
		where: eq(tableMurid.kelasId, kelasAktif.id),
		orderBy: asc(tableMurid.nama)
	});

	if (!selectedMapel) {
		return {
			meta,
			mapelList,
			selectedMapelId,
			selectedMapel: null,
			tujuanGroups: [] as Array<{ lingkupMateri: string; totalTujuan: number }>,
			jumlahTujuan: 0,
			daftarMurid: muridList.map((murid, index) => ({
				id: murid.id,
				nama: murid.nama,
				no: index + 1,
				progressText: null,
				progressSummaryParts: [] as ProgressSummaryPart[],
				hasPenilaian: false,
				nilaiHref: null
			}))
		};
	}

	await ensureAsesmenFormatifSchema();

	const tujuanPembelajaran = await db.query.tableTujuanPembelajaran.findMany({
		columns: { id: true, lingkupMateri: true },
		where: eq(tableTujuanPembelajaran.mataPelajaranId, selectedMapel.id),
		orderBy: [asc(tableTujuanPembelajaran.lingkupMateri), asc(tableTujuanPembelajaran.id)]
	});

	const groupedTujuan = tujuanPembelajaran.reduce(
		(groups, tujuan) => {
			const lingkup = tujuan.lingkupMateri?.trim() || DEFAULT_LINGKUP;
			let group = groups.get(lingkup);
			if (!group) {
				group = [];
				groups.set(lingkup, group);
			}
			group.push(tujuan);
			return groups;
		},
		new Map<string, typeof tujuanPembelajaran>()
	);

	const tujuanIds = tujuanPembelajaran.map((item) => item.id);
	const muridIds = muridList.map((murid) => murid.id);

	const asesmenRecords =
		muridIds.length && tujuanIds.length
			? await db.query.tableAsesmenFormatif.findMany({
				columns: {
					muridId: true,
					tujuanPembelajaranId: true,
					tuntas: true
				},
				where: and(
					eq(tableAsesmenFormatif.mataPelajaranId, selectedMapel.id),
					inArray(tableAsesmenFormatif.muridId, muridIds),
					inArray(tableAsesmenFormatif.tujuanPembelajaranId, tujuanIds)
				)
			})
			: [];

	const asesmenByMurid = new Map<number, Map<number, boolean>>();
	for (const record of asesmenRecords) {
		let muridMap = asesmenByMurid.get(record.muridId);
		if (!muridMap) {
			muridMap = new Map();
			asesmenByMurid.set(record.muridId, muridMap);
		}
		muridMap.set(record.tujuanPembelajaranId, Boolean(record.tuntas));
	}

	const daftarMurid = muridList.map((murid, index) => {
		const asesmen = asesmenByMurid.get(murid.id) ?? new Map();
		const parts: ProgressSummaryPart[] = [];

		for (const [lingkupMateri, tujuan] of groupedTujuan.entries()) {
			const totalTujuan = tujuan.length;
			const tuntas = tujuan.reduce(
				(count, item) => count + (asesmen.get(item.id) ? 1 : 0),
				0
			);
			const kategori = resolveCategory(tuntas, totalTujuan);
			parts.push({
				kategori,
				kategoriLabel: CATEGORY_LABEL[kategori],
				lingkupMateri,
				tuntas,
				totalTujuan
			});
		}

		const hasPenilaian = asesmen.size > 0;
		let progressText: string | null = null;
		let progressSummaryParts = parts.filter((part) => part.totalTujuan > 0);

		if (!tujuanPembelajaran.length) {
			progressText = 'Belum ada tujuan pembelajaran pada mata pelajaran ini.';
			progressSummaryParts = [];
		} else if (!hasPenilaian) {
			progressText = 'Belum ada nilai.';
			progressSummaryParts = [];
		} else if (!progressSummaryParts.length) {
			progressText = 'Belum ada nilai.';
		}

		if (!progressText && progressSummaryParts.length) {
			progressText = buildSummarySentence(progressSummaryParts) ?? 'Belum ada nilai.';
		}

		return {
			id: murid.id,
			nama: murid.nama,
			no: index + 1,
			progressText,
			progressSummaryParts,
			hasPenilaian,
			nilaiHref: `/asesmen-formatif/formulir-asesmen?murid_id=${murid.id}&mapel_id=${selectedMapel.id}`
		};
	});

	return {
		meta,
		mapelList,
		selectedMapelId,
		selectedMapel,
		tujuanGroups: Array.from(groupedTujuan.entries(), ([lingkupMateri, tujuan]) => ({
			lingkupMateri,
			totalTujuan: tujuan.length
		})),
		jumlahTujuan: tujuanPembelajaran.length,
		daftarMurid
	};
}
