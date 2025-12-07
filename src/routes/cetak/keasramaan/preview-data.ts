import { error } from '@sveltejs/kit';
import { asc, and, eq } from 'drizzle-orm';
import db from '$lib/server/db';
import {
	tableAsesmenKeasramaan,
	tableKeasramaan,
	tableKeasramaanIndikator,
	tableKeasramaanTujuan,
	tableMurid
} from '$lib/server/db/schema';

const LOCALE_ID = 'id-ID';

export type KeasramaanContext = {
	locals: App.Locals;
	url: URL;
};

type PredikatKey = 'perlu-bimbingan' | 'cukup' | 'baik' | 'sangat-baik';

type PredikatMap = {
	[key in PredikatKey]: { label: string; order: number };
};

const PREDIKAT_MAP: PredikatMap = {
	'sangat-baik': { label: 'Sangat Baik', order: 3 },
	baik: { label: 'Baik', order: 2 },
	cukup: { label: 'Cukup', order: 1 },
	'perlu-bimbingan': { label: 'Perlu Bimbingan', order: 0 }
};

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

function composeAlamat(sekolah: NonNullable<App.Locals['sekolah']>): string {
	const alamat = sekolah.alamat;
	if (!alamat) return '';
	const parts = [alamat.jalan, alamat.desa, alamat.kecamatan, alamat.kabupaten, alamat.provinsi]
		.map((part) => (part ?? '').trim())
		.filter(Boolean);
	return parts.join(', ');
}

function formatTanggal(value: string | null | undefined): string {
	if (!value) return '';
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return '';
	return new Intl.DateTimeFormat(LOCALE_ID, {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	}).format(parsed);
}

function fallbackTempat(sekolah: NonNullable<App.Locals['sekolah']>): string {
	const explicit = sekolah.lokasiTandaTangan?.trim();
	if (explicit) return explicit;
	const alamat = sekolah.alamat;
	if (!alamat) return '';
	return alamat.kabupaten || alamat.kecamatan || alamat.desa || '';
}

function buildLogoUrl(sekolah: NonNullable<App.Locals['sekolah']>): string | null {
	if (!sekolah.id) return null;
	const updatedAt = sekolah.updatedAt ? Date.parse(sekolah.updatedAt) : NaN;
	const suffix = Number.isFinite(updatedAt) ? `?v=${updatedAt}` : '';
	return `/sekolah/logo/${sekolah.id}${suffix}`;
}

export type KeasramaanRow = {
	no: number;
	indikator: string;
	predikat: PredikatKey;
	deskripsi: string;
	kategoriHeader?: string; // untuk grouping header
};

export type KeasramaanPrintData = {
	sekolah: {
		nama: string;
		alamat: string;
		logoUrl: string | null;
		jenjangVariant: string | null;
	};
	murid: {
		nama: string;
		nis: string;
		nisn: string;
	};
	rombel: {
		nama: string;
		fase: string;
	};
	periode: {
		tahunAjaran: string;
		semester: string;
	};
	waliAsrama: { nama: string } | null;
	waliKelas: { nama: string } | null;
	kepalaSekolah: { nama: string } | null;
	ttd: {
		tempat: string;
		tanggal: string;
	};
	kehadiran: {
		sakit: number;
		izin: number;
		alfa: number;
	} | null;
	keasramaanRows: KeasramaanRow[];
};

