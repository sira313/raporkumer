import db from '$lib/server/db';
import { resolveSekolahAcademicContext } from '$lib/server/db/academic';
import type { AcademicContext } from '$lib/server/db/academic';
import {
	tableAlamat,
	tableKelas,
	tableMurid,
	tableSekolah,
	tableSemester,
	tableTahunAjaran,
	tableWaliMurid
} from '$lib/server/db/schema';
import { cookieNames, unflattenFormData } from '$lib/utils';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { read, utils } from 'xlsx';

type TahunAjaranRow = typeof tableTahunAjaran.$inferSelect;
type SemesterRow = typeof tableSemester.$inferSelect;

type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

const DEFAULT_DATE = '1970-01-01';

function normalize(value: unknown): string {
 if (typeof value === 'string') return value.trim();
 if (typeof value === 'number') return String(value).trim();
 return '';
}

function ensureDate(value: unknown): string {
 if (value instanceof Date && !Number.isNaN(value.getTime())) {
	return value.toISOString().slice(0, 10);
 }
 const str = normalize(value);
 if (!str) return DEFAULT_DATE;
 if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
 const numeric = Number(str);
 if (!Number.isNaN(numeric) && numeric > 0) {
	const excelEpoch = new Date(Math.round((numeric - 25569) * 86400 * 1000));
	if (!Number.isNaN(excelEpoch.getTime())) return excelEpoch.toISOString().slice(0, 10);
 }
 const parsed = new Date(str);
 return Number.isNaN(parsed.getTime()) ? DEFAULT_DATE : parsed.toISOString().slice(0, 10);
}

function ensureJenisKelamin(value: unknown): 'L' | 'P' {
 const str = normalize(value).toUpperCase();
 return str === 'P' ? 'P' : 'L';
}

