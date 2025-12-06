import db from '$lib/server/db';
import { tableAsesmenKeasramaan, tableKeasramaan, tableMurid } from '$lib/server/db/schema';
import {
	ekstrakurikulerNilaiLabelByValue,
	buildKeasramaanDeskripsi,
	type EkstrakurikulerNilaiKategori,
	isEkstrakurikulerNilaiKategori
} from '$lib/ekstrakurikuler';
import {
	kategoriToRubrikValue,
	hitungNilaiIndikator,
	getIndikatorCategory
} from '$lib/components/asesmen-keasramaan/utils';
import { redirect, error, json } from '@sveltejs/kit';
import { asc, eq } from 'drizzle-orm';

const PER_PAGE = 20;

type NilaiRecord = {
	muridId: number;
	tujuanId: number;
	kategori: string;
	dinilaiPada: string | null;
	updatedAt: string | null;
};

function mapNilaiRecords(records: NilaiRecord[]) {
	const nilaiByMurid = new Map<
		number,
		Map<number, { kategori: EkstrakurikulerNilaiKategori; timestamp: string | null }>
	>();

	for (const record of records) {
		if (!isEkstrakurikulerNilaiKategori(record.kategori)) continue;
		let muridMap = nilaiByMurid.get(record.muridId);
		if (!muridMap) {
			muridMap = new Map<
				number,
				{ kategori: EkstrakurikulerNilaiKategori; timestamp: string | null }
			>();
			nilaiByMurid.set(record.muridId, muridMap);
		}
		const timestamp = record.dinilaiPada ?? record.updatedAt ?? null;
		muridMap.set(record.tujuanId, {
			kategori: record.kategori,
			timestamp
		});
	}

	return nilaiByMurid;
}