export async function getKeasramaanPreviewPayload({ locals, url }: KeasramaanContext) {
	const sekolah = locals.sekolah;
	if (!sekolah?.id) {
		throw error(404, 'Sekolah tidak ditemukan.');
	}

	const muridId = requireInteger('murid_id', url.searchParams.get('murid_id'));
	const kelasId = optionalInteger('kelas_id', url.searchParams.get('kelas_id'));

	const murid = await db.query.tableMurid.findFirst({
		where: and(
			eq(tableMurid.id, muridId),
			eq(tableMurid.sekolahId, sekolah.id),
			kelasId ? eq(tableMurid.kelasId, kelasId) : undefined
		),
		with: {
			kelas: {
				with: {
					waliKelas: true,
					waliAsrama: true,
					tahunAjaran: true,
					semester: true
				}
			},
			kehadiran: true
		}
	});

	if (!murid) {
		throw error(404, 'Data murid tidak ditemukan.');
	}

	if (kelasId && murid.kelasId !== kelasId) {
		throw error(400, 'Murid tidak terdaftar pada kelas yang diminta.');
	}

	const kelasData = murid.kelas;
	if (!kelasData) {
		throw error(404, 'Data kelas tidak ditemukan.');
	}

	// Fetch all keasramaan evaluations for this class
	const keasramaanList = await db.query.tableKeasramaan.findMany({
		where: eq(tableKeasramaan.kelasId, murid.kelasId),
		with: {
			indikator: {
				orderBy: asc(tableKeasramaanIndikator.id),
				with: {
					tujuan: {
						orderBy: asc(tableKeasramaanTujuan.id)
					}
				}
			}
		},
		orderBy: asc(tableKeasramaan.id)
	});

	// Fetch all assessments for this student
	const asesmenList = await db.query.tableAsesmenKeasramaan.findMany({
		where: eq(tableAsesmenKeasramaan.muridId, murid.id),
		with: {
			tujuan: {
				with: {
					indikator: true
				}
			},
			keasramaan: true
		}
	});

	// Build a map of (keasramaanId -> indikatorId -> predikat & tujuan)
	type AsesmenByIndicator = Record<number, { predikat: PredikatKey; tujuanDeskripsi: string }>;
	type AsesmenByKeasramaan = Record<number, AsesmenByIndicator>;
	const asesmenMap: AsesmenByKeasramaan = {};

	for (const item of asesmenList) {
		if (!item.keasramaan || !item.tujuan) continue;
		const keasramaanId = item.keasramaan.id;
		const indikatorId = item.tujuan.indikatorId;
		const kategori = item.kategori as PredikatKey;

		if (!asesmenMap[keasramaanId]) {
			asesmenMap[keasramaanId] = {};
		}

		// Store highest/latest assessment
		asesmenMap[keasramaanId][indikatorId] = {
			predikat: kategori,
			tujuanDeskripsi: item.tujuan.deskripsi
		};
	}

	// Build rows: group by keasramaan, then list indikators with their assessments
	const keasramaanRows: KeasramaanRow[] = [];
	let rowNumber = 1;

	for (const keasramaan of keasramaanList) {
		// Add category header row
		keasramaanRows.push({
			no: 0,
			indikator: keasramaan.nama,
			predikat: 'cukup', // placeholder
			deskripsi: '',
			kategoriHeader: keasramaan.nama
		});

		const asesmenForKeasramaan = asesmenMap[keasramaan.id] ?? {};

		// Add indikator rows
		for (const indikator of keasramaan.indikator) {
			const asesmen = asesmenForKeasramaan[indikator.id];

			if (asesmen) {
				keasramaanRows.push({
					no: rowNumber++,
					indikator: indikator.deskripsi,
					predikat: asesmen.predikat,
					deskripsi: asesmen.tujuanDeskripsi
				});
			} else {
				// No assessment yet - show empty row
				keasramaanRows.push({
					no: rowNumber++,
					indikator: indikator.deskripsi,
					predikat: 'cukup', // default
					deskripsi: ''
				});
			}
		}
	}

	// Group rows by description for display (highest scores first, then lowest)
	const groupedByDeskripsi = new Map<string, Array<{ indikator: string; predikat: PredikatKey }>>();

	for (const row of keasramaanRows) {
		if (row.kategoriHeader) continue; // Skip header rows
		if (!row.deskripsi) continue;

		const key = row.deskripsi;
		if (!groupedByDeskripsi.has(key)) {
			groupedByDeskripsi.set(key, []);
		}
		groupedByDeskripsi.get(key)!.push({
			indikator: row.indikator,
			predikat: row.predikat
		});
	}

	// Rebuild rows with grouping logic: order by predikat (highest to lowest)
	const finalRows: KeasramaanRow[] = [];
	let finalRowNumber = 1;

	for (const keasramaan of keasramaanList) {
		// Add category header
		finalRows.push({
			no: 0,
			indikator: keasramaan.nama,
			predikat: 'cukup',
			deskripsi: '',
			kategoriHeader: keasramaan.nama
		});

		const asesmenForKeasramaan = asesmenMap[keasramaan.id] ?? {};

		// Collect indikators for this keasramaan, sorted by predikat (highest first)
		const indikatorList = keasramaan.indikator
			.map((ind) => {
				const asesmen = asesmenForKeasramaan[ind.id];
				return {
					indikator: ind,
					predikat: asesmen?.predikat ?? ('cukup' as PredikatKey),
					deskripsi: asesmen?.tujuanDeskripsi ?? ''
				};
			})
			.sort((a, b) => {
				const scoreA = PREDIKAT_MAP[a.predikat].order;
				const scoreB = PREDIKAT_MAP[b.predikat].order;
				return scoreB - scoreA; // Highest first
			});

		for (const item of indikatorList) {
			finalRows.push({
				no: finalRowNumber++,
				indikator: item.indikator.deskripsi,
				predikat: item.predikat,
				deskripsi: item.deskripsi
			});
		}
	}

	const ttdTanggal = formatTanggal(kelasData.semester?.tanggalBagiRaport);
	const ttdTempat = fallbackTempat(sekolah);

	const keasramaanData: KeasramaanPrintData = {
		sekolah: {
			nama: sekolah.nama,
			alamat: composeAlamat(sekolah),
			logoUrl: buildLogoUrl(sekolah),
			jenjangVariant: sekolah.jenjangVariant ?? null
		},
		murid: {
			nama: murid.nama,
			nis: murid.nis,
			nisn: murid.nisn
		},
		rombel: {
			nama: murid.kelas?.nama ?? '',
			fase: murid.kelas?.fase ?? ''
		},
		periode: {
			tahunAjaran: kelasData.tahunAjaran?.nama ?? '',
			semester: kelasData.semester?.nama ?? ''
		},
		waliAsrama: kelasData.waliAsrama ? { nama: kelasData.waliAsrama.nama } : null,
		waliKelas: kelasData.waliKelas ? { nama: kelasData.waliKelas.nama } : null,
		kepalaSekolah: sekolah.kepalaSekolah ? { nama: sekolah.kepalaSekolah.nama } : null,
		ttd: {
			tempat: ttdTempat,
			tanggal: ttdTanggal
		},
		kehadiran: murid.kehadiran
			? {
					sakit: murid.kehadiran.sakit ?? 0,
					izin: murid.kehadiran.izin ?? 0,
					alfa: murid.kehadiran.alfa ?? 0
				}
			: null,
		keasramaanRows: finalRows
	};

	return {
		meta: {
			title: `Rapor Keasramaan - ${murid.nama}`
		},
		keasramaanData
	};
}
