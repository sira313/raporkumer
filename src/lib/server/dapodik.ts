import { and, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
import db from '$lib/server/db';
import { triggerSchemaSync } from '$lib/server/schema-sync';
import {
	tableAlamat,
	tableAuthUser,
	tableAuthUserMataPelajaran,
	tableDapodikMataPelajaran,
	tableDapodikPembelajaran,
	tableDapodikSettings,
	tableEkstrakurikuler,
	tableKelas,
	tableMataPelajaran,
	tableMurid,
	tableMuridEkstrakurikuler,
	tablePegawai,
	tableSemester,
	tableSekolah,
	tableTahunAjaran,
	tableWaliMurid
} from './db/schema';
import { hashPassword } from './auth';
import { resolveUniqueUsername } from './usernames';
import { defaultPermissionsByType } from '../../routes/pengguna/permissions';

/**
 * Klien GET WebService Dapodik desktop (docs/erapor.md §4.1a / §7.3).
 * Semua call memakai header `Authorization: Bearer {token}` dengan query
 * wajib `npsn` + `semester_id`. Fokus fitur ini hanya membaca data (GET),
 * lalu dipetakan ke tabel lokal yang sudah ada (pola updateOrCreate idempotent,
 * primary key cermin di kolom `dapodik_*`, lihat docs/erapor.md §7.1).
 */

type Row = Record<string, unknown>;

export type DapodikMode = 'tes-koneksi' | 'semester' | 'semua';

export type DapodikSectionStatus = 'ok' | 'gagal' | 'dilewati';

export interface DapodikSectionLog {
	label: string;
	status: DapodikSectionStatus;
	detail: string;
}

export interface DapodikSyncResult {
	message: string;
	sections: DapodikSectionLog[];
	/** ID sekolah yang dipakai/dibuat saat sinkronisasi (untuk set cookie sekolah aktif). */
	sekolahId?: number;
}

export interface DapodikSettingsView {
	url: string | null;
	token: string | null;
	npsn: string | null;
	lastSyncAt: string | null;
}

// Referensi agama Dapodik (fallback bila respons tidak menyertakan field *_str).
const AGAMA_MAP: Record<string, string> = {
	'1': 'Islam',
	'2': 'Kristen Protestan',
	'3': 'Katolik',
	'4': 'Hindu',
	'5': 'Buddha',
	'6': 'Khong Hu Chu',
	'7': 'Penghayat Kepercayaan'
};

class DapodikError extends Error {}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

/**
 * Normalisasi input URL Dapodik. Menerima bentuk `192.168.8.114:5774`,
 * `http://192.168.8.114:5774`, atau URL lengkap berakhiran `/WebService`.
 */
export function normalizeWebServiceUrl(input: string): string {
	let value = input.trim();
	if (!value) throw new DapodikError('URL Dapodik wajib diisi.');
	if (!/^https?:\/\//i.test(value)) value = `http://${value}`;
	value = value.replace(/\/+$/, '');
	if (!/\/WebService$/i.test(value)) value += '/WebService';
	return value;
}

/** Parsing defensif: jika body bukan JSON murni, ambil antara `{` pertama dan `}` terakhir (docs/erapor.md §4.1a). */
function extractJsonBody(text: string): unknown {
	try {
		return JSON.parse(text);
	} catch {
		// Halaman error HTML (mis. 404 endpoint tidak tersedia) bisa mengandung
		// karakter { } di luar JSON — coba ekstrak bagian antara keduanya.
		const start = text.indexOf('{');
		const end = text.lastIndexOf('}');
		if (start !== -1 && end > start) {
			try {
				return JSON.parse(text.slice(start, end + 1));
			} catch {
				// Bukan JSON juga — lempar pesan ramah di bawah.
			}
		}
		throw new DapodikError(
			'Respons Dapodik bukan JSON valid — endpoint mungkin tidak tersedia pada build Dapodik ini.'
		);
	}
}

interface DapodikCall {
	ok: boolean;
	status: number;
	data?: unknown;
	error?: string;
}

async function dapodikGet(
	base: string,
	token: string,
	endpoint: string,
	params: Record<string, string | null | undefined>
): Promise<DapodikCall> {
	const qs = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value != null && value !== '') qs.set(key, value);
	}
	const url = `${base}/${endpoint}?${qs.toString()}`;

	let response: Response;
	try {
		response = await fetch(url, {
			method: 'GET',
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: 'application/json'
			},
			signal: AbortSignal.timeout(20000)
		});
	} catch (e) {
		return {
			ok: false,
			status: 0,
			error: `Tidak dapat menghubungi ${url}: ${(e as Error).message}`
		};
	}

	let text: string;
	try {
		text = await response.text();
	} catch {
		return { ok: false, status: response.status, error: 'Gagal membaca respons Dapodik.' };
	}

	try {
		const data = extractJsonBody(text);
		// Kontrak Dapodik: objek dengan success=false berarti token/parameter ditolak.
		const successFlag = (data as Row)?.['success'];
		if (successFlag === false) {
			const message = (data as Row)?.['message'];
			return {
				ok: false,
				status: response.status,
				error: typeof message === 'string' ? message : 'Permintaan ditolak Dapodik.'
			};
		}
		return { ok: response.ok, status: response.status, data };
	} catch (e) {
		return { ok: false, status: response.status, error: (e as Error).message };
	}
}

/**
 * Normalisasi envelope respons. Bentuk terverifikasi di lapangan:
 * - daftar: `{"results": N, "id": "...", "start": 0, "limit": 20, "rows": [ ... ]}`
 * - getSekolah: `rows` berupa OBJEK tunggal, bukan array.
 * Fallback tambahan: `datas`, array langsung, atau envelope itu sendiri.
 */
function rowsOf(data: unknown): Row[] {
	if (!data || typeof data !== 'object') return [];
	if (Array.isArray(data)) return data as Row[];
	const container = data as Row;
	const rows = container['rows'];
	if (Array.isArray(rows)) return rows as Row[];
	if (rows && typeof rows === 'object') return [rows as Row];
	const datas = container['datas'];
	if (Array.isArray(datas)) return datas as Row[];
	return [container];
}

function str(row: Row, key: string): string | undefined {
	const value = row[key];
	if (typeof value === 'string' && value.trim()) return value.trim();
	if (typeof value === 'number') return String(value);
	const label = row[`${key}_str`];
	if (typeof label === 'string' && label.trim()) return label.trim();
	return undefined;
}

/** Prefer field `${key}_str` (label referensi), fallback ke pemetaan id lokal. */
function refLabel(row: Row, key: string, fallbackMap?: Record<string, string>): string | undefined {
	const label = row[`${key}_str`];
	if (typeof label === 'string' && label.trim()) return label.trim();
	const id = row[key];
	if (id != null && typeof id !== 'object' && `${key}_str` in row === false) {
		const mapped = fallbackMap?.[String(id)];
		if (mapped) return mapped;
	}
	return undefined;
}

