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
import {
	kategoriToRubrikValue,
	hitungNilaiIndikator,
	nilaiAngkaToHuruf
} from '$lib/components/asesmen-keasramaan/utils';

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

	// Build a map of assessments grouped by (keasramaanId -> indikatorId -> array of TP values and descriptions)
	type IndicatorAssessment = {
		nilaiTP: (number | null)[]; // Array of rubrik values (1-4) from each TP
		tpDescriptions: string[]; // Array of TP descriptions
	};
	type AsesmenByIndicator = Record<number, IndicatorAssessment>;
	type AsesmenByKeasramaan = Record<number, AsesmenByIndicator>;
	const asesmenMap: AsesmenByKeasramaan = {};

	for (const item of asesmenList) {
		if (!item.keasramaan || !item.tujuan) continue;
		const keasramaanId = item.keasramaan.id;
		const indikatorId = item.tujuan.indikatorId;
		const kategori = item.kategori as PredikatKey;
		const rubrikValue = kategoriToRubrikValue(kategori);

		if (!asesmenMap[keasramaanId]) {
			asesmenMap[keasramaanId] = {};
		}
		if (!asesmenMap[keasramaanId][indikatorId]) {
			asesmenMap[keasramaanId][indikatorId] = {
				nilaiTP: [],
				tpDescriptions: []
			};
		}

		asesmenMap[keasramaanId][indikatorId].nilaiTP.push(rubrikValue);
		asesmenMap[keasramaanId][indikatorId].tpDescriptions.push(item.tujuan.deskripsi);
	}

	// Build final rows: group by keasramaan, then list indikators with calculated predikat
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

		// Collect indikators for this keasramaan with calculated predikat
		const indikatorList = keasramaan.indikator
			.map((ind) => {
				const asesmen = asesmenForKeasramaan[ind.id];
				
				// Calculate indicator predikat from average of TP values
				let predikat: PredikatKey = 'cukup';
				let deskripsi = '';
				
				if (asesmen && asesmen.nilaiTP.length > 0) {
					// Calculate average nilai indikator from TP values
					const nilaiIndikator = hitungNilaiIndikator(asesmen.nilaiTP as (number | null)[]);
					
					if (nilaiIndikator !== null) {
						// Convert average to huruf (A, B, C, D)
						const huruf = nilaiAngkaToHuruf(nilaiIndikator);
						
						// Map huruf back to predikat key
						const hurfToPredikat: Record<string, PredikatKey> = {
							A: 'sangat-baik',
							B: 'baik',
							C: 'cukup',
							D: 'perlu-bimbingan'
						};
						predikat = hurfToPredikat[huruf || 'C'] || 'cukup';
					}
					
					// Use first TP description as the row description
					deskripsi = asesmen.tpDescriptions[0] || '';
				}
				
				return {
					indikator: ind,
					predikat,
					deskripsi
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