async function importKelasDanMuridFromExcel(
	file: File,
	opts: {
		sekolahId: number;
		tahunAjaranId: number;
		semesterId: number;
		kabupatenFallback?: string;
	}
) {
 if (!opts.tahunAjaranId || !opts.semesterId) {
 throw fail(400, { fail: 'Pilih tahun ajaran dan semester sebelum mengimpor data.' });
 }
 const buffer = await file.arrayBuffer();
 const workbook = read(buffer, { type: 'array' });
 const sheetName = workbook.SheetNames[0];
 const sheet = sheetName ? workbook.Sheets[sheetName] : undefined;
 if (!sheet) {
 throw fail(400, { fail: 'Sheet pertama pada file tidak ditemukan.' });
 }

 const rows = utils.sheet_to_json<(string | number)[]>(sheet, {
	header: 1,
	blankrows: false,
	defval: ''
 });

 const headerIndex = rows.findIndex((row) =>
	row.some((cell) => normalize(cell).toLowerCase() === 'nama') &&
	row.some((cell) => normalize(cell).toLowerCase() === 'nipd') &&
	row.some((cell) => normalize(cell).toLowerCase().startsWith('rombel'))
 );

 if (headerIndex === -1) {
 throw fail(400, { fail: 'Header kolom tidak ditemukan pada file.' });
 }

	const header = rows[headerIndex].map((cell) => normalize(cell));
	const canonicalize = (value: string) =>
		normalize(value)
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, ' ')
			.trim();
	const headerCanonical = header.map((cell) => canonicalize(cell));

	const findColumnIndex = (...labels: string[]) => {
		for (const label of labels) {
			const canonicalLabel = canonicalize(label);
			const idx = headerCanonical.findIndex((cell) => cell === canonicalLabel);
			if (idx !== -1) return idx;
		}
		for (const label of labels) {
			const canonicalLabel = canonicalize(label);
			const idx = headerCanonical.findIndex((cell) => cell.includes(canonicalLabel));
			if (idx !== -1) return idx;
		}
		return undefined;
	};

	const findColumnByPredicate = (
		predicate: (canonical: string, original: string, index: number) => boolean
	): number | undefined => {
		const idx = header.findIndex((cell, index) => predicate(headerCanonical[index], cell, index));
		return idx >= 0 ? idx : undefined;
	};

	const idxNama = findColumnIndex('Nama', 'Nama Peserta Didik', 'Nama Siswa');
	const idxNipd = findColumnIndex('NIPD', 'NIS', 'Nomor Induk', 'No Induk');
	const idxRombel = findColumnByPredicate((canonical) => canonical.startsWith('rombel'));
	if (idxNama === undefined || idxNipd === undefined || idxRombel === undefined) {
		throw fail(400, { fail: 'Kolom Nama, NIPD/NIS, atau Rombel tidak lengkap.' });
	}

	const idxNisn = findColumnIndex('NISN');
	const idxTempatLahir = findColumnIndex('Tempat Lahir', 'Tempat Lahir Peserta Didik');
	const idxTanggalLahir = findColumnIndex('Tanggal Lahir', 'Tanggal Lahir Peserta Didik');
	const idxJk = findColumnIndex('JK', 'Jenis Kelamin');
	const idxAgama = findColumnIndex('Agama');
	const idxAlamat = findColumnIndex('Alamat', 'Alamat Jalan', 'Alamat Peserta Didik');
	const idxKelurahan = findColumnIndex('Kelurahan', 'Kelurahan/Desa', 'Kelurahan / Desa', 'Desa');
	const idxKecamatan = findColumnIndex('Kecamatan');
	const idxKabupaten = findColumnIndex('Kabupaten', 'Kabupaten/Kota', 'Kabupaten / Kota');
	const idxKodePos = findColumnIndex('Kode Pos');
	const idxSekolahAsal = findColumnIndex('Sekolah Asal', 'Sekolah Asal Siswa');
	const idxTelepon = findColumnIndex('Telepon', 'No Telepon', 'No. Telepon', 'Telepon Rumah');
	const idxHp = findColumnIndex('HP', 'No HP', 'No. HP', 'Nomor HP', 'Nomor Hp', 'HP Siswa');
	const idxEmail = findColumnIndex('E-Mail', 'Email', 'Surel');
	const idxKontakOrangTua = findColumnIndex(
		'Kontak',
		'Kontak Orang Tua',
		'Kontak Ortu',
		'Nomor Kontak Orang Tua',
		'No HP Orang Tua',
		'No Hp Orang Tua',
		'No Hp Ortu',
		'No Telepon Orang Tua',
		'No Telpon Orang Tua',
		'No Telepon Ortu',
		'Telepon Orang Tua',
		'HP Orang Tua',
		'HP Ortu'
	);

	const idxAyahNama = findColumnIndex('Nama Ayah', 'Nama Ayah Kandung');
	const idxAyahJob = findColumnIndex('Pekerjaan Ayah', 'Pekerjaan Ayah Kandung');
	const idxAyahKontak = findColumnIndex('Kontak Ayah', 'No HP Ayah', 'No Hp Ayah', 'Telepon Ayah');
	const idxAyahBase = findColumnIndex('Data Ayah');

	const idxIbuNama = findColumnIndex('Nama Ibu', 'Nama Ibu Kandung');
	const idxIbuJob = findColumnIndex('Pekerjaan Ibu', 'Pekerjaan Ibu Kandung');
	const idxIbuKontak = findColumnIndex('Kontak Ibu', 'No HP Ibu', 'No Hp Ibu', 'Telepon Ibu');
	const idxIbuBase = findColumnIndex('Data Ibu');

	const idxWaliNama = findColumnIndex('Nama Wali', 'Nama Wali Murid');
	const idxWaliJob = findColumnIndex('Pekerjaan Wali', 'Pekerjaan Wali Murid');
	const idxWaliKontak = findColumnIndex('Kontak Wali', 'No HP Wali', 'No Hp Wali', 'Telepon Wali');
	const idxWaliBase = findColumnIndex('Data Wali');

	const ayahNameIdx = idxAyahNama ?? (idxAyahBase !== undefined && idxAyahBase >= 0 ? idxAyahBase : undefined);
	const ayahJobIdx =
		idxAyahJob ?? (idxAyahBase !== undefined && idxAyahBase >= 0 ? idxAyahBase + 3 : undefined);
	const ibuNameIdx = idxIbuNama ?? (idxIbuBase !== undefined && idxIbuBase >= 0 ? idxIbuBase : undefined);
	const ibuJobIdx =
		idxIbuJob ?? (idxIbuBase !== undefined && idxIbuBase >= 0 ? idxIbuBase + 3 : undefined);
	const waliNameIdx = idxWaliNama ?? (idxWaliBase !== undefined && idxWaliBase >= 0 ? idxWaliBase : undefined);
	const waliJobIdx =
		idxWaliJob ?? (idxWaliBase !== undefined && idxWaliBase >= 0 ? idxWaliBase + 3 : undefined);

 const dataRows = rows
	.slice(headerIndex + 1)
	.filter((row) => idxNama !== undefined && normalize(row[idxNama]) !== '');

 const timestamp = new Date().toISOString();
 const rombelMap = new Map<string, string>();

 type WaliPayload = {
	 nama: string;
	 pekerjaan: string;
	 kontak?: string | null;
	 alamat?: string | null;
 };

 type StudentPayload = {
	 nama: string;
	 nis: string;
	 rombel: string;
	 nisn: string;
	 tempatLahir: string;
	 tanggalLahir: string;
	 jk: 'L' | 'P';
	 agama: string;
	 alamat: string;
	 desa: string;
	 kecamatan: string;
	 kabupaten: string;
	 kodePos?: string;
	 pendidikanSebelumnya: string;
	 tanggalMasuk: string;
	 ayah: WaliPayload | null;
	 ibu: WaliPayload | null;
	 wali: WaliPayload | null;
 };

	const chooseKontak = (row: (string | number)[]): string => {
		const kontakOrtu =
			idxKontakOrangTua !== undefined ? normalize(row[idxKontakOrangTua]) : '';
		if (kontakOrtu) return kontakOrtu;
		const kontakAyah = idxAyahKontak !== undefined ? normalize(row[idxAyahKontak]) : '';
		if (kontakAyah) return kontakAyah;
		const kontakIbu = idxIbuKontak !== undefined ? normalize(row[idxIbuKontak]) : '';
		if (kontakIbu) return kontakIbu;
		const kontakWali = idxWaliKontak !== undefined ? normalize(row[idxWaliKontak]) : '';
		if (kontakWali) return kontakWali;
		const hp = idxHp !== undefined ? normalize(row[idxHp]) : '';
		if (hp) return hp;
		const telp = idxTelepon !== undefined ? normalize(row[idxTelepon]) : '';
		if (telp) return telp;
		const email = idxEmail !== undefined ? normalize(row[idxEmail]) : '';
		return email;
	};

 const buildWaliPayload = (
	 row: (string | number)[],
	 nameIdx?: number,
	 jobIdx?: number,
	 kontak?: string,
	 alamatLengkap?: string
 ): WaliPayload | null => {
	 if (nameIdx === undefined) return null;
	 const nama = normalize(row[nameIdx]);
	 if (!nama) return null;
	 const pekerjaan = jobIdx !== undefined ? normalize(row[jobIdx]) : '';
	 return {
		 nama,
		 pekerjaan: pekerjaan || 'Belum diisi',
		 kontak: kontak || null,
		 alamat: alamatLengkap || null
	 };
 };

 const students = dataRows
	.map((row) => {
	 const nama = normalize(row[idxNama]).trim();
	 const nis = normalize(row[idxNipd]).replace(/\.0$/, '').trim();
	 const rombel = normalize(row[idxRombel]).trim();
	 if (!nama || !nis || !rombel) return null;
	 rombelMap.set(rombel.toLowerCase(), rombel);

	 const alamat = normalize(idxAlamat !== undefined ? row[idxAlamat] : '') || 'Belum diisi';
	 const desa = normalize(idxKelurahan !== undefined ? row[idxKelurahan] : '') || 'Belum diisi';
	 const kecamatan = normalize(idxKecamatan !== undefined ? row[idxKecamatan] : '') || 'Belum diisi';
	 const kabupaten =
		 normalize(idxKabupaten !== undefined ? row[idxKabupaten] : '') ||
		 opts.kabupatenFallback ||
		 'Belum diisi';
	 const alamatLengkap = [alamat, desa, kecamatan, kabupaten]
		.filter((value) => !!value && value !== 'Belum diisi')
		.join(', ');
	 const alamatUntukWali = alamatLengkap || (alamat !== 'Belum diisi' ? alamat : null);
	 const kontakOrangTua = chooseKontak(row);
	 const kontakAyah = idxAyahKontak !== undefined ? normalize(row[idxAyahKontak]) : '';
	 const kontakIbu = idxIbuKontak !== undefined ? normalize(row[idxIbuKontak]) : '';
	 const kontakWali = idxWaliKontak !== undefined ? normalize(row[idxWaliKontak]) : '';

	 return {
		 nama,
		 nis,
		 rombel,
		 nisn: normalize(idxNisn !== undefined ? row[idxNisn] : '').trim() || `BELUM-${nis}`,
		 tempatLahir: normalize(idxTempatLahir !== undefined ? row[idxTempatLahir] : '') || 'Tidak diketahui',
		 tanggalLahir: ensureDate(idxTanggalLahir !== undefined ? row[idxTanggalLahir] : DEFAULT_DATE),
		 jk: ensureJenisKelamin(idxJk !== undefined ? row[idxJk] : 'L'),
		 agama: normalize(idxAgama !== undefined ? row[idxAgama] : '') || 'Belum diisi',
		 alamat,
		 desa,
		 kecamatan,
		 kabupaten,
		 kodePos: normalize(idxKodePos !== undefined ? row[idxKodePos] : '') || undefined,
		 pendidikanSebelumnya:
			 normalize(idxSekolahAsal !== undefined ? row[idxSekolahAsal] : '') || 'Belum diisi',
		 tanggalMasuk: timestamp.slice(0, 10),
		 ayah: buildWaliPayload(
			row,
			ayahNameIdx,
			ayahJobIdx,
			kontakAyah || kontakOrangTua,
			alamatUntukWali ?? undefined
		 ),
		 ibu: buildWaliPayload(
			row,
			ibuNameIdx,
			ibuJobIdx,
			kontakIbu || kontakOrangTua,
			alamatUntukWali ?? undefined
		 ),
		 wali: buildWaliPayload(
			row,
			waliNameIdx,
			waliJobIdx,
			kontakWali || kontakOrangTua,
			alamatUntukWali ?? undefined
		 )
	 } satisfies StudentPayload;
	})
	.filter(Boolean) as StudentPayload[];

