import type { RequestHandler } from '@sveltejs/kit';
import db from '$lib/server/db';
import {
	tableKelas,
	tableMataPelajaran,
	tableMurid,
	tableAsesmenSumatif,
	tableKokurikuler,
	tableAsesmenKokurikuler,
	tableEkstrakurikuler,
	tableAsesmenEkstrakurikuler
} from '$lib/server/db/schema';
import { sanitizeDimensionList } from '$lib/kokurikuler';

type Person = { nama?: string; nip?: string };
type SekolahLike = { nama?: string; kepalaSekolah?: Person };
import { eq, inArray, asc, and } from 'drizzle-orm';

function normalizeText(value: string | null | undefined) {
	return value?.trim().toLowerCase() ?? '';
}

function isAgamaSubject(name: string) {
	return normalizeText(name).startsWith('pendidikan agama');
}

export const GET: RequestHandler = async ({ url, locals }) => {
	// event.locals.sekolah is set by hooks.server.ts
	const sekolah = (locals as { sekolah?: unknown }).sekolah ?? null;
	const kelasIdParam = url.searchParams.get('kelas_id');
	let waliKelas = null;
	let kelasNama: string | null = null;

	try {
		if (kelasIdParam) {
			const id = Number(kelasIdParam);
			if (Number.isInteger(id)) {
				const kelas = await db.query.tableKelas.findFirst({
					where: eq(tableKelas.id, id),
					with: { waliKelas: true }
				});
				if (kelas?.waliKelas) {
					const wk = kelas.waliKelas as { nama?: string; nip?: string };
					waliKelas = { nama: wk.nama || '', nip: wk.nip || '' };
				}
				// capture kelas name for client use
				kelasNama = kelas?.nama ?? null;
			}
		}
	} catch (err) {
		console.warn('[api/leger-metadata] failed to load wali kelas', err);
	}

	// fetch mata pelajaran for kelas (if kelas provided)
	let mapel: Array<{ id: number; nama: string; jenis?: string }> = [];
	try {
		if (kelasIdParam) {
			const id = Number(kelasIdParam);
			if (Number.isInteger(id)) {
				const m = await db.query.tableMataPelajaran.findMany({
					where: eq(tableMataPelajaran.kelasId, id),
					columns: { id: true, nama: true, jenis: true }
				});
				mapel = m.map((x) => ({ id: x.id, nama: x.nama, jenis: x.jenis }));
			}
		}
	} catch (err) {
		console.warn('[api/leger-metadata] failed to load mata pelajaran', err);
	}

	// fetch murid for kelas and their nilai
	let muridList: Array<{ id: number; nama: string; agama?: string }> = [];
	const nilaiByMurid = new Map<number, Map<number, number | null>>();
	try {
		if (kelasIdParam) {
			const id = Number(kelasIdParam);
			if (Number.isInteger(id)) {
				const mrd = await db.query.tableMurid.findMany({
					where: eq(tableMurid.kelasId, id),
					columns: { id: true, nama: true, agama: true },
					orderBy: [asc(tableMurid.nama)]
				});
				muridList = mrd.map((r) => ({ id: r.id, nama: r.nama, agama: r.agama }));

				const muridIds = muridList.map((m) => m.id);
				const mapelIds = mapel.map((m) => m.id);
				if (muridIds.length && mapelIds.length) {
					const sumatif = await db.query.tableAsesmenSumatif.findMany({
						columns: { muridId: true, mataPelajaranId: true, nilaiAkhir: true },
						where: and(
							inArray(tableAsesmenSumatif.muridId, muridIds),
							inArray(tableAsesmenSumatif.mataPelajaranId, mapelIds)
						)
					});
					for (const s of sumatif) {
						let m = nilaiByMurid.get(s.muridId);
						if (!m) {
							m = new Map();
							nilaiByMurid.set(s.muridId, m);
						}
						m.set(s.mataPelajaranId, s.nilaiAkhir ?? null);
					}
				}
			}
		}
	} catch (err) {
		console.warn('[api/leger-metadata] failed to load murid/values', err);
	}

	// Build header list: collapse agama variants into single AGAMA_BASE
	const AGAMA_BASE = 'Pendidikan Agama dan Budi Pekerti';
	const headerMap: Array<{ id: string | number; nama: string; sourceIds?: number[] }> = [];
	const nonAgama = mapel.filter((m) => !isAgamaSubject(m.nama));
	for (const m of nonAgama) headerMap.push({ id: m.id, nama: m.nama, sourceIds: [m.id] });
	const agamaEntries = mapel.filter((m) => isAgamaSubject(m.nama));
	if (agamaEntries.length) {
		headerMap.push({ id: 'agama', nama: AGAMA_BASE, sourceIds: agamaEntries.map((x) => x.id) });
	}
	// sort headers by name (id order might be acceptable too)
	headerMap.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));

	// Build murid rows with nilai per header
	const muridRows = muridList.map((m) => {
		const nilaiRecord: Record<string, number | null> = {};
		for (const h of headerMap) {
			if (h.id === 'agama') {
				// choose any agama source id that has a value for this murid
				let found: number | null = null;
				for (const sid of h.sourceIds || []) {
					const v = nilaiByMurid.get(m.id)?.get(sid);
					if (v != null) {
						found = v;
						break;
					}
				}
				nilaiRecord[String(h.id)] = found ?? null;
			} else {
				const v = nilaiByMurid.get(m.id)?.get(Number(h.id));
				nilaiRecord[String(h.id)] = v ?? null;
			}
		}
		return { id: m.id, nama: m.nama, nilai: nilaiRecord };
	});

	// fetch kokurikuler rows for kelas and compute per-murid kok values (kriteria)
	// tableKokurikuler doesn't have a `nama` column; use `tujuan` (or `kode`) as display name
	let kokRows: Array<{ id: number; nama: string; dimensi?: string[] }> = [];
	const kokByMuridValues = new Map<number, Record<string, string | null>>();
	try {
		if (kelasIdParam) {
			const id = Number(kelasIdParam);
			if (Number.isInteger(id)) {
				const rawKok = await db.query.tableKokurikuler.findMany({
					where: eq(tableKokurikuler.kelasId, id),
					columns: { id: true, kode: true, dimensi: true, tujuan: true, createdAt: true },
					orderBy: [asc(tableKokurikuler.createdAt)]
				});
				// map to a stable shape expected by the exporter: { id, nama, dimensi }
				kokRows = rawKok.map((k) => ({ id: k.id, nama: k.tujuan || k.kode || String(k.id), dimensi: k.dimensi as string[] }));
				const kokIds = kokRows.map((k) => k.id);
				const muridIds = muridList.map((m) => m.id);
				if (kokIds.length && muridIds.length) {
					try {
						const asesmen = await db.query.tableAsesmenKokurikuler.findMany({
							columns: { muridId: true, kokurikulerId: true, dimensi: true, kategori: true },
							where: and(
								inArray(tableAsesmenKokurikuler.muridId, muridIds),
								inArray(tableAsesmenKokurikuler.kokurikulerId, kokIds)
							)
						});
						// build map muridId -> kokId -> dimensi -> kategori
						const asesmenByMurid = new Map<number, Map<number, Map<string, string>>>();
						for (const a of asesmen) {
							let mur = asesmenByMurid.get(a.muridId);
							if (!mur) {
								mur = new Map();
								asesmenByMurid.set(a.muridId, mur);
							}
							const existing = mur.get(a.kokurikulerId) ?? new Map<string, string>();
							existing.set(a.dimensi, a.kategori);
							mur.set(a.kokurikulerId, existing);
						}

						const kategoriToNumber: Record<string, number> = {
							kurang: 1,
							cukup: 2,
							baik: 3,
							'sangat-baik': 4
						};

						for (const m of muridList) {
							const valsForMurid: Record<string, string | null> = {};
							for (const k of kokRows) {
								const kokMap = asesmenByMurid.get(m.id)?.get(k.id) ?? new Map<string, string>();
								const dims = sanitizeDimensionList(k.dimensi);
								const vals: number[] = [];
								for (const d of dims) {
									const kategori = kokMap.get(d);
									const num = kategori ? (kategoriToNumber[kategori] ?? null) : null;
									if (num != null && Number.isFinite(num)) vals.push(num);
								}
								if (vals.length > 0) {
									const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
									const avgFixed = Number.parseFloat(avg.toFixed(2));
									let kriteria: string | null = null;
									if (avgFixed >= 3.51) kriteria = 'Sangat Baik';
									else if (avgFixed >= 2.51) kriteria = 'Baik';
									else if (avgFixed >= 1.51) kriteria = 'Cukup';
									else kriteria = 'Kurang';
									valsForMurid[`kok_${k.id}`] = kriteria;
								} else {
									valsForMurid[`kok_${k.id}`] = null;
								}
							}
							kokByMuridValues.set(m.id, valsForMurid);
						}
					} catch {
						// ignore kok assessment errors
					}
				}
			}
		}
	} catch {
		// ignore kok fetch errors
	}

	// merge kok values into muridRows' nilai records under keys kok_{id}
	if (kokRows.length) {
		for (const mr of muridRows) {
			const extra = kokByMuridValues.get(mr.id) ?? {};
			mr.nilai = Object.assign({}, mr.nilai, extra);
		}
	}

	// fetch ekstrakurikuler rows for kelas and compute per-murid ekstrak values (kriteria)
	let ekstrakRows: Array<{ id: number; nama: string }> = [];
	const eksByMuridValues = new Map<number, Record<string, string | null>>();
	try {
		if (kelasIdParam) {
			const id = Number(kelasIdParam);
			if (Number.isInteger(id)) {
				const rawEks = await db.query.tableEkstrakurikuler.findMany({
					where: eq(tableEkstrakurikuler.kelasId, id),
					columns: { id: true, nama: true, createdAt: true },
					orderBy: [asc(tableEkstrakurikuler.createdAt)]
				});
				ekstrakRows = rawEks.map((e) => ({ id: e.id, nama: e.nama }));
				const eksIds = ekstrakRows.map((k) => k.id);
				const muridIds = muridList.map((m) => m.id);
				if (eksIds.length && muridIds.length) {
					try {
						const asesmenEks = await db.query.tableAsesmenEkstrakurikuler.findMany({
							columns: { muridId: true, ekstrakurikulerId: true, kategori: true },
							where: and(
								inArray(tableAsesmenEkstrakurikuler.muridId, muridIds),
								inArray(tableAsesmenEkstrakurikuler.ekstrakurikulerId, eksIds)
							)
						});
						// build map muridId -> ekstrakId -> kategori[]
						const asesmenByMuridEks = new Map<number, Map<number, string[]>>();
						for (const a of asesmenEks) {
							let mur = asesmenByMuridEks.get(a.muridId);
							if (!mur) {
								mur = new Map();
								asesmenByMuridEks.set(a.muridId, mur);
							}
							const arr = mur.get(a.ekstrakurikulerId) ?? [];
							arr.push(a.kategori);
							mur.set(a.ekstrakurikulerId, arr);
						}

						const kategoriToNumberEks: Record<string, number> = {
							'perlu-bimbingan': 1,
							cukup: 2,
							baik: 3,
							'sangat-baik': 4
						};

						for (const m of muridList) {
							const valsForMurid: Record<string, string | null> = {};
							for (const e of ekstrakRows) {
								const arr = asesmenByMuridEks.get(m.id)?.get(e.id) ?? [];
								const nums: number[] = [];
								for (const cat of arr) {
									const n = kategoriToNumberEks[cat] ?? null;
									if (n != null && Number.isFinite(n)) nums.push(n);
								}
								if (nums.length > 0) {
									const avg = nums.reduce((a, b) => a + b, 0) / nums.length;
									const avgFixed = Number.parseFloat(avg.toFixed(2));
									let kriteria: string | null = null;
									if (avgFixed >= 3.51) kriteria = 'Sangat Baik';
									else if (avgFixed >= 2.51) kriteria = 'Baik';
									else if (avgFixed >= 1.51) kriteria = 'Cukup';
									else kriteria = 'Kurang';
									valsForMurid[`eks_${e.id}`] = kriteria;
								} else {
									valsForMurid[`eks_${e.id}`] = null;
								}
							}
							eksByMuridValues.set(m.id, valsForMurid);
						}
					} catch {
						// ignore ekstrak assessment errors
					}
				}
			}
		}
	} catch {
		// ignore ekstrak fetch errors
	}

	// merge ekstrak values into muridRows' nilai records under keys eks_{id}
	if (ekstrakRows.length) {
		for (const mr of muridRows) {
			const extra = eksByMuridValues.get(mr.id) ?? {};
			mr.nilai = Object.assign({}, mr.nilai, extra);
		}
	}

	const s = sekolah as SekolahLike | null;
	const kepala = s?.kepalaSekolah
		? { nama: s.kepalaSekolah.nama || '', nip: s.kepalaSekolah.nip || '' }
		: null;

	// expose lokasi tanda tangan and tanggal bagi rapor when available so clients
	// (like the Excel exporter) can render signatures correctly.
	const sekolahTyped = s as unknown as { lokasiTandaTangan?: string; semesterAktif?: { tanggalBagiRaport?: string } } | null;
	const lokasiTandaTangan = sekolahTyped?.lokasiTandaTangan ?? null;
	const tanggalBagiRaport = sekolahTyped?.semesterAktif?.tanggalBagiRaport ?? null;

	return new Response(
		JSON.stringify({
			sekolah: s ? { nama: s.nama || '' } : null,
			kepalaSekolah: kepala,
			waliKelas,
			// convenience/top-level metadata used by client exporters
			lokasiTandaTangan,
			tanggalBagiRaport,
			kelasNama,
			// raw mapel, and computed headers + murid rows with nilai
			mapel,
			headers: headerMap,
			kokRows,
			ekstrakRows,
			murid: muridRows
		}),
		{
			headers: { 'content-type': 'application/json' }
		}
	);
};
