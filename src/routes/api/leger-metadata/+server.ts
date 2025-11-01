import type { RequestHandler } from '@sveltejs/kit';
import db from '$lib/server/db';
import {
	tableKelas,
	tableMataPelajaran,
	tableMurid,
	tableAsesmenSumatif
} from '$lib/server/db/schema';

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

	const s = sekolah as SekolahLike | null;
	const kepala = s?.kepalaSekolah
		? { nama: s.kepalaSekolah.nama || '', nip: s.kepalaSekolah.nip || '' }
		: null;

	return new Response(
		JSON.stringify({
			sekolah: s ? { nama: s.nama || '' } : null,
			kepalaSekolah: kepala,
			waliKelas,
			// raw mapel, and computed headers + murid rows with nilai
			mapel,
			headers: headerMap,
			murid: muridRows
		}),
		{
			headers: { 'content-type': 'application/json' }
		}
	);
};