const upsertWali = async (
	 tx: TransactionClient,
	 existingId: number | null | undefined,
	 payload: WaliPayload | null
 ): Promise<number | null> => {
	 if (!payload || !payload.nama) {
		 return existingId ?? null;
	 }

	 const values = {
		 nama: payload.nama,
		 pekerjaan: payload.pekerjaan || 'Belum diisi',
		 kontak: payload.kontak && payload.kontak.length ? payload.kontak : null,
		 alamat: payload.alamat && payload.alamat.length ? payload.alamat : null,
		 updatedAt: timestamp
	 };

	 if (existingId) {
		 await tx
			 .update(tableWaliMurid)
			 .set(values)
			 .where(eq(tableWaliMurid.id, existingId));
		 return existingId;
	 }

	 const [inserted] = await tx
		 .insert(tableWaliMurid)
		 .values(values)
		 .returning({ id: tableWaliMurid.id });

	 return inserted?.id ?? null;
 };

 if (!students.length) {
 throw fail(400, { fail: 'Tidak ada baris data valid pada file.' });
 }

 const rombelNames = Array.from(rombelMap.values());

 let insertedKelas = 0;
 let insertedMurid = 0;
 let updatedMurid = 0;

 await db.transaction(async (tx) => {
	const existingKelas = rombelNames.length
	 ? await tx.query.tableKelas.findMany({
		 where: and(
			eq(tableKelas.sekolahId, opts.sekolahId),
			eq(tableKelas.tahunAjaranId, opts.tahunAjaranId),
			eq(tableKelas.semesterId, opts.semesterId),
			inArray(tableKelas.nama, rombelNames)
		 )
		})
	 : [];

	const kelasMap = new Map<string, number>();
	for (const item of existingKelas) {
		if (item.tahunAjaranId !== opts.tahunAjaranId || item.semesterId !== opts.semesterId) {
			await tx
				.update(tableKelas)
				.set({
					tahunAjaranId: opts.tahunAjaranId,
					semesterId: opts.semesterId,
					updatedAt: timestamp
				})
				.where(eq(tableKelas.id, item.id));
		}
		kelasMap.set(item.nama.toLowerCase(), item.id);
	}

	const newKelasValues = rombelNames
	 .filter((nama) => !kelasMap.has(nama.toLowerCase()))
	 .map((nama) => ({
		nama,
		sekolahId: opts.sekolahId,
		tahunAjaranId: opts.tahunAjaranId,
		semesterId: opts.semesterId,
		updatedAt: timestamp
	 }));
	if (newKelasValues.length) {
	 const inserted = await tx
		.insert(tableKelas)
		.values(newKelasValues)
		.returning({ id: tableKelas.id, nama: tableKelas.nama });
	 inserted.forEach((item) => kelasMap.set(item.nama.toLowerCase(), item.id));
	 insertedKelas += inserted.length;
	}

	const nisList = students.map((s) => s.nis);
	const existingMurid = nisList.length
	 ? await tx.query.tableMurid.findMany({
		 where: and(eq(tableMurid.sekolahId, opts.sekolahId), inArray(tableMurid.nis, nisList))
		})
	 : [];
	const muridByNis = new Map(existingMurid.map((item) => [item.nis, item]));

	for (const student of students) {
	 const kelasId = kelasMap.get(student.rombel.toLowerCase());
	 if (!kelasId) continue;

	 const existing = muridByNis.get(student.nis);
	 if (existing) {
	 const ayahId = await upsertWali(tx, existing.ayahId, student.ayah);
	 const ibuId = await upsertWali(tx, existing.ibuId, student.ibu);
	 const waliId = await upsertWali(tx, existing.waliId, student.wali);
		await tx
		 .update(tableMurid)
		 .set({
			nama: student.nama,
			nisn: student.nisn,
			tempatLahir: student.tempatLahir,
			tanggalLahir: student.tanggalLahir,
			jenisKelamin: student.jk,
			agama: student.agama,
			pendidikanSebelumnya: student.pendidikanSebelumnya,
			tanggalMasuk: student.tanggalMasuk,
			ayahId,
			ibuId,
			waliId,
			kelasId,
			updatedAt: timestamp
		 })
		 .where(eq(tableMurid.id, existing.id));
		updatedMurid += 1;
		continue;
	 }

	 const [alamat] = await tx
		.insert(tableAlamat)
		.values({
		 jalan: student.alamat,
		 desa: student.desa,
		 kecamatan: student.kecamatan,
		 kabupaten: student.kabupaten,
		 kodePos: student.kodePos,
		 updatedAt: timestamp
		})
		.returning({ id: tableAlamat.id });

	 const ayahId = await upsertWali(tx, null, student.ayah);
	 const ibuId = await upsertWali(tx, null, student.ibu);
	 const waliId = await upsertWali(tx, null, student.wali);

	 await tx.insert(tableMurid).values({
		sekolahId: opts.sekolahId,
		kelasId,
		nama: student.nama,
		nis: student.nis,
		nisn: student.nisn,
		tempatLahir: student.tempatLahir,
		tanggalLahir: student.tanggalLahir,
		jenisKelamin: student.jk,
		agama: student.agama,
		pendidikanSebelumnya: student.pendidikanSebelumnya,
		tanggalMasuk: student.tanggalMasuk,
		alamatId: alamat.id,
		ayahId,
		ibuId,
		waliId,
		updatedAt: timestamp
	 });
	 insertedMurid += 1;
	}
 });

 return {
	message: `Impor selesai: ${insertedKelas} kelas baru, ${insertedMurid} murid baru, ${updatedMurid} murid diperbarui.`
 } as const;
}