function intOrNull(value: unknown): number | null {
	const n = Number(value);
	return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function todayIsoDate(): string {
	return new Date().toISOString().slice(0, 10);
}

/** `20251` → tahun 2025 semester ganjil; `20252` → genap. */
function parseDapodikSemesterId(id: string): { year: number; tipe: 'ganjil' | 'genap' } | null {
	const match = /^(\d{4})([12])$/.exec(id.trim());
	if (!match) return null;
	return { year: Number(match[1]), tipe: match[2] === '1' ? 'ganjil' : 'genap' };
}

// ---------------------------------------------------------------------------
// Settings helpers
// ---------------------------------------------------------------------------

export async function getDapodikSettings(sekolahId: number): Promise<DapodikSettingsView | null> {
	const row = await db.query.tableDapodikSettings.findFirst({
		where: eq(tableDapodikSettings.sekolahId, sekolahId)
	});
	if (!row) return null;
	return { url: row.url, token: row.token, npsn: row.npsn, lastSyncAt: row.lastSyncAt };
}

/**
 * Simpan kredensial/progress sinkronisasi. Semua field opsional — hanya yang
 * diberikan yang diubah, sehingga bisa dipakai untuk menyimpan isian form
 * sebelum probe (agar user tidak mengisi ulang saat mencoba lagi).
 */
async function saveDapodikSettings(
	sekolahId: number,
	data: {
		url?: string;
		token?: string;
		npsn?: string | null;
		semesterIdDapodik?: string | null;
		markSyncedAt?: boolean;
	}
) {
	const now = new Date().toISOString();
	const existing = await db.query.tableDapodikSettings.findFirst({
		where: eq(tableDapodikSettings.sekolahId, sekolahId)
	});
	const values: Partial<typeof tableDapodikSettings.$inferInsert> = {
		updatedAt: now
	};
	if (data.url !== undefined) values.url = data.url;
	if (data.token !== undefined) values.token = data.token;
	if (data.npsn !== undefined) values.npsn = data.npsn;
	if (data.semesterIdDapodik !== undefined) {
		values.semesterIdDapodikTerakhir =
			data.semesterIdDapodik ?? existing?.semesterIdDapodikTerakhir ?? null;
	}
	if (data.markSyncedAt) values.lastSyncAt = now;

	if (existing) {
		await db
			.update(tableDapodikSettings)
			.set(values)
			.where(eq(tableDapodikSettings.id, existing.id));
	} else {
		await db.insert(tableDapodikSettings).values({
			sekolahId,
			url: data.url ?? '',
			token: data.token ?? '',
			npsn: data.npsn ?? null,
			lastSyncAt: data.markSyncedAt ? now : null,
			semesterIdDapodikTerakhir: values.semesterIdDapodikTerakhir ?? null,
			...values
		});
	}
}

// ---------------------------------------------------------------------------
// Sync entrypoint
// ---------------------------------------------------------------------------

export async function runDapodikSync(options: {
	/** Boleh null (mode init / belum ada sekolah) — sekolah akan dibuat dari profil Dapodik. */
	sekolahId: number | null;
	mode: DapodikMode;
	urlInput?: string | null;
	tokenInput?: string | null;
	npsn: string | null;
}): Promise<DapodikSyncResult> {
	const { mode, npsn } = options;
	const sections: DapodikSectionLog[] = [];

	let sekolahId = options.sekolahId ?? (await firstExistingSekolahId());

	const saved = sekolahId ? await getDapodikSettings(sekolahId) : null;
	const urlInput = options.urlInput?.trim() || saved?.url || '';
	const base = normalizeWebServiceUrl(urlInput);
	const token = options.tokenInput?.trim() || saved?.token || '';
	if (!token) throw new DapodikError('Token web service Dapodik wajib diisi.');

	// Simpan isian form SEKARANG (sebelum probe) supaya user tidak perlu
	// mengisi ulang ketika membuka kembali modal — termasuk saat koneksi gagal.
	if (sekolahId) {
		await saveDapodikSettings(sekolahId, { url: base, token, npsn });
	}

	// 1. Probe getSekolah — memvalidasi pasangan URL+token sebelum dipakai (docs/erapor.md §5.2).
	const probe = await dapodikGet(base, token, 'getSekolah', {
		npsn: npsn ?? undefined,
		semester_id: sekolahId ? await guessSemesterId(sekolahId) : undefined
	});
	if (!probe.ok) {
		throw new DapodikError(probe.error ?? `Tes koneksi gagal (HTTP ${probe.status}).`);
	}
	const sekolahRows = rowsOf(probe.data);
	const sekolahPayload = sekolahRows[0] ?? null;
	const namaDapodik = sekolahPayload ? str(sekolahPayload, 'nama') : undefined;

	if (mode === 'tes-koneksi') {
		return {
			message: `Koneksi berhasil${namaDapodik ? ` ke ${namaDapodik}` : ''}. Token Dapodik valid.`,
			sections,
			sekolahId: sekolahId ?? undefined
		};
	}

	// 2. Pastikan ada baris sekolah target. Pada instalasi baru (belum ada sekolah),
	//    buat langsung dari profil Dapodik — data yang sama akan ditimpa di langkah profil.
	if (!sekolahId) {
		try {
			sekolahId = await createSekolahFromDapodik(sekolahPayload, options.npsn);
			sections.push({
				label: 'Sekolah',
				status: 'ok',
				detail: 'Belum ada data sekolah — dibuat otomatis dari profil Dapodik.'
			});
			// Kredensial belum sempat disimpan (sekolah baru saja ada) — simpan sekarang.
			await saveDapodikSettings(sekolahId, { url: base, token, npsn });
		} catch (e) {
			throw new DapodikError(`Gagal membuat data sekolah dari Dapodik: ${(e as Error).message}`);
		}
	}

	// 3. Deteksi semester Dapodik lewat getRombonganBelajar (getSemester &
	//    getTahunAjaran tidak tersedia pada banyak build Dapodik desktop).
	const rombelLoad = await loadRombonganBelajarTerbaru(sekolahId, base, token, npsn, sections);

	if (mode === 'semester') {
		let message = 'Tidak ditemukan semester dengan data di Dapodik.';
		if (rombelLoad) {
			const target = await ensureLocalSemester(sekolahId, rombelLoad.dapodikSemesterId, sections);
			message = target
				? `Semester ${rombelLoad.dapodikSemesterId} berhasil disinkronkan dan diaktifkan.`
				: 'Sinkronisasi semester gagal.';
		}
		return { message, sections, sekolahId };
	}

	// ---- Mode "semua" ----
	if (!rombelLoad) {
		return { message: 'Sinkronisasi selesai dengan catatan.', sections, sekolahId };
	}

	// 4. Pastikan tahun ajaran + semester lokal tersedia dan aktif.
	const semesterTarget = await ensureLocalSemester(
		sekolahId,
		rombelLoad.dapodikSemesterId,
		sections
	);
	if (!semesterTarget) {
		return { message: 'Sinkronisasi selesai dengan catatan.', sections, sekolahId };
	}
	const semesterIdDapodik = rombelLoad.dapodikSemesterId;

	// 5. Profil sekolah.
	await syncSekolahProfile(sekolahId, sekolahPayload, sections);

	// 6. GTK/PTK → pegawai (sekaligus usul kepala sekolah bila masih placeholder).
	const ptkIndex = await syncPtk(sekolahId, base, token, npsn, semesterIdDapodik, sections);

	// 7. Rombongan belajar → kelas; anggota_rombel & pembelajaran berada NESTED
	//    di dalam row rombel (tidak ada endpoint terpisah pada build ini).
	const rombel = await upsertKelasFromRombel(
		sekolahId,
		semesterTarget,
		rombelLoad.rows,
		ptkIndex,
		sections
	);

	// 8. Peserta didik → murid (baris PD sudah membawa penempatan rombel).
	await syncPesertaDidik(
		sekolahId,
		semesterTarget,
		rombel.kelasByDapodik,
		rombel.anggotaMap,
		base,
		token,
		npsn,
		sections,
		sekolahPayload
	);

	// Refresh indeks murid (kelasId sudah terisi saat insert/update murid).
	const muridIndex = await buildMuridIndex(sekolahId, semesterTarget.id);

	// 9. Pembelajaran nested → mata pelajaran per kelas + guru pengampu.
	await upsertPembelajaran(rombel.pembelajaranItems, muridIndex.kelasIdsSet(), ptkIndex, sections);

	// 9b. Akun pengguna guru + penugasan mapel (halaman /pengguna).
	await ensureGuruAccounts(sekolahId, sections);

	// 10. Ekstrakurikuler — rombel jenis 51 di getRombonganBelajar (endpoint
	//     getEkskul tidak tersedia / 404 pada build Dapodik desktop).
	await syncEkskul(muridIndex, rombelLoad.rows, sections);

	// 11. Referensi mata pelajaran nasional (getMataPelajaran) — cache lokal untuk
	//     pemetaan mapel buatan sekolah ke ID Dapodik saat posting nilai.
	await syncMapelReferensi(base, token, npsn, semesterIdDapodik, sections);

	// Catat semester terakhir yang dipakai agar sinkron berikutnya konsisten.
	await saveDapodikSettings(sekolahId, {
		semesterIdDapodik: semesterIdDapodik,
		markSyncedAt: true
	});

	// Sinkronisasi berhasil — rekonsiliasi skema DB di latar belakang (auto db:push)
	// supaya tabel/kolom baru dari pembaruan aplikasi tersedia tanpa langkah manual.
	triggerSchemaSync();

	return {
		message: `Sinkronisasi Dapodik selesai untuk semester ${semesterIdDapodik}.`,
		sections,
		sekolahId
	};
}

/** Ambil ID sekolah pertama yang ada di DB (fallback cookieParser saat cookie belum ada). */
async function firstExistingSekolahId(): Promise<number | null> {
	const row = await db.query.tableSekolah.findFirst({ columns: { id: true } });
	return row?.id ?? null;
}

/**
 * Buat baris sekolah (+alamat +kepala sekolah placeholder) dari payload getSekolah.
 * Semua field wajib diberi nilai aman ('-' / default) sehingga insert tidak pernah gagal
 * karena kolom NOT NULL; nilai asli Dapodik menimpa placeholder via syncSekolahProfile.
 */
async function createSekolahFromDapodik(
	payload: Row | null,
	fallbackNpsn: string | null
): Promise<number> {
	const nama = str(payload ?? {}, 'nama') ?? 'Sekolah Baru';
	const npsn = fallbackNpsn || str(payload ?? {}, 'npsn') || '-';
	const email = str(payload ?? {}, 'email') || '-';
	const jalan = str(payload ?? {}, 'alamat_jalan') ?? '-';
	const desa = str(payload ?? {}, 'desa_kelurahan') ?? '-';
	const kecamatan = str(payload ?? {}, 'kecamatan') ?? '-';
	const kabupaten = str(payload ?? {}, 'kabupaten_kota') ?? '-';
	const website = str(payload ?? {}, 'website');
	const dapodikSekolahId = str(payload ?? {}, 'sekolah_id');

	const [alamat] = await db
		.insert(tableAlamat)
		.values({ jalan, desa, kecamatan, kabupaten })
		.returning({ id: tableAlamat.id });
	const [kepala] = await db
		.insert(tablePegawai)
		.values({ nama: '-', nip: '-' })
		.returning({ id: tablePegawai.id });

	const [sekolah] = await db
		.insert(tableSekolah)
		.values({
			jenjangPendidikan: mapBentukPendidikan(payload),
			jenjangVariant: mapJenjangVariant(payload),
			nama,
			npsn,
			email,
			alamatId: alamat!.id,
			kepalaSekolahId: kepala!.id,
			...(website ? { website } : {}),
			...(dapodikSekolahId ? { dapodikSekolahId } : {})
		})
		.returning({ id: tableSekolah.id });
	return sekolah!.id;
}

const BENTUK_PENDIDIKAN_MAP: Record<
	string,
	{ jenjang: 'sd' | 'smp' | 'sma' | 'slb'; variant?: string }
> = {
	sd: { jenjang: 'sd', variant: 'sd' },
	mi: { jenjang: 'sd', variant: 'mi' },
	smp: { jenjang: 'smp', variant: 'smp' },
	mts: { jenjang: 'smp', variant: 'mts' },
	sma: { jenjang: 'sma', variant: 'sma' },
	ma: { jenjang: 'sma', variant: 'ma' },
	smk: { jenjang: 'sma', variant: 'smk' },
	lb: { jenjang: 'slb', variant: 'slb' }
};

function mapBentukPendidikan(payload: Row | null): 'sd' | 'smp' | 'sma' | 'slb' | 'pkbm' | 'srt' {
	const raw = (
		str(payload ?? {}, 'bentuk_pendidikan_id_str') ??
		str(payload ?? {}, 'bentuk_pendidikan') ??
		''
	)
		.toLowerCase()
		.trim();
	return BENTUK_PENDIDIKAN_MAP[raw]?.jenjang ?? 'sd';
}

function mapJenjangVariant(payload: Row | null): string | undefined {
	const raw = (
		str(payload ?? {}, 'bentuk_pendidikan_id_str') ??
		str(payload ?? {}, 'bentuk_pendidikan') ??
		''
	)
		.toLowerCase()
		.trim();
	return BENTUK_PENDIDIKAN_MAP[raw]?.variant;
}

/** Tebak semester_id Dapodik dari semester aktif lokal atau kalender saat ini (juli–des = ganjil). */
async function guessSemesterId(sekolahId: number): Promise<string> {
	const active = await db.query.tableSemester.findFirst({
		where: eq(tableSemester.isAktif, true),
		with: { tahunAjaran: true }
	});
	if (active?.dapodikSemesterId && active.tahunAjaran.sekolahId === sekolahId) {
		return active.dapodikSemesterId;
	}
	const now = new Date();
	const year = now.getFullYear();
	return now.getMonth() >= 6 ? `${year}1` : `${year - 1}2`;
}

// ---------------------------------------------------------------------------
// Section: semester (deteksi via data rombongan belajar)
// ---------------------------------------------------------------------------

interface TargetSemester {
	id: number;
	tahunAjaranId: number;
	dapodikSemesterId: string;
}

/**
 * Endpoint getTahunAjaran/getSemester TIDAK tersedia pada banyak build Dapodik
 * desktop (HTTP 404). Semester yang benar dideteksi dengan mencoba kandidat
 * semester_id terbaru-dahulu pada endpoint getRombonganBelajar lalu memakai
 * semester pertama yang memiliki data.
 */
async function semesterCandidates(sekolahId: number): Promise<string[]> {
	const first = await guessSemesterId(sekolahId);
	let parsed = parseDapodikSemesterId(first);
	if (!parsed) parsed = { year: new Date().getFullYear(), tipe: 'ganjil' };
	const list: string[] = [];
	let { year, tipe } = parsed;
	for (let i = 0; i < 10; i++) {
		list.push(`${year}${tipe === 'ganjil' ? '1' : '2'}`);
		if (tipe === 'ganjil') {
			tipe = 'genap';
			year -= 1;
		} else {
			tipe = 'ganjil';
		}
	}
	return [...new Set(list)];
}

/** GET getRombonganBelajar untuk satu semester; lempar DapodikError bila gagal. */
async function fetchRombonganBelajar(
	base: string,
	token: string,
	npsn: string | null,
	semesterId: string
): Promise<Row[]> {
	const call = await dapodikGet(base, token, 'getRombonganBelajar', {
		npsn,
		semester_id: semesterId
	});
	if (!call.ok) throw new DapodikError(call.error ?? `HTTP ${call.status}`);
	return rowsOf(call.data).filter((row) => Boolean(str(row, 'rombongan_belajar_id')));
}

interface RombonganBelajarLoad {
	dapodikSemesterId: string;
	rows: Row[];
}

async function loadRombonganBelajarTerbaru(
	sekolahId: number,
	base: string,
	token: string,
	npsn: string | null,
	sections: DapodikSectionLog[]
): Promise<RombonganBelajarLoad | null> {
	for (const sid of await semesterCandidates(sekolahId)) {
		try {
			const rows = await fetchRombonganBelajar(base, token, npsn, sid);
			if (rows.length > 0) return { dapodikSemesterId: sid, rows };
		} catch {
			// Semester tanpa data / permintaan ditolak — coba kandidat berikutnya.
		}
	}
	sections.push({
		label: 'Semester',
		status: 'gagal',
		detail:
			'Tidak ditemukan semester dengan data rombongan belajar pada WebService Dapodik. Pastikan Dapodik sudah diisi dan di-sinkronkan.'
	});
	return null;
}

/**
 * Pastikan tahun ajaran + semester lokal ada untuk `sid` Dapodik, lalu aktifkan.
 * Referensi semester tidak tersedia dari WebService sehingga nama/tanggal memakai
 * format standar hasil parsing `sid`.
 */
async function ensureLocalSemester(
	sekolahId: number,
	sid: string,
	sections: DapodikSectionLog[]
): Promise<TargetSemester | null> {
	try {
		const parsed = parseDapodikSemesterId(sid);
		if (!parsed) throw new DapodikError(`Format semester_id Dapodik tidak dikenal: ${sid}`);
		const yearKey = String(parsed.year);
		const taNama = `${parsed.year}/${parsed.year + 1}`;

		const taSekolah = await db
			.select({ id: tableTahunAjaran.id })
			.from(tableTahunAjaran)
			.where(eq(tableTahunAjaran.sekolahId, sekolahId));
		const taIdList = taSekolah.map((r) => r.id);

		// Cari tahun ajaran: by dapodik id → by nama → insert baru.
		let ta =
			(await db.query.tableTahunAjaran.findFirst({
				where: and(
					eq(tableTahunAjaran.sekolahId, sekolahId),
					eq(tableTahunAjaran.dapodikTahunAjaranId, yearKey)
				)
			})) ??
			(await db.query.tableTahunAjaran.findFirst({
				where: and(eq(tableTahunAjaran.sekolahId, sekolahId), eq(tableTahunAjaran.nama, taNama))
			}));
		if (!ta) {
			const inserted = await db
				.insert(tableTahunAjaran)
				.values({ sekolahId, nama: taNama, dapodikTahunAjaranId: yearKey })
				.returning({ id: tableTahunAjaran.id });
			if (!inserted[0]) throw new DapodikError('Gagal membuat tahun ajaran.');
			ta = await db.query.tableTahunAjaran.findFirst({
				where: eq(tableTahunAjaran.id, inserted[0].id)
			});
			taIdList.push(inserted[0].id);
		} else if (!ta.dapodikTahunAjaranId) {
			await db
				.update(tableTahunAjaran)
				.set({ dapodikTahunAjaranId: yearKey })
				.where(eq(tableTahunAjaran.id, ta.id));
		}
		if (!ta) throw new DapodikError('Gagal membuat tahun ajaran.');

		// Cari semester: by dapodik id → by (tahunAjaranId, tipe) → insert baru.
		let semester =
			(await db.query.tableSemester.findFirst({
				where: and(
					eq(tableSemester.dapodikSemesterId, sid),
					inArray(tableSemester.tahunAjaranId, taIdList.length ? taIdList : [ta.id])
				)
			})) ??
			(await db.query.tableSemester.findFirst({
				where: and(eq(tableSemester.tahunAjaranId, ta.id), eq(tableSemester.tipe, parsed.tipe))
			}));
		if (!semester) {
			const inserted = await db
				.insert(tableSemester)
				.values({
					tahunAjaranId: ta.id,
					tipe: parsed.tipe,
					nama: parsed.tipe === 'ganjil' ? 'Semester Ganjil' : 'Semester Genap',
					dapodikSemesterId: sid
				})
				.returning({ id: tableSemester.id });
			if (!inserted[0]) throw new DapodikError('Gagal membuat semester.');
			semester = await db.query.tableSemester.findFirst({
				where: eq(tableSemester.id, inserted[0].id)
			});
		}
		if (!semester) throw new DapodikError('Gagal membuat semester.');

		await activateSemester(sekolahId, ta.id, semester.id);

		sections.push({
			label: 'Semester',
			status: 'ok',
			detail: `Semester terdeteksi dari data rombongan belajar: ${taNama} ${
				parsed.tipe === 'ganjil' ? 'Ganjil' : 'Genap'
			} (${sid}) — diaktifkan di aplikasi.`
		});

		return { id: semester.id, tahunAjaranId: ta.id, dapodikSemesterId: sid };
	} catch (e) {
		sections.push({
			label: 'Semester',
			status: 'gagal',
			detail: (e as Error).message
		});
		return null;
	}
}

async function activateSemester(sekolahId: number, tahunAjaranId: number, semesterId: number) {
	await db.transaction(async (tx) => {
		await tx
			.update(tableTahunAjaran)
			.set({ isAktif: false })
			.where(eq(tableTahunAjaran.sekolahId, sekolahId));
		await tx
			.update(tableTahunAjaran)
			.set({ isAktif: true })
			.where(eq(tableTahunAjaran.id, tahunAjaranId));
		const siblings = await tx
			.select({ id: tableTahunAjaran.id })
			.from(tableTahunAjaran)
			.where(eq(tableTahunAjaran.sekolahId, sekolahId));
		await tx
			.update(tableSemester)
			.set({ isAktif: false })
			.where(
				inArray(
					tableSemester.tahunAjaranId,
					siblings.map((s) => s.id)
				)
			);
		await tx.update(tableSemester).set({ isAktif: true }).where(eq(tableSemester.id, semesterId));
	});
}

// ---------------------------------------------------------------------------
// Section: profil sekolah
// ---------------------------------------------------------------------------

async function syncSekolahProfile(
	sekolahId: number,
	payload: Row | null,
	sections: DapodikSectionLog[]
) {
	try {
		if (!payload) throw new DapodikError('Profil sekolah kosong.');

		const sekolah = await db.query.tableSekolah.findFirst({
			where: eq(tableSekolah.id, sekolahId),
			with: { alamat: true }
		});
		if (!sekolah) throw new DapodikError('Sekolah lokal tidak ditemukan.');

		const updates: Partial<typeof tableSekolah.$inferInsert> = {
			dapodikSekolahId: str(payload, 'sekolah_id')
		};
		const nama = str(payload, 'nama');
		if (nama) updates.nama = nama;
		const email = str(payload, 'email');
		if (email) updates.email = email;
		const website = str(payload, 'website');
		if (website) updates.website = website;
		await db.update(tableSekolah).set(updates).where(eq(tableSekolah.id, sekolahId));

		const alamatUpdates: Partial<typeof tableAlamat.$inferInsert> = {};
		const jalan = str(payload, 'alamat_jalan');
		if (jalan) alamatUpdates.jalan = jalan;
		const desa = str(payload, 'desa_kelurahan') ?? str(payload, 'dusun');
		if (desa) alamatUpdates.desa = desa;
		const kecamatan = str(payload, 'kecamatan');
		if (kecamatan) alamatUpdates.kecamatan = kecamatan;
		const kabupaten = str(payload, 'kabupaten_kota');
		if (kabupaten) alamatUpdates.kabupaten = kabupaten;
		const provinsi = str(payload, 'provinsi');
		if (provinsi) alamatUpdates.provinsi = provinsi;
		const kodePos = str(payload, 'kode_pos');
		if (kodePos) alamatUpdates.kodePos = kodePos;
		if (Object.keys(alamatUpdates).length > 0) {
			await db.update(tableAlamat).set(alamatUpdates).where(eq(tableAlamat.id, sekolah.alamatId));
		}

		sections.push({
			label: 'Profil Sekolah',
			status: 'ok',
			detail: `Identitas sekolah diperbarui dari Dapodik${nama ? ` (${nama})` : ''}.`
		});
	} catch (e) {
		sections.push({
			label: 'Profil Sekolah',
			status: 'gagal',
			detail: (e as Error).message
		});
	}
}

// ---------------------------------------------------------------------------
// Section: PTK (pegawai)
// ---------------------------------------------------------------------------

interface PegawaiIndex {
	byDapodik: Map<string, number>;
	byNip: Map<string, number>;
	byNama: Map<string, number>;

	resolve(ptkId?: string | null, nip?: string | null, nama?: string | null): number | null;
}

async function buildPegawaiIndex(): Promise<PegawaiIndex> {
	const index: PegawaiIndex = {
		byDapodik: new Map(),
		byNip: new Map(),
		byNama: new Map(),
		resolve(ptkId, nip, nama) {
			if (ptkId && index.byDapodik.has(ptkId)) return index.byDapodik.get(ptkId)!;
			if (nip && index.byNip.has(nip)) return index.byNip.get(nip)!;
			if (nama && index.byNama.has(nama.toLowerCase()))
				return index.byNama.get(nama.toLowerCase())!;
			return null;
		}
	};
	const rows = await db.select().from(tablePegawai);
	for (const row of rows) {
		if (row.dapodikPtkId) index.byDapodik.set(row.dapodikPtkId, row.id);
		if (row.nip) index.byNip.set(row.nip, row.id);
		index.byNama.set(row.nama.toLowerCase(), row.id);
	}
	return index;
}

async function syncPtk(
	sekolahId: number,
	base: string,
	token: string,
	npsn: string | null,
	semesterId: string,
	sections: DapodikSectionLog[]
): Promise<PegawaiIndex> {
	const index = await buildPegawaiIndex();
	try {
		// Endpoint PTK pada WebService Dapodik desktop bernama `getGtk`
		// (getPtk/getPTK tidak tersedia → HTTP 404).
		const call = await dapodikGet(base, token, 'getGtk', { npsn, semester_id: semesterId });
		if (!call.ok) throw new DapodikError(call.error ?? `HTTP ${call.status}`);

		let created = 0;
		let updated = 0;
		let kepalaPegawaiId: number | null = null;

		for (const row of rowsOf(call.data)) {
			const ptkId = str(row, 'ptk_id');
			const nama = str(row, 'nama');
			if (!ptkId || !nama) continue;
			const nip = str(row, 'nip') ?? '';

			let pegawaiId = index.resolve(ptkId, nip || null, nama);
			if (pegawaiId) {
				await db
					.update(tablePegawai)
					.set({
						dapodikPtkId: ptkId,
						...(nip ? { nip } : {}),
						updatedAt: new Date().toISOString()
					})
					.where(eq(tablePegawai.id, pegawaiId));
				updated++;
			} else {
				const inserted = await db
					.insert(tablePegawai)
					.values({
						nama,
						nip: nip || '',
						dapodikPtkId: ptkId,
						nuptk: str(row, 'nuptk') ?? null
					})
					.returning({ id: tablePegawai.id });
				if (!inserted[0]) continue;
				pegawaiId = inserted[0].id;
				created++;
			}
			index.byDapodik.set(ptkId, pegawaiId);
			if (nip) index.byNip.set(nip, pegawaiId);
			index.byNama.set(nama.toLowerCase(), pegawaiId);

			// Usul kepala sekolah dari jabatan GTK (mis. "Kepala Sekolah").
			const jabatan = (str(row, 'jabatan_ptk_id') ?? '').toLowerCase();
			if (!kepalaPegawaiId && jabatan.includes('kepala')) {
				kepalaPegawaiId = pegawaiId;
			}
		}

		// Bila kepala sekolah lokal masih placeholder ('-'), isi dari GTK.
		if (kepalaPegawaiId) {
			const sekolahRow = await db.query.tableSekolah.findFirst({
				where: eq(tableSekolah.id, sekolahId),
				with: { kepalaSekolah: true }
			});
			if (sekolahRow && sekolahRow.kepalaSekolah.nama === '-') {
				await db
					.update(tableSekolah)
					.set({ kepalaSekolahId: kepalaPegawaiId })
					.where(eq(tableSekolah.id, sekolahId));
			}
		}

		sections.push({
			label: 'PTK / Guru',
			status: 'ok',
			detail: `${updated} pegawai dicocokkan, ${created} pegawai baru${
				kepalaPegawaiId ? ', kepala sekolah terdeteksi dari jabatan GTK' : ''
			}.`
		});
	} catch (e) {
		sections.push({
			label: 'PTK / Guru',
			status: 'gagal',
			detail: `${(e as Error).message} (endpoint getGtk)`
		});
	}
	return index;
}

// ---------------------------------------------------------------------------
// Section: akun pengguna guru (auth_user) + penugasan mapel
// ---------------------------------------------------------------------------

/**
 * GTK hasil sinkron hanya mengisi tabel pegawai — halaman /pengguna menampilkan
 * auth_user. Fungsi ini membuat akun untuk pegawai ber-dapodikPtkId yang belum
 * punya: wali kelas → type 'wali_kelas' (konsisten dengan alur lazy /pengguna),
 * sisanya → type 'user'. Lalu menautkan mata pelajaran pengampu ke akun guru.
 */
async function ensureGuruAccounts(sekolahId: number, sections: DapodikSectionLog[]) {
	try {
		const pegawaiRows = await db.select().from(tablePegawai);
		const accounts = await db.query.tableAuthUser.findMany({
			columns: { id: true, pegawaiId: true }
		});
		const accountByPegawai = new Map<number, number>();
		for (const acc of accounts) {
			if (acc.pegawaiId != null && !accountByPegawai.has(acc.pegawaiId)) {
				accountByPegawai.set(acc.pegawaiId, acc.id);
			}
		}

		// Kelas per wali → tipe akun + kelas_pindah bila multi-kelas.
		// Hanya kelas milik sekolah yang sedang sinkron.
		const kelasRows = await db.query.tableKelas.findMany({
			columns: { id: true, waliKelasId: true },
			where: and(eq(tableKelas.sekolahId, sekolahId), sql`${tableKelas.waliKelasId} IS NOT NULL`)
		});
		const kelasIdsByWali = new Map<number, number[]>();
		for (const k of kelasRows) {
			if (!k.waliKelasId) continue;
			const arr = kelasIdsByWali.get(k.waliKelasId) ?? [];
			arr.push(k.id);
			kelasIdsByWali.set(k.waliKelasId, arr);
		}

		// Multi-sekolah safety: pegawai yang dirujuk struktur sekolah LAIN
		// (wali/asrama/pengampu) jangan diberi akun berasal sekolah ini.
		// ponytail: pegawai sekolah lain yang belum tertaut apa pun tetap lolos;
		// perketat bila ada laporan salah-sekolah pada instalasi multi-sekolah.
		const claimedByOthers = new Set<number>();
		const otherKelas = await db.query.tableKelas.findMany({
			columns: { waliKelasId: true, waliAsramaId: true },
			where: sql`${tableKelas.sekolahId} != ${sekolahId}`
		});
		for (const k of otherKelas) {
			if (k.waliKelasId) claimedByOthers.add(k.waliKelasId);
			if (k.waliAsramaId) claimedByOthers.add(k.waliAsramaId);
		}
		const otherPengampu = await db
			.select({ pengampuId: tableMataPelajaran.pengampuId })
			.from(tableMataPelajaran)
			.innerJoin(tableKelas, eq(tableMataPelajaran.kelasId, tableKelas.id))
			.where(
				and(sql`${tableKelas.sekolahId} != ${sekolahId}`, isNotNull(tableMataPelajaran.pengampuId))
			);
		for (const m of otherPengampu) {
			if (m.pengampuId) claimedByOthers.add(m.pengampuId);
		}

		let created = 0;
		for (const peg of pegawaiRows) {
			if (!peg.dapodikPtkId || !peg.nama.trim() || accountByPegawai.has(peg.id)) continue;
			if (claimedByOthers.has(peg.id)) continue;
			const kelasIds = kelasIdsByWali.get(peg.id) ?? [];
			const type = kelasIds.length > 0 ? 'wali_kelas' : 'user';
			const permissions: UserPermission[] = [
				...(defaultPermissionsByType[type] ?? []),
				...(kelasIds.length > 1 ? (['kelas_pindah'] as UserPermission[]) : [])
			];
			const username = await resolveUniqueUsername(peg.nama);
			const password = randomBytes(6).toString('base64url');
			const { hash, salt } = hashPassword(password);
			const timestamp = new Date().toISOString();
			const inserted = await db
				.insert(tableAuthUser)
				.values({
					username,
					usernameNormalized: username.toLowerCase(),
					passwordHash: hash,
					passwordSalt: salt,
					passwordUpdatedAt: timestamp,
					mustChangePassword: true,
					permissions,
					type,
					sekolahId,
					pegawaiId: peg.id,
					kelasId: kelasIds[0],
					createdAt: timestamp,
					updatedAt: timestamp
				})
				.returning({ id: tableAuthUser.id });
			if (inserted[0]) {
				accountByPegawai.set(peg.id, inserted[0].id);
				created++;
			}
		}

		// Tautkan mapel pengampu → akun guru (many-to-many + legacy kolom tunggal).
		// Hanya mapel milik sekolah yang sedang sinkron.
		const mapelRows = await db
			.select({ id: tableMataPelajaran.id, pengampuId: tableMataPelajaran.pengampuId })
			.from(tableMataPelajaran)
			.innerJoin(tableKelas, eq(tableMataPelajaran.kelasId, tableKelas.id))
			.where(and(eq(tableKelas.sekolahId, sekolahId), isNotNull(tableMataPelajaran.pengampuId)));
		const linkRows = await db
			.select({
				authUserId: tableAuthUserMataPelajaran.authUserId,
				mataPelajaranId: tableAuthUserMataPelajaran.mataPelajaranId
			})
			.from(tableAuthUserMataPelajaran);
		const existingLinks = new Set(linkRows.map((l) => `${l.authUserId}:${l.mataPelajaranId}`));
		const linkCount = new Map<number, number>();
		let linked = 0;
		for (const m of mapelRows) {
			if (!m.pengampuId) continue;
			const userId = accountByPegawai.get(m.pengampuId);
			if (!userId) continue;
			const key = `${userId}:${m.id}`;
			linkCount.set(userId, (linkCount.get(userId) ?? 0) + 1);
			if (existingLinks.has(key)) continue;
			await db
				.insert(tableAuthUserMataPelajaran)
				.values({ authUserId: userId, mataPelajaranId: m.id });
			existingLinks.add(key);
			linked++;
		}

		// Backward compat: akun dengan tepat satu mapel → isi kolom tunggal.
		for (const [userId, count] of linkCount) {
			if (count !== 1) continue;
			const full = await db.query.tableAuthUser.findFirst({
				columns: { mataPelajaranId: true },
				where: eq(tableAuthUser.id, userId)
			});
			if (full && !full.mataPelajaranId) {
				const single = mapelRows.find(
					(m) => m.pengampuId && accountByPegawai.get(m.pengampuId) === userId
				);
				if (single) {
					await db
						.update(tableAuthUser)
						.set({ mataPelajaranId: single.id })
						.where(eq(tableAuthUser.id, userId));
				}
			}
		}

		sections.push({
			label: 'Akun Guru',
			status: 'ok',
			detail:
				created > 0 || linked > 0
					? `${created} akun dibuat${linked ? `, ${linked} penugasan mapel ditautkan` : ''}.`
					: 'Semua guru sudah memiliki akun.'
		});
	} catch (e) {
		sections.push({
			label: 'Akun Guru',
			status: 'gagal',
			detail: (e as Error).message
		});
	}
}

// ---------------------------------------------------------------------------
// Section: rombongan belajar → kelas (+ anggota & pembelajaran nested)
// ---------------------------------------------------------------------------

interface AnggotaPlacement {
	kelasId: number;
	anggotaId: string | null;
}

interface RombelSyncResult {
	kelasList: Array<{ id: number; dapodikId: string }>;
	/** rombongan_belajar_id Dapodik → id kelas lokal. */
	kelasByDapodik: Map<string, number>;
	/** peserta_didik_id → penempatan kelas (dari anggota_rombel nested). */
	anggotaMap: Map<string, AnggotaPlacement>;
	/** pembelajaran nested per kelas, diproses pada langkah mata pelajaran. */
	pembelajaranItems: Array<{ kelasId: number; row: Row }>;
}

/**
 * Upsert kelas dari rows getRombonganBelajar. Pada WebService Dapodik desktop,
 * `anggota_rombel[]` dan `pembelajaran[]` berada NESTED di dalam tiap row rombel
 * (endpoint terpisah getAnggotaRombel/getPembelajaran tidak tersedia/404), maka
 * keduanya dikumpulkan di sini untuk langkah berikutnya.
 */
async function upsertKelasFromRombel(
	sekolahId: number,
	target: TargetSemester,
	rows: Row[],
	ptkIndex: PegawaiIndex,
	sections: DapodikSectionLog[]
): Promise<RombelSyncResult> {
	const result: RombelSyncResult = {
		kelasList: [],
		kelasByDapodik: new Map(),
		anggotaMap: new Map(),
		pembelajaranItems: []
	};
	try {
		let created = 0;
		let updated = 0;
		let skipped = 0;

		for (const row of rows) {
			// Hanya rombel reguler (jenis_rombel 1); 16 = mapel pilihan, 51 = ekskul.
			const jenis = intOrNull(row['jenis_rombel']) ?? 1;
			if (jenis !== 1) {
				skipped++;
				continue;
			}
			const rombelId = str(row, 'rombongan_belajar_id');
			const nama = str(row, 'nama');
			if (!rombelId || !nama) continue;

			const waliKelasId = ptkIndex.resolve(str(row, 'ptk_id'));

			const existing =
				(await db.query.tableKelas.findFirst({
					where: and(
						eq(tableKelas.sekolahId, sekolahId),
						eq(tableKelas.semesterId, target.id),
						eq(tableKelas.dapodikRombonganBelajarId, rombelId)
					)
				})) ??
				(await db.query.tableKelas.findFirst({
					where: and(
						eq(tableKelas.sekolahId, sekolahId),
						eq(tableKelas.semesterId, target.id),
						eq(tableKelas.nama, nama)
					)
				}));

			let kelasId: number | null = null;
			if (existing) {
				await db
					.update(tableKelas)
					.set({
						nama,
						dapodikRombonganBelajarId: rombelId,
						...(waliKelasId ? { waliKelasId } : {})
					})
					.where(eq(tableKelas.id, existing.id));
				kelasId = existing.id;
				updated++;
			} else {
				const inserted = await db
					.insert(tableKelas)
					.values({
						sekolahId,
						tahunAjaranId: target.tahunAjaranId,
						semesterId: target.id,
						nama,
						dapodikRombonganBelajarId: rombelId,
						...(waliKelasId ? { waliKelasId } : {})
					})
					.returning({ id: tableKelas.id });
				if (inserted[0]) {
					kelasId = inserted[0].id;
					created++;
				}
			}
			if (!kelasId) continue;

			result.kelasList.push({ id: kelasId, dapodikId: rombelId });
			result.kelasByDapodik.set(rombelId, kelasId);

			// Anggota rombel nested → peta penempatan siswa.
			const anggotaRows = Array.isArray(row['anggota_rombel'])
				? (row['anggota_rombel'] as Row[])
				: [];
			for (const member of anggotaRows) {
				const pdId = str(member, 'peserta_didik_id');
				if (!pdId || result.anggotaMap.has(pdId)) continue;
				result.anggotaMap.set(pdId, {
					kelasId,
					anggotaId: str(member, 'anggota_rombel_id') ?? null
				});
			}

			// Pembelajaran nested → antrean mata pelajaran.
			const pbRows = Array.isArray(row['pembelajaran']) ? (row['pembelajaran'] as Row[]) : [];
			for (const pb of pbRows) {
				result.pembelajaranItems.push({ kelasId, row: pb });
			}
		}

		sections.push({
			label: 'Rombongan Belajar',
			status: 'ok',
			detail: `${updated} kelas dicocokkan, ${created} kelas baru${skipped ? `, ${skipped} rombel non-reguler dilewati` : ''}, ${result.anggotaMap.size} anggota & ${result.pembelajaranItems.length} pembelajaran terbaca.`
		});
	} catch (e) {
		sections.push({
			label: 'Rombongan Belajar',
			status: 'gagal',
			detail: (e as Error).message
		});
	}
	return result;
}

// ---------------------------------------------------------------------------
// Section: peserta didik → murid
// ---------------------------------------------------------------------------

interface MuridIndex {
	byDapodik: Map<string, { id: number; kelasId: number | null }>;

	kelasIdsSet(): Set<number>;
}

async function buildMuridIndex(sekolahId: number, semesterId: number): Promise<MuridIndex> {
	const index: MuridIndex = {
		byDapodik: new Map(),
		kelasIdsSet() {
			return new Set(
				[...index.byDapodik.values()].map((m) => m.kelasId).filter((v): v is number => v != null)
			);
		}
	};
	const rows = await db
		.select({
			id: tableMurid.id,
			kelasId: tableMurid.kelasId,
			dapodikPesertaDidikId: tableMurid.dapodikPesertaDidikId
		})
		.from(tableMurid)
		.where(and(eq(tableMurid.sekolahId, sekolahId), eq(tableMurid.semesterId, semesterId)));
	for (const row of rows) {
		if (row.dapodikPesertaDidikId) {
			index.byDapodik.set(row.dapodikPesertaDidikId, { id: row.id, kelasId: row.kelasId });
		}
	}
	return index;
}

async function findMuridByNisn(sekolahId: number, semesterId: number, nisn: string) {
	if (!nisn) return null;
	return db.query.tableMurid.findFirst({
		columns: { id: true },
		where: and(
			eq(tableMurid.sekolahId, sekolahId),
			eq(tableMurid.semesterId, semesterId),
			eq(tableMurid.nisn, nisn)
		)
	});
}

async function upsertWaliMurid(
	tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
	waliId: number | null,
	data: { nama: string; pekerjaan: string; kontak?: string | null; alamat?: string | null }
): Promise<number | null> {
	// Harus lewat `tx` — menulis via koneksi lain di luar transaksi akan
	// mengunci diri sendiri (SQLITE_BUSY) karena txn memegang write lock.
	if (waliId) {
		await tx
			.update(tableWaliMurid)
			.set({ nama: data.nama, pekerjaan: data.pekerjaan, kontak: data.kontak ?? undefined })
			.where(eq(tableWaliMurid.id, waliId));
		return waliId;
	}
	const inserted = await tx
		.insert(tableWaliMurid)
		.values({
			nama: data.nama,
			pekerjaan: data.pekerjaan,
			kontak: data.kontak ?? null,
			alamat: data.alamat ?? null
		})
		.returning({ id: tableWaliMurid.id });
	return inserted[0]?.id ?? null;
}

async function syncPesertaDidik(
	sekolahId: number,
	target: TargetSemester,
	kelasByDapodik: Map<string, number>,
	anggota: Map<string, AnggotaPlacement>,
	base: string,
	token: string,
	npsn: string | null,
	sections: DapodikSectionLog[],
	/** Profil getSekolah — fallback wilayah alamat murid (PD rows hanya punya alamat_jalan). */
	sekolahPayload: Row | null
): Promise<MuridIndex> {
	const index = await buildMuridIndex(sekolahId, target.id);
	// Beberapa build Dapodik menamai ibu `nama_ibu`, bukan `nama_ibu_kandung`.
	const namaIbuRow = (row: Row) => str(row, 'nama_ibu_kandung') ?? str(row, 'nama_ibu');
	const wilayahFallback = (() => {
		const src = sekolahPayload ?? {};
		return {
			desa: str(src, 'desa_kelurahan') ?? str(src, 'dusun'),
			kecamatan: str(src, 'kecamatan'),
			kabupaten: str(src, 'kabupaten_kota'),
			provinsi: str(src, 'provinsi')
		};
	})();
	try {
		const call = await dapodikGet(base, token, 'getPesertaDidik', {
			npsn,
			semester_id: target.dapodikSemesterId
		});
		if (!call.ok) throw new DapodikError(call.error ?? `HTTP ${call.status}`);

		const rows = rowsOf(call.data);
		let created = 0;
		let updated = 0;
		let skipped = 0;
		let tanpaKelas = 0;

		for (const row of rows) {
			const pdId = str(row, 'peserta_didik_id');
			const nama = str(row, 'nama');
			if (!pdId || !nama) {
				skipped++;
				continue;
			}
			// Respons getPesertaDidik berbentuk FLAT: nipd/sekolah_asal/tanggal masuk
			// dan penempatan rombel (anggota_rombel_id + rombongan_belajar_id)
			// langsung berada di baris, bukan di objek nested.
			const nisn = str(row, 'nisn') ?? '';
			const nipd = str(row, 'nipd');

			const jenisKelaminRaw = str(row, 'jenis_kelamin');
			const jenisKelamin = jenisKelaminRaw === 'P' ? 'P' : 'L';
			const agama = refLabel(row, 'agama_id', AGAMA_MAP) ?? '';
			const tanggalLahir = str(row, 'tanggal_lahir') ?? '';
			const tempatLahir = str(row, 'tempat_lahir') ?? '';
			const sekolahAsal = str(row, 'sekolah_asal') ?? '';
			const tanggalMasuk = str(row, 'tanggal_masuk_sekolah') ?? todayIsoDate();

			const existingByDapodik = index.byDapodik.get(pdId) ?? null;
			let existingId = existingByDapodik?.id ?? null;
			if (!existingId && nisn) {
				const found = await findMuridByNisn(sekolahId, target.id, nisn);
				existingId = found?.id ?? null;
			}
			// Penempatan kelas: utamakan rombongan_belajar_id milik baris PD,
			// fallback ke peta dari anggota_rombel nested pada respons rombel.
			const rbId = str(row, 'rombongan_belajar_id');
			const kelasDariRb = rbId ? kelasByDapodik.get(rbId) : undefined;
			const placement: AnggotaPlacement | null = kelasDariRb
				? { kelasId: kelasDariRb, anggotaId: str(row, 'anggota_rombel_id') ?? null }
				: (anggota.get(pdId) ?? null);

			try {
				if (existingId) {
					await db.transaction(async (tx) => {
						const current = await tx.query.tableMurid.findFirst({
							where: eq(tableMurid.id, existingId!),
							with: { alamat: true }
						});
						if (!current) return;
						await tx
							.update(tableMurid)
							.set({
								nama,
								jenisKelamin,
								agama: agama || current.agama,
								tempatLahir: tempatLahir || current.tempatLahir,
								tanggalLahir: tanggalLahir || current.tanggalLahir,
								pendidikanSebelumnya: sekolahAsal || current.pendidikanSebelumnya,
								nisn: nisn || current.nisn,
								dapodikPesertaDidikId: pdId,
								...(placement
									? {
											kelasId: placement.kelasId,
											dapodikAnggotaRombelId: placement.anggotaId ?? String(current.id)
										}
									: {}),
								nik: str(row, 'nik') ?? current.nik,
								anakKe: intOrNull(row['anak_keberapa']) ?? current.anakKe,
								updatedAt: new Date().toISOString()
							})
							.where(eq(tableMurid.id, current.id));

						const alamatJalan = str(row, 'alamat_jalan');
						const desaRow = str(row, 'desa_kelurahan') ?? str(row, 'dusun');
						// Fallback wilayah dari profil sekolah — hanya isi bila lokal masih kosong.
						const alamatSet: Partial<typeof tableAlamat.$inferInsert> = {};
						if (alamatJalan) alamatSet.jalan = alamatJalan;
						if (desaRow) alamatSet.desa = desaRow;
						else if (
							(!current.alamat?.desa || current.alamat.desa === '-') &&
							wilayahFallback.desa
						) {
							alamatSet.desa = wilayahFallback.desa;
						}
						if (
							(!current.alamat?.kecamatan || current.alamat.kecamatan === '-') &&
							wilayahFallback.kecamatan
						) {
							alamatSet.kecamatan = wilayahFallback.kecamatan;
						}
						if (
							(!current.alamat?.kabupaten || current.alamat.kabupaten === '-') &&
							wilayahFallback.kabupaten
						) {
							alamatSet.kabupaten = wilayahFallback.kabupaten;
						}
						if (
							(!current.alamat?.provinsi || current.alamat.provinsi === '-') &&
							wilayahFallback.provinsi
						) {
							alamatSet.provinsi = wilayahFallback.provinsi;
						}
						if (current.alamatId && Object.keys(alamatSet).length > 0) {
							await tx
								.update(tableAlamat)
								.set(alamatSet)
								.where(eq(tableAlamat.id, current.alamatId));
						}

						// Orang tua / wali (hanya perbarui bila data Dapodik tersedia).
						// Bila relasi murid→wali belum ada, tautkan id hasil insert.
						const namaAyah = str(row, 'nama_ayah');
						if (namaAyah) {
							const pekerjaanAyah = refLabel(row, 'pekerjaan_ayah_id') ?? '-';
							const ayahId = await upsertWaliMurid(tx, current.ayahId, {
								nama: namaAyah,
								pekerjaan: pekerjaanAyah,
								kontak: str(row, 'nomor_telepon_seluler_ayah') ?? null
							});
							if (ayahId && !current.ayahId) {
								await tx.update(tableMurid).set({ ayahId }).where(eq(tableMurid.id, current.id));
							}
						}
						const namaIbu = namaIbuRow(row);
						if (namaIbu) {
							const pekerjaanIbu = refLabel(row, 'pekerjaan_ibu_id') ?? '-';
							const ibuId = await upsertWaliMurid(tx, current.ibuId, {
								nama: namaIbu,
								pekerjaan: pekerjaanIbu,
								kontak: str(row, 'nomor_telepon_seluler_ibu') ?? null
							});
							if (ibuId && !current.ibuId) {
								await tx.update(tableMurid).set({ ibuId }).where(eq(tableMurid.id, current.id));
							}
						}
						const namaWali = str(row, 'nama_wali');
						if (namaWali) {
							const pekerjaanWali = refLabel(row, 'pekerjaan_wali_id') ?? '-';
							const waliId = await upsertWaliMurid(tx, current.waliId, {
								nama: namaWali,
								pekerjaan: pekerjaanWali,
								kontak: str(row, 'nomor_telepon_seluler_wali') ?? null,
								alamat: str(row, 'alamat_jalan_wali') ?? null
							});
							if (waliId && !current.waliId) {
								await tx.update(tableMurid).set({ waliId }).where(eq(tableMurid.id, current.id));
							}
						}
					});
					index.byDapodik.set(pdId, {
						id: existingId,
						kelasId: placement?.kelasId ?? existingByDapodik?.kelasId ?? null
					});
					updated++;
				} else {
					// Murid baru wajib punya kelas (kolom NOT NULL) — butuh penempatan
					// rombel dari Dapodik. Tanpa itu, siswa dilewati (dihitung terpisah).
					if (!placement) {
						tanpaKelas++;
						skipped++;
						continue;
					}
					// Insert murid baru beserta alamat & orang tua/wali dalam satu transaksi.
					await db.transaction(async (tx) => {
						const nis = await (async () => {
							const candidateBase = nipd || nisn || `DAPODIK-${pdId.slice(0, 8)}`;
							let candidate = candidateBase;
							let suffix = 1;
							while (
								await tx.query.tableMurid.findFirst({
									columns: { id: true },
									where: and(
										eq(tableMurid.sekolahId, sekolahId),
										eq(tableMurid.semesterId, target.id),
										eq(tableMurid.nis, candidate)
									)
								})
							) {
								candidate = `${candidateBase}-${suffix++}`;
							}
							return candidate;
						})();

						const [alamat] = await tx
							.insert(tableAlamat)
							.values({
								jalan: str(row, 'alamat_jalan') ?? '-',
								desa:
									str(row, 'desa_kelurahan') ?? str(row, 'dusun') ?? wilayahFallback.desa ?? '-',
								kecamatan: wilayahFallback.kecamatan ?? '-',
								kabupaten: wilayahFallback.kabupaten ?? '-',
								provinsi: wilayahFallback.provinsi ?? '-'
							})
							.returning({ id: tableAlamat.id });

						async function insertWali(data: {
							nama?: string;
							pekerjaan?: string;
							kontak?: string;
							alamat?: string;
						}): Promise<number | null> {
							if (!data.nama) return null;
							const [wali] = await tx
								.insert(tableWaliMurid)
								.values({
									nama: data.nama,
									pekerjaan: data.pekerjaan ?? '-',
									kontak: data.kontak ?? null,
									alamat: data.alamat ?? null
								})
								.returning({ id: tableWaliMurid.id });
							return wali?.id ?? null;
						}

						const ayahId = await insertWali({
							nama: str(row, 'nama_ayah'),
							pekerjaan: refLabel(row, 'pekerjaan_ayah_id'),
							kontak: str(row, 'nomor_telepon_seluler_ayah')
						});
						const ibuId = await insertWali({
							nama: namaIbuRow(row),
							pekerjaan: refLabel(row, 'pekerjaan_ibu_id'),
							kontak: str(row, 'nomor_telepon_seluler_ibu')
						});
						const waliId = await insertWali({
							nama: str(row, 'nama_wali'),
							pekerjaan: refLabel(row, 'pekerjaan_wali_id'),
							kontak: str(row, 'nomor_telepon_seluler_wali'),
							alamat: str(row, 'alamat_jalan_wali')
						});

						const inserted = await tx
							.insert(tableMurid)
							.values({
								sekolahId,
								semesterId: target.id,
								kelasId: placement.kelasId,
								dapodikAnggotaRombelId: placement.anggotaId ?? `pd:${pdId}`,
								nis,
								nisn: nisn || '-',
								nama,
								tempatLahir: tempatLahir || '-',
								tanggalLahir: tanggalLahir || todayIsoDate(),
								jenisKelamin,
								agama: agama || '-',
								pendidikanSebelumnya: sekolahAsal || '-',
								tanggalMasuk,
								alamatId: alamat!.id,
								ayahId,
								ibuId,
								waliId,
								dapodikPesertaDidikId: pdId,
								nik: str(row, 'nik') ?? null,
								anakKe: intOrNull(row['anak_keberapa'])
							})
							.returning({ id: tableMurid.id });
						if (inserted[0]) {
							index.byDapodik.set(pdId, {
								id: inserted[0].id,
								kelasId: placement.kelasId
							});
							created++;
						}
					});
				}
			} catch (rowError) {
				console.warn('[dapodik] gagal menyimpan peserta didik', nama, rowError);
				skipped++;
			}
		}

		sections.push({
			label: 'Peserta Didik',
			status: 'ok',
			detail: `${updated} murid dicocokkan, ${created} murid baru${
				tanpaKelas ? `, ${tanpaKelas} siswa dilewati (belum tergabung rombel di Dapodik)` : ''
			}${skipped - tanpaKelas > 0 ? `, ${skipped - tanpaKelas} baris gagal` : ''}.`
		});
	} catch (e) {
		sections.push({
			label: 'Peserta Didik',
			status: 'gagal',
			detail: (e as Error).message
		});
	}
	return index;
}

// ---------------------------------------------------------------------------
// Section: pembelajaran → mata pelajaran per kelas
// ---------------------------------------------------------------------------

/**
 * Ratakan daftar pembelajaran beserta `sub_mapel[]` nested (bentuk lama sebagian
 * build Dapodik). Sub-mapel (mis. varian agama dengan induk_pembelajaran_id)
 * di-upsert sama seperti mapel biasa agar ter-binding ke kode Dapodik.
 */
function flattenPembelajaran(items: Array<{ kelasId: number; row: Row }>) {
	const result: Array<{ kelasId: number; row: Row }> = [];
	for (const item of items) {
		result.push(item);
		const subs = Array.isArray(item.row['sub_mapel']) ? (item.row['sub_mapel'] as Row[]) : [];
		result.push(...flattenPembelajaran(subs.map((row) => ({ kelasId: item.kelasId, row }))));
	}
	return result;
}

/**
 * Upsert mata pelajaran dari pembelajaran NESTED yang dikumpulkan saat
 * upsert rombel (endpoint getPembelajaran tidak tersedia → HTTP 404).
 */
async function upsertPembelajaran(
	allItems: Array<{ kelasId: number; row: Row }>,
	validKelasIds: Set<number>,
	ptkIndex: PegawaiIndex,
	sections: DapodikSectionLog[]
) {
	if (allItems.length === 0) {
		sections.push({
			label: 'Pembelajaran',
			status: 'dilewati',
			detail: 'Tidak ada pembelajaran pada data rombongan belajar Dapodik.'
		});
		return;
	}
	try {
		const items = flattenPembelajaran(allItems);
		let created = 0;
		let updated = 0;
		let failed = 0;
		let incomplete = 0;
		let skipped = 0;

		for (const { kelasId, row } of items) {
			if (!validKelasIds.has(kelasId)) continue;

			const pembelajaranId = str(row, 'pembelajaran_id');
			const mapelRefId = str(row, 'mata_pelajaran_id');
			const namaMapel =
				str(row, 'nama_mata_pelajaran') ??
				str(row, 'mata_pelajaran_id_str') ??
				str(row, 'nama_mata_pelajaran_mapel') ??
				'';
			if (!pembelajaranId || !namaMapel) {
				incomplete++;
				continue;
			}

			try {
				// Cermin pembelajaran per rombel — sumber daftar nama mapel pada form
				// tambah (difilter per kelas), tanpa membuat baris mata_pelajaran.
				await db
					.insert(tableDapodikPembelajaran)
					.values({
						kelasId,
						pembelajaranId,
						mataPelajaranId: mapelRefId ?? null,
						nama: namaMapel
					})
					.onConflictDoUpdate({
						target: tableDapodikPembelajaran.pembelajaranId,
						set: {
							kelasId: sql`excluded.kelas_id`,
							mataPelajaranId: sql`excluded.mata_pelajaran_id`,
							nama: sql`excluded.nama`
						}
					});

				// ptk_id pengampu tersedia langsung di row pembelajaran.
				const pengampuId = ptkIndex.resolve(str(row, 'ptk_id'));

				const existing =
					(await db.query.tableMataPelajaran.findFirst({
						where: and(
							eq(tableMataPelajaran.kelasId, kelasId),
							eq(tableMataPelajaran.dapodikPembelajaranId, pembelajaranId)
						)
					})) ??
					(await db.query.tableMataPelajaran.findFirst({
						where: and(
							eq(tableMataPelajaran.kelasId, kelasId),
							eq(tableMataPelajaran.nama, namaMapel)
						)
					}));

				if (existing) {
					await db
						.update(tableMataPelajaran)
						.set({
							nama: namaMapel,
							dapodikPembelajaranId: pembelajaranId,
							dapodikMataPelajaranId: mapelRefId,
							...(pengampuId ? { pengampuId } : {})
						})
						.where(eq(tableMataPelajaran.id, existing.id));
					updated++;
				} else if (
					!namaMapel.toLowerCase().startsWith('pendidikan agama') &&
					!namaMapel.toLowerCase().startsWith('pendidikan kepercayaan')
				) {
					// Mapel hasil tarikan Dapodik TIDAK dibuat otomatis — admin menambahkannya
					// sendiri lewat "Tambah Mata Pelajaran" (nama dipilih dari referensi Dapodik).
					skipped++;
				} else {
					// Pengecualian Pendidikan Agama: langsung dibuat dan ter-binding ke kode PAPB.
					await db.insert(tableMataPelajaran).values({
						kelasId,
						nama: namaMapel,
						jenis: 'wajib',
						kode: 'PAPB',
						dapodikPembelajaranId: pembelajaranId,
						dapodikMataPelajaranId: mapelRefId,
						...(pengampuId ? { pengampuId } : {})
					});
					created++;
				}
			} catch (rowError) {
				// Satu row bermasalah tidak boleh membatalkan pembelajaran lain.
				console.warn(
					`[dapodik] gagal upsert pembelajaran ${pembelajaranId} (${namaMapel}):`,
					rowError instanceof Error ? rowError.message : rowError
				);
				failed++;
			}
		}

		sections.push({
			label: 'Pembelajaran',
			status: failed > 0 && created + updated === 0 ? 'gagal' : 'ok',
			detail: `${updated} mapel dicocokkan, ${created} mapel baru${
				skipped ? `, ${skipped} tidak dibuat otomatis (tambah manual)` : ''
			}${incomplete ? `, ${incomplete} dilewati (data tidak lengkap)` : ''}${
				failed ? `, ${failed} gagal` : ''
			}.`
		});
	} catch (e) {
		sections.push({
			label: 'Pembelajaran',
			status: 'gagal',
			detail: (e as Error).message
		});
	}
}

// ---------------------------------------------------------------------------
// Section: referensi mata pelajaran nasional
// ---------------------------------------------------------------------------

/**
 * Tarik seluruh referensi mata pelajaran Dapodik (getMataPelajaran) dan upsert ke
 * tabel lokal dapodik_mata_pelajaran. Primary key = ID referensi sehingga sinkron
 * berulang idempotent; hanya kolom data yang diperbarui (created_at dipertahankan).
 */
async function syncMapelReferensi(
	base: string,
	token: string,
	npsn: string | null,
	semesterId: string,
	sections: DapodikSectionLog[]
) {
	try {
		const call = await dapodikGet(base, token, 'getMataPelajaran', {
			npsn,
			semester_id: semesterId
		});
		if (!call.ok) throw new Error(call.error ?? `HTTP ${call.status}`);
		const rows = rowsOf(call.data).filter((r) => r['mata_pelajaran_id'] != null);
		const values = rows.map((r) => ({
			mataPelajaranId: Number(r['mata_pelajaran_id']),
			nama: str(r, 'nama') ?? '',
			jurusanId: str(r, 'jurusan_id') ?? null,
			pilihanSekolah: str(r, 'pilihan_sekolah') === '1',
			pilihanBuku: str(r, 'pilihan_buku') === '1',
			pilihanKepengawasan: str(r, 'pilihan_kepengawasan') === '1',
			pilihanEvaluasi: str(r, 'pilihan_evaluasi') === '1'
		}));

		// Chunk agar jumlah parameter per statement tetap aman.
		const CHUNK = 400;
		for (let i = 0; i < values.length; i += CHUNK) {
			await db
				.insert(tableDapodikMataPelajaran)
				.values(values.slice(i, i + CHUNK))
				.onConflictDoUpdate({
					target: tableDapodikMataPelajaran.mataPelajaranId,
					set: {
						nama: sql`excluded.nama`,
						jurusanId: sql`excluded.jurusan_id`,
						pilihanSekolah: sql`excluded.pilihan_sekolah`,
						pilihanBuku: sql`excluded.pilihan_buku`,
						pilihanKepengawasan: sql`excluded.pilihan_kepengawasan`,
						pilihanEvaluasi: sql`excluded.pilihan_evaluasi`
					}
				});
		}

		sections.push({
			label: 'Mapel Referensi',
			status: 'ok',
			detail: `${values.length} mata pelajaran referensi tersimpan lokal.`
		});
	} catch (e) {
		sections.push({
			label: 'Mapel Referensi',
			status: 'gagal',
			detail: (e as Error).message
		});
	}
}

// ---------------------------------------------------------------------------
// Section: ekstrakurikuler (best-effort)
// ---------------------------------------------------------------------------

async function syncEkskul(
	muridIndex: MuridIndex,
	rombelRows: Row[],
	sections: DapodikSectionLog[]
) {
	try {
		// Ekskul datang sebagai rombongan belajar jenis_rombel 51 dengan
		// anggota_rombel nested — endpoint getEkskul 404 pada build Dapodik desktop.
		const ekskulRombels = rombelRows.filter((row) => intOrNull(row['jenis_rombel']) === 51);
		if (ekskulRombels.length === 0) {
			sections.push({
				label: 'Ekstrakurikuler',
				status: 'dilewati',
				detail: 'Tidak ada data ekskul pada Dapodik.'
			});
			return;
		}

		let created = 0;
		let membersLinked = 0;
		let skipped = 0;

		for (const row of ekskulRombels) {
			const namaEkskul = str(row, 'nm_ekskul') ?? str(row, 'nama');
			if (!namaEkskul) {
				skipped++;
				continue;
			}

			// Kelompokkan anggota per kelas asal murid (ekskul di app ini milik kelas).
			const perKelas = new Map<number, number[]>();
			for (const member of rowsOf(row['anggota_rombel'])) {
				const pdId = str(member, 'peserta_didik_id');
				const murid = pdId ? muridIndex.byDapodik.get(pdId) : null;
				if (!murid?.kelasId) continue;
				const list = perKelas.get(murid.kelasId) ?? [];
				list.push(murid.id);
				perKelas.set(murid.kelasId, list);
			}

			for (const [kelasId, muridIds] of perKelas) {
				let ekskul = await db.query.tableEkstrakurikuler.findFirst({
					where: and(
						eq(tableEkstrakurikuler.kelasId, kelasId),
						eq(tableEkstrakurikuler.nama, namaEkskul)
					)
				});
				if (!ekskul) {
					const inserted = await db
						.insert(tableEkstrakurikuler)
						.values({ kelasId, nama: namaEkskul })
						.returning({ id: tableEkstrakurikuler.id });
					if (!inserted[0]) continue;
					ekskul = await db.query.tableEkstrakurikuler.findFirst({
						where: eq(tableEkstrakurikuler.id, inserted[0].id)
					});
					created++;
				}
				if (!ekskul) continue;
				for (const muridId of muridIds) {
					const exists = await db.query.tableMuridEkstrakurikuler.findFirst({
						where: and(
							eq(tableMuridEkstrakurikuler.muridId, muridId),
							eq(tableMuridEkstrakurikuler.ekstrakurikulerId, ekskul.id)
						)
					});
					if (exists) continue;
					await db
						.insert(tableMuridEkstrakurikuler)
						.values({ muridId, ekstrakurikulerId: ekskul.id });
					membersLinked++;
				}
			}
		}

		sections.push({
			label: 'Ekstrakurikuler',
			status: created + membersLinked > 0 || skipped === 0 ? 'ok' : 'dilewati',
			detail:
				`${created} ekskul baru, ${membersLinked} keanggotaan ditautkan.` +
				(skipped > 0 ? ` ${skipped} baris ekskul dilewati (nama tidak terbaca).` : '')
		});
	} catch (e) {
		sections.push({
			label: 'Ekstrakurikuler',
			status: 'dilewati',
			detail: `${(e as Error).message} — isi ekstrakurikuler secara manual.`
		});
	}
}