export async function load({ parent, url, depends }) {
	depends('app:asesmen-keasramaan');
	const { kelasAktif } = await parent();
	const meta: PageMeta = { title: 'Asesmen Keasramaan' };

	if (!kelasAktif?.id) {
		return emptyPayload(meta);
	}

	const keasramaanRecords = await db.query.tableKeasramaan.findMany({
		columns: { id: true, nama: true },
		with: {
			indikator: {
				columns: { id: true, deskripsi: true },
				with: {
					tujuan: {
						columns: { id: true }
					}
				}
			}
		},
		where: eq(tableKeasramaan.kelasId, kelasAktif.id),
		orderBy: asc(tableKeasramaan.createdAt)
	});

	const keasramaanList = keasramaanRecords.map((record) => ({
		id: record.id,
		nama: record.nama,
		tujuanCount: record.indikator.reduce((sum, ind) => sum + ind.tujuan.length, 0)
	}));

	const requestedIdRaw = url.searchParams.get('keasramaan_id');
	let requestedId = requestedIdRaw ? Number(requestedIdRaw) : null;
	if (requestedId != null && (!Number.isInteger(requestedId) || requestedId <= 0)) {
		requestedId = null;
	}

	const availableIds = new Set(keasramaanList.map((item) => item.id));
	let selectedKeasramaanId = requestedId && availableIds.has(requestedId) ? requestedId : null;
	if (!selectedKeasramaanId && keasramaanList.length === 1) {
		selectedKeasramaanId = keasramaanList[0].id;
	}

	const muridRecords = await db.query.tableMurid.findMany({
		columns: { id: true, nama: true },
		where: eq(tableMurid.kelasId, kelasAktif.id),
		orderBy: asc(tableMurid.nama)
	});

	const rawSearch = url.searchParams.get('q')?.trim() ?? '';
	const searchTerm = rawSearch || null;
	const searchLower = searchTerm ? searchTerm.toLowerCase() : null;
	const filteredMurid = searchLower
		? muridRecords.filter((murid) => murid.nama.toLowerCase().includes(searchLower))
		: muridRecords;

	const totalMurid = filteredMurid.length;
	const requestedPage = Number(url.searchParams.get('page')) || 1;
	const totalPages = Math.max(1, Math.ceil(totalMurid / PER_PAGE));
	const currentPage = Math.min(Math.max(requestedPage, 1), totalPages);

	if (requestedPage !== currentPage) {
		const params = new URLSearchParams(url.searchParams);
		if (currentPage <= 1) {
			params.delete('page');
		} else {
			params.set('page', String(currentPage));
		}
		throw redirect(303, `${url.pathname}${params.size ? `?${params}` : ''}`);
	}

	const offset = (currentPage - 1) * PER_PAGE;
	const paginatedMurid = filteredMurid.slice(offset, offset + PER_PAGE);

	if (!selectedKeasramaanId) {
		return {
			meta,
			keasramaanList,
			selectedKeasramaanId: null,
			selectedKeasramaan: null,
			daftarMurid: paginatedMurid.map((murid, index) => ({
				id: murid.id,
				nama: murid.nama,
				no: offset + index + 1,
				deskripsi: null,
				hasNilai: false,
				nilai: [],
				lastUpdated: null
			})),
			search: searchTerm,
			totalMurid,
			muridCount: muridRecords.length,
			page: {
				currentPage,
				totalPages,
				totalItems: totalMurid,
				perPage: PER_PAGE,
				search: searchTerm
			}
		};
	}

	const selectedKeasramaan = keasramaanRecords.find((item) => item.id === selectedKeasramaanId);

	if (!selectedKeasramaan) {
		throw error(404, 'Matev keasramaan tidak ditemukan');
	}

	// Get all indikators for this keasramaan, then get their tujuan
	const tujuanRecords = await db.query.tableKeasramaanTujuan.findMany({
		columns: { id: true, deskripsi: true },
		with: {
			indikator: {
				columns: { id: true, keasramaanId: true, deskripsi: true }
			}
		}
	});

	// Filter to only tujuan that belong to the selected keasramaan
	const tujuan = tujuanRecords
		.filter((t) => t.indikator.keasramaanId === selectedKeasramaanId)
		.map((t) => ({
			id: t.id,
			deskripsi: t.deskripsi
		}));

	// Get indikators with their deskripsi for displaying in deskripsi section
	const indikators = selectedKeasramaan.indikator.map((ind) => ({
		id: ind.id,
		nama: ind.deskripsi
	}));

	const nilaiRecords = await db.query.tableAsesmenKeasramaan.findMany({
		columns: {
			muridId: true,
			tujuanId: true,
			kategori: true,
			dinilaiPada: true,
			updatedAt: true
		},
		where: eq(tableAsesmenKeasramaan.keasramaanId, selectedKeasramaan.id),
		with: {
			tujuan: {
				columns: {},
				with: {
					indikator: {
						columns: { id: true }
					}
				}
			}
		}
	});

	const nilaiByMurid = mapNilaiRecords(nilaiRecords);

	const daftarMurid = paginatedMurid.map((murid, index) => {
		const nilaiMap = nilaiByMurid.get(murid.id);
		const nilai = tujuan.map((tujuanItem) => {
			const record = nilaiMap?.get(tujuanItem.id) ?? null;
			const kategori = record?.kategori ?? null;
			const kategoriLabel = kategori ? ekstrakurikulerNilaiLabelByValue[kategori] : null;
			return {
				tujuanId: tujuanItem.id,
				tujuan: tujuanItem.deskripsi,
				kategori: kategori,
				kategoriLabel,
				timestamp: record?.timestamp ?? null
			};
		});

		// Hitung nilai per indikator
		const nilaiPerIndikator = indikators.map((ind) => {
			// Get all tujuan yang belongs to this indikator
			const tujuanForThisIndicator = tujuanRecords
				.filter(
					(t) => t.indikator.id === ind.id && t.indikator.keasramaanId === selectedKeasramaanId
				)
				.map((t) => t.id);

			// Get nilai for each tujuan
			const nilaiArray = tujuanForThisIndicator.map((tpId) => {
				const nilaiItem = nilai.find((n) => n.tujuanId === tpId);
				if (!nilaiItem?.kategori) return null;
				return kategoriToRubrikValue(nilaiItem.kategori);
			});

			const nilaiIndikator = hitungNilaiIndikator(nilaiArray);
			const category = getIndikatorCategory(nilaiIndikator);

			return {
				indikatorNama: ind.nama,
				nilaiIndikator,
				category: category
					? {
							huruf: category.huruf,
							label: category.label
						}
					: null
			};
		});

		const deskripsi = buildKeasramaanDeskripsi(nilaiPerIndikator, murid.nama);

		let lastUpdated: string | null = null;
		for (const item of nilai) {
			if (!item.timestamp) continue;
			if (!lastUpdated || item.timestamp > lastUpdated) {
				lastUpdated = item.timestamp;
			}
		}

		return {
			id: murid.id,
			nama: murid.nama,
			no: offset + index + 1,
			nilai,
			deskripsi,
			hasNilai: Boolean(deskripsi),
			lastUpdated
		};
	});

	return {
		meta,
		keasramaanList,
		selectedKeasramaanId: selectedKeasramaan.id,
		selectedKeasramaan: {
			id: selectedKeasramaan.id,
			nama: selectedKeasramaan.nama,
			tujuan
		},
		daftarMurid,
		search: searchTerm,
		totalMurid,
		muridCount: muridRecords.length,
		page: {
			currentPage,
			totalPages,
			totalItems: totalMurid,
			perPage: PER_PAGE,
			search: searchTerm
		}
	};
}