export const load: PageServerLoad = async ({ locals }) => {
	const meta: PageMeta = {
		title: 'Data Rapor',
		description: 'Kelola sekolah aktif, tahun ajaran, semester, dan tanggal bagi rapor.'
	};

	const sekolahList = await db.query.tableSekolah.findMany({
		columns: { logo: false },
		orderBy: [desc(tableSekolah.id)]
	});

	const activeSekolahId = locals.sekolah?.id ?? null;
	let tahunAjaranList: Array<TahunAjaranRow & { semester: SemesterRow[] }> = [];
	let activeTahunAjaranId: number | null = null;
	let activeSemesterId: number | null = null;
	let tanggalBagiRaport: AcademicContext['tanggalBagiRaport'] = {};

	if (activeSekolahId) {
		({ tahunAjaranList, activeTahunAjaranId, activeSemesterId, tanggalBagiRaport } =
			await resolveSekolahAcademicContext(activeSekolahId));
	}

	return {
		meta,
		sekolahList,
		activeSekolahId,
		tahunAjaranList,
		activeTahunAjaranId,
		activeSemesterId,
		tanggalBagiRaport
	};
};

export const actions: Actions = {
	switch: async ({ request, cookies, locals }) => {
		const formData = await request.formData();
		const sekolahIdRaw = formData.get('sekolahId');

		const sekolahId = Number(sekolahIdRaw);
		if (!sekolahIdRaw || Number.isNaN(sekolahId)) {
			error(400, 'Identitas sekolah tidak valid');
		}

		const sekolah = await db.query.tableSekolah.findFirst({
			columns: { id: true },
			where: eq(tableSekolah.id, sekolahId)
		});

		if (!sekolah) {
			error(404, 'Data sekolah tidak ditemukan');
		}

		cookies.set(cookieNames.ACTIVE_SEKOLAH_ID, String(sekolah.id), { path: '/' });
		locals.sekolahDirty = true;

		const context = await resolveSekolahAcademicContext(sekolah.id);

		return {
			message: 'Sekolah aktif diperbarui',
			activeSekolahId: sekolah.id,
			...context
		};
	},
	save: async ({ request, locals }) => {
		const sekolahId = locals.sekolah?.id;
		if (!sekolahId) {
			return fail(400, { fail: 'Pilih sekolah terlebih dahulu' });
		}

		const formData = await request.formData();
		const tahunAjaranIdRaw = formData.get('tahunAjaranId');
		const semesterIdRaw = formData.get('semesterId');
		const tahunAjaranCandidate = Number(tahunAjaranIdRaw);
		const semesterCandidate = Number(semesterIdRaw);
		const hasSemester = Number.isFinite(semesterCandidate) && semesterCandidate > 0;
		const hasTahunAjaran = Number.isFinite(tahunAjaranCandidate) && tahunAjaranCandidate > 0;

		let resolvedTahunAjaranId: number | null = hasTahunAjaran ? tahunAjaranCandidate : null;
		const resolvedSemesterId: number | null = hasSemester ? semesterCandidate : null;

		let semesterRecord:
			| (typeof tableSemester.$inferSelect & { tahunAjaran: TahunAjaranRow })
			| null = null;
		let tahunAjaranRecord:
			| (typeof tableTahunAjaran.$inferSelect & { semester: SemesterRow[] })
			| null = null;

		if (resolvedSemesterId) {
			const semesterRow = await db.query.tableSemester.findFirst({
				where: eq(tableSemester.id, resolvedSemesterId),
				with: { tahunAjaran: true }
			});

			if (!semesterRow || semesterRow.tahunAjaran.sekolahId !== sekolahId) {
				return fail(404, { fail: 'Data semester tidak ditemukan.' });
			}

			if (hasTahunAjaran && semesterRow.tahunAjaranId !== tahunAjaranCandidate) {
				return fail(400, { fail: 'Semester tidak sesuai dengan tahun ajaran yang dipilih.' });
			}

			resolvedTahunAjaranId = semesterRow.tahunAjaranId;
			semesterRecord = semesterRow;
		} else if (resolvedTahunAjaranId) {
			const tahunAjaranRow = await db.query.tableTahunAjaran.findFirst({
				where: and(
					eq(tableTahunAjaran.id, resolvedTahunAjaranId),
					eq(tableTahunAjaran.sekolahId, sekolahId)
				),
				with: { semester: true }
			});

			if (!tahunAjaranRow) {
				return fail(404, { fail: 'Data tahun ajaran tidak ditemukan.' });
			}
			tahunAjaranRecord = tahunAjaranRow;
		}

		let importMessage: string | null = null;
		const fileField = (formData.get('data') ?? formData.get('file')) as File | null;
		if (fileField instanceof File && fileField.size > 0) {
			if (!resolvedTahunAjaranId || !resolvedSemesterId) {
				return fail(400, { fail: 'Pilih tahun ajaran dan semester sebelum mengimpor data.' });
			}

			const { message } = await importKelasDanMuridFromExcel(fileField, {
				sekolahId,
				tahunAjaranId: resolvedTahunAjaranId,
				semesterId: resolvedSemesterId,
				kabupatenFallback: locals.sekolah?.alamat?.kabupaten ?? undefined
			});
			importMessage = message;
		}

		if (semesterRecord) {
			const semesterRow = semesterRecord;
			await db.transaction(async (tx) => {
				await tx
					.update(tableTahunAjaran)
					.set({ isAktif: false })
					.where(eq(tableTahunAjaran.sekolahId, sekolahId));
				await tx
					.update(tableTahunAjaran)
					.set({ isAktif: true })
					.where(eq(tableTahunAjaran.id, semesterRow.tahunAjaranId));
				await tx
					.update(tableSemester)
					.set({ isAktif: false })
					.where(eq(tableSemester.tahunAjaranId, semesterRow.tahunAjaranId));
				await tx
					.update(tableSemester)
					.set({ isAktif: true })
					.where(eq(tableSemester.id, semesterRow.id));
			});
		} else if (tahunAjaranRecord) {
			const tahunRow = tahunAjaranRecord;
			await db.transaction(async (tx) => {
				await tx
					.update(tableTahunAjaran)
					.set({ isAktif: false })
					.where(eq(tableTahunAjaran.sekolahId, sekolahId));
				await tx
					.update(tableTahunAjaran)
					.set({ isAktif: true })
					.where(eq(tableTahunAjaran.id, tahunRow.id));

				if (!tahunRow.semester.some((item) => item.isAktif)) {
					const ganjil = tahunRow.semester.find((item) => item.tipe === 'ganjil');
					if (ganjil) {
						await tx
							.update(tableSemester)
							.set({ isAktif: true })
							.where(eq(tableSemester.id, ganjil.id));
					}
				}
			});
		}

		const form = unflattenFormData<{
			ganjil?: { id?: string; tanggalBagiRaport?: string };
			genap?: { id?: string; tanggalBagiRaport?: string };
		}>(formData);

		const ids = [form.ganjil?.id, form.genap?.id]
			.map((value) => Number(value))
			.filter((value) => Number.isFinite(value) && value > 0) as number[];

		if (ids.length) {
			const semesterList = await db.query.tableSemester.findMany({
				where: inArray(tableSemester.id, ids),
				with: { tahunAjaran: true }
			});

			for (const semester of semesterList) {
				if (semester.tahunAjaran.sekolahId !== sekolahId) {
					return fail(403, { fail: 'Semester tidak sesuai dengan sekolah aktif' });
				}
			}

			await db.transaction(async (tx) => {
				for (const semester of semesterList) {
					const tipe = semester.tipe as 'ganjil' | 'genap';
					const tanggal = form[tipe]?.tanggalBagiRaport?.trim() || null;
					await tx
						.update(tableSemester)
						.set({ tanggalBagiRaport: tanggal })
						.where(eq(tableSemester.id, semester.id));
				}
			});
		}

		const context = await resolveSekolahAcademicContext(sekolahId);

		return {
			message: importMessage ? `Pengaturan tersimpan. ${importMessage}` : 'Pengaturan tersimpan',
			activeSekolahId: sekolahId,
			...context
		};
	},
	'set-tahun-ajaran': async ({ request, locals }) => {
		const sekolahId = locals.sekolah?.id;
		if (!sekolahId) {
			return fail(400, { fail: 'Pilih sekolah terlebih dahulu' });
		}

		const formData = await request.formData();
		const tahunAjaranId = Number(formData.get('tahunAjaranId'));
		if (!tahunAjaranId) {
			return fail(400, { fail: 'Tahun ajaran tidak valid' });
		}

		const tahunAjaran = await db.query.tableTahunAjaran.findFirst({
			where: and(eq(tableTahunAjaran.id, tahunAjaranId), eq(tableTahunAjaran.sekolahId, sekolahId)),
			with: { semester: true }
		});

		if (!tahunAjaran) {
			return fail(404, { fail: 'Data tahun ajaran tidak ditemukan' });
		}

		await db.transaction(async (tx) => {
			await tx
				.update(tableTahunAjaran)
				.set({ isAktif: false })
				.where(eq(tableTahunAjaran.sekolahId, sekolahId));
			await tx
				.update(tableTahunAjaran)
				.set({ isAktif: true })
				.where(eq(tableTahunAjaran.id, tahunAjaranId));

			if (!tahunAjaran.semester.some((item) => item.isAktif)) {
				const ganjil = tahunAjaran.semester.find((item) => item.tipe === 'ganjil');
				if (ganjil) {
					await tx
						.update(tableSemester)
						.set({ isAktif: true })
						.where(eq(tableSemester.id, ganjil.id));
				}
			}
		});

		return { message: 'Tahun ajaran aktif diperbarui' };
	},
	'set-semester': async ({ request, locals }) => {
		const sekolahId = locals.sekolah?.id;
		if (!sekolahId) {
			return fail(400, { fail: 'Pilih sekolah terlebih dahulu' });
		}

		const formData = await request.formData();
		const semesterId = Number(formData.get('semesterId'));
		if (!semesterId) {
			return fail(400, { fail: 'Semester tidak valid' });
		}

		const semester = await db.query.tableSemester.findFirst({
			where: eq(tableSemester.id, semesterId),
			with: {
				tahunAjaran: true
			}
		});

		if (!semester || semester.tahunAjaran.sekolahId !== sekolahId) {
			return fail(404, { fail: 'Data semester tidak ditemukan' });
		}

		await db.transaction(async (tx) => {
			await tx
				.update(tableTahunAjaran)
				.set({ isAktif: false })
				.where(eq(tableTahunAjaran.sekolahId, sekolahId));
			await tx
				.update(tableTahunAjaran)
				.set({ isAktif: true })
				.where(eq(tableTahunAjaran.id, semester.tahunAjaranId));
			await tx
				.update(tableSemester)
				.set({ isAktif: false })
				.where(eq(tableSemester.tahunAjaranId, semester.tahunAjaranId));
			await tx.update(tableSemester).set({ isAktif: true }).where(eq(tableSemester.id, semesterId));
		});

		return { message: 'Semester aktif diperbarui' };
	},
	'update-rapor': async ({ request, locals }) => {
		const sekolahId = locals.sekolah?.id;
		if (!sekolahId) {
			return fail(400, { fail: 'Pilih sekolah terlebih dahulu' });
		}

		const formData = await request.formData();
		const form = unflattenFormData<{
			ganjil?: { id?: string; tanggalBagiRaport?: string };
			genap?: { id?: string; tanggalBagiRaport?: string };
		}>(formData);

		const ids = [form.ganjil?.id, form.genap?.id]
			.map((value) => Number(value))
			.filter((value) => Number.isFinite(value)) as number[];

		if (!ids.length) {
			return fail(400, { fail: 'Tidak ada semester yang diperbarui' });
		}

		const semesterList = await db.query.tableSemester.findMany({
			where: inArray(tableSemester.id, ids),
			with: { tahunAjaran: true }
		});

		for (const semester of semesterList) {
			if (semester.tahunAjaran.sekolahId !== sekolahId) {
				return fail(403, { fail: 'Semester tidak sesuai dengan sekolah aktif' });
			}
		}

		await db.transaction(async (tx) => {
			for (const semester of semesterList) {
				const tipe = semester.tipe as 'ganjil' | 'genap';
				const tanggal = form[tipe]?.tanggalBagiRaport?.trim() || null;
				await tx
					.update(tableSemester)
					.set({ tanggalBagiRaport: tanggal })
					.where(eq(tableSemester.id, semester.id));
			}
		});

		return { message: 'Tanggal bagi rapor diperbarui' };
	}
};