function emptyPayload(meta: PageMeta) {
	return {
		meta,
		keasramaanList: [],
		selectedKeasramaanId: null,
		selectedKeasramaan: null,
		daftarMurid: [] as Array<{
			id: number;
			nama: string;
			no: number;
			nilai: unknown[];
			deskripsi: string | null;
			hasNilai: boolean;
			lastUpdated: string | null;
		}>,
		search: null as string | null,
		totalMurid: 0,
		muridCount: 0,
		page: {
			currentPage: 1,
			totalPages: 1,
			totalItems: 0,
			perPage: PER_PAGE,
			search: null as string | null
		}
	};
}

export const actions = {
	importNilai: async ({ request, locals }) => {
		const formData = await request.formData();
		const keasramaanIdRaw = formData.get('keasramaanId')?.toString();
		const kelasIdRaw = formData.get('kelasId')?.toString();
		const file = formData.get('file') as File | null;

		if (!keasramaanIdRaw || !kelasIdRaw || !locals.sekolah?.id || !file) {
			return json({ message: 'Data tidak lengkap' }, { status: 400 });
		}

		const keasramaanId = Number(keasramaanIdRaw);
		const kelasId = Number(kelasIdRaw);
		if (!Number.isInteger(keasramaanId) || !Number.isInteger(kelasId)) {
			return json({ message: 'ID tidak valid' }, { status: 400 });
		}

		try {
			// Get keasramaan with indikators and tujuan
			const keasramaan = await db.query.tableKeasramaan.findFirst({
				where: eq(tableKeasramaan.id, keasramaanId),
				with: {
					indikator: {
						with: {
							tujuan: true
						}
					}
				}
			});

			if (!keasramaan || keasramaan.kelasId !== kelasId) {
				return json({ message: 'Keasramaan tidak ditemukan' }, { status: 404 });
			}

			// Read file
			const arrayBuffer = await file.arrayBuffer();
			const ExcelJSModule = (await import('exceljs')).default ?? (await import('exceljs'));
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const ExcelJSImport = ExcelJSModule as unknown as { Workbook: { new (): any } };
			const workbook = new ExcelJSImport.Workbook();
			await workbook.xlsx.load(Buffer.from(arrayBuffer));
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const worksheet: any = workbook.worksheets?.[0];

			if (!worksheet) {
				return json({ message: 'File Excel tidak valid' }, { status: 400 });
			}

			// Parse headers
			const headerRow = worksheet.getRow(1);
			const headers: string[] = [];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			headerRow?.eachCell((cell: any) => {
				headers.push(cell.value?.toString() ?? '');
			});

			if (headers.length < 2) {
				return json({ message: 'Format file tidak sesuai' }, { status: 400 });
			}

			// Build mapping dari header ke tujuanId
			const headerToTujuanMap = new Map<number, number>();
			for (let col = 3; col < headers.length; col++) {
				const header = headers[col];
				// Find tujuan yang match dengan header
				for (const indikator of keasramaan.indikator) {
					for (const tujuan of indikator.tujuan) {
						if (header.includes(tujuan.deskripsi)) {
							headerToTujuanMap.set(col, tujuan.id);
							break;
						}
					}
				}
			}

			// Get all murid to find by name
			const allMurid = await db.query.tableMurid.findMany({
				columns: { id: true, nama: true },
				where: eq(tableMurid.kelasId, kelasId)
			});

			const muridByName = new Map(allMurid.map((m) => [m.nama.trim().toLowerCase(), m.id]));

			// Insert/update asesmen
			let importedCount = 0;
			let skippedCount = 0;

			const validKategori = ['sangat-baik', 'baik', 'cukup', 'perlu-bimbingan'];
			const kategoriType = (kategori: string): EkstrakurikulerNilaiKategori => {
				const validated = kategori as EkstrakurikulerNilaiKategori;
				return validKategori.includes(kategori)
					? validated
					: ('baik' as EkstrakurikulerNilaiKategori);
			};

			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			worksheet.eachRow((row: any, rowNumber: number) => {
				if (rowNumber === 1) return; // Skip header

				const muridNama = row.getCell(2).value?.toString().trim();
				if (!muridNama) {
					skippedCount++;
					return;
				}

				const muridId = muridByName.get(muridNama.toLowerCase());
				if (!muridId) {
					skippedCount++;
					return;
				}

				for (const [col, tujuanId] of headerToTujuanMap) {
					const kategoriRaw = row.getCell(col).value?.toString().trim().toLowerCase() ?? '';
					if (!kategoriRaw) continue;

					let kategori = kategoriRaw;

					// Normalize kategori input - handle both spaced and dashed versions
					if (
						kategoriRaw === 'sangat baik' ||
						kategoriRaw === 'sangat-baik' ||
						kategoriRaw === 'sangat baik'
					) {
						kategori = 'sangat-baik';
					} else if (kategoriRaw === 'baik') {
						kategori = 'baik';
					} else if (kategoriRaw === 'cukup') {
						kategori = 'cukup';
					} else if (kategoriRaw === 'perlu bimbingan' || kategoriRaw === 'perlu-bimbingan') {
						kategori = 'perlu-bimbingan';
					} else {
						continue;
					}

					if (!validKategori.includes(kategori)) {
						continue;
					}

					void db
						.insert(tableAsesmenKeasramaan)
						.values({
							muridId,
							keasramaanId,
							tujuanId,
							kategori: kategoriType(kategori),
							dinilaiPada: new Date().toISOString()
						})
						.onConflictDoUpdate({
							target: [
								tableAsesmenKeasramaan.muridId,
								tableAsesmenKeasramaan.keasramaanId,
								tableAsesmenKeasramaan.tujuanId
							],
							set: {
								kategori: kategoriType(kategori),
								dinilaiPada: new Date().toISOString(),
								updatedAt: new Date().toISOString()
							}
						})
						.then(() => {
							importedCount++;
						})
						.catch((err: unknown) => {
							console.error('Error inserting asesmen:', err);
						});
				}
			});

			return json({
				message: `Import selesai. Berhasil: ${importedCount}, Terlewatkan: ${skippedCount}`
			});
		} catch (err) {
			console.error('Import error:', err);
			return json({ message: 'Terjadi kesalahan saat memproses file' }, { status: 500 });
		}
	}
};
