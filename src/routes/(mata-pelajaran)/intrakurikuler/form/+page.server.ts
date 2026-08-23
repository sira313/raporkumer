import db from '$lib/server/db/index.js';
import { normMapelName, resolveReferensiMapelId } from '$lib/server/dapodik';
import {
	tableDapodikMataPelajaran,
	tableDapodikPembelajaran,
	tableKelas,
	tableMataPelajaran
} from '$lib/server/db/schema';
import { cookieNames, unflattenFormData } from '$lib/utils';
import { fail } from '@sveltejs/kit';
import { and, eq, isNull } from 'drizzle-orm';

// Dapodik tidak punya katalog mapel per tingkat (getPembelajaran 404; row
// pembelajaran rombel hanya mapel yang diinput operator — di SD umumnya cuma
// Guru Kelas + PJOK karena mapel lain diajar wali kelas). Untuk jenjang
// dasar/menengah, daftar pilihan = pembelajaran rombel DIGABUNG subset
// referensi nasional ber-nama umum. Jenjang lanjutan (SMA/SMK/MA/PKBM) =
// mirror rombel saja agar tidak "unlock" mapel umum yang tidak relevan.
const RE_MAPEL_UMUM_DASAR =
	/^(guru kelas sd|pendidikan agama|pendidikan kepercayaan|pendidikan pancasila|pendidikan kewarganegaraan|bahasa indonesia|bahasa inggris|matematika|ilmu pengetahuan alam|ilmu pengetahuan sosial|ipas|seni budaya|seni rupa|sbdp|prakarya|pendidikan jasmani|pjok|muatan lokal|mulok|bahasa daerah|informatika|koding|pembelajaran berbasis proje[ky])/;
const RE_NOISE = /(tingkat lanjut|peminatan|maritim|perikanan|bimp)/i;

function grupJenjangDasarMenengah(sekolah: App.Locals['sekolah']): boolean {
	const jenjang = (sekolah?.jenjangPendidikan ?? '').toLowerCase();
	const variant = (sekolah?.jenjangVariant ?? '').toLowerCase();
	return ['sd', 'slb', 'smp'].includes(jenjang) || ['mi', 'mts', 'slb-dasar'].includes(variant);
}

export type OpsiMapelDapodik = { nama: string; kode: string | null };

export async function load({ parent, locals }) {
	const { kelasAktif } = await parent();
	let dapodikMapelList: OpsiMapelDapodik[] = [];
	let indukList: Array<{ nama: string; pembelajaranId: string }> = [];
	if (kelasAktif?.id) {
		const referensiPromise = grupJenjangDasarMenengah(locals.sekolah)
			? db
					.select({
						nama: tableDapodikMataPelajaran.nama,
						kode: tableDapodikMataPelajaran.mataPelajaranId
					})
					.from(tableDapodikMataPelajaran)
					.where(isNull(tableDapodikMataPelajaran.jurusanId))
			: Promise.resolve<Array<{ nama: string; kode: number }>>([]);
		const [pembelajaranRows, referensiRows] = await Promise.all([
			db
				.selectDistinct({
					nama: tableDapodikPembelajaran.nama,
					kode: tableDapodikPembelajaran.mataPelajaranId
				})
				.from(tableDapodikPembelajaran)
				.where(eq(tableDapodikPembelajaran.kelasId, kelasAktif.id)),
			referensiPromise
		]);
		// Kandidat pembelajaran induk (untuk Sub Pembelajaran): pembelajaran rombel
		// yang terdaftar di Dapodik — opsi select "Mata Pelajaran Induk".
		indukList = await db
			.select({
				nama: tableDapodikPembelajaran.nama,
				pembelajaranId: tableDapodikPembelajaran.pembelajaranId
			})
			.from(tableDapodikPembelajaran)
			.where(eq(tableDapodikPembelajaran.kelasId, kelasAktif.id));
		// Kunci gabungan nama+kode: nama sama dengan kode referensi berbeda
		// tetap tampil sebagai opsi terpisah.
		const opsiMap = new Map<string, OpsiMapelDapodik>();
		for (const row of pembelajaranRows) {
			opsiMap.set(`${row.nama}|${row.kode ?? ''}`, {
				nama: row.nama,
				kode: row.kode ?? null
			});
		}
		for (const row of referensiRows ?? []) {
			const nama = row.nama.trim();
			if (!nama || RE_NOISE.test(nama)) continue;
			if (!RE_MAPEL_UMUM_DASAR.test(nama.toLowerCase())) continue;
			const kode = String(row.kode);
			opsiMap.set(`${nama}|${kode}`, { nama, kode });
		}
		dapodikMapelList = [...opsiMap.values()].sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
	}
	return {
		meta: { title: `Form Mata Pelajaran` },
		kelasAktif,
		dapodikMapelList,
		indukList: indukList.sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
	};
}

export const actions = {
	async add({ request, cookies, locals }) {
		const formMapel = unflattenFormData<{
			nama?: string;
			jenis?: string;
			kkm?: string;
			kode?: string;
			induk_pembelajaran_id?: string;
		}>(await request.formData());

		const kelasIdCookie = cookies.get(cookieNames.ACTIVE_KELAS_ID);
		if (!kelasIdCookie) {
			return fail(400, { fail: 'Pilih kelas aktif terlebih dahulu di navbar.' });
		}

		const kelasId = Number(kelasIdCookie);
		if (!Number.isInteger(kelasId)) {
			return fail(400, { fail: 'Kelas aktif tidak valid.' });
		}

		const sekolahId = locals.sekolah?.id;
		if (!sekolahId) {
			return fail(400, { fail: 'Pilih sekolah aktif terlebih dahulu.' });
		}

		const kelasAktif = await db.query.tableKelas.findFirst({
			columns: { id: true },
			where: and(eq(tableKelas.id, kelasId), eq(tableKelas.sekolahId, sekolahId))
		});
		if (!kelasAktif) {
			return fail(400, { fail: 'Kelas aktif tidak ditemukan.' });
		}

		const nama = formMapel.nama?.trim();
		const jenis = formMapel.jenis?.toLowerCase() as MataPelajaran['jenis'] | undefined;
		const kkmValue = formMapel.kkm ? Number(formMapel.kkm) : Number.NaN;
		const kode = formMapel.kode?.toString().trim() ?? '';

		if (!nama || !jenis || Number.isNaN(kkmValue)) {
			return fail(400, { fail: 'Harap lengkapi data mata pelajaran.' });
		}

		if (
			!['belum_dipetakan', 'wajib', 'pilihan', 'mulok', 'kejuruan', 'pemberdayaan'].includes(jenis)
		) {
			return fail(400, { fail: 'Jenis mata pelajaran tidak valid.' });
		}

		const kkm = Math.max(0, Math.round(kkmValue));

		// Mapel agama (semua varian, termasuk versi Dapodik tanpa "Budi Pekerti") dibuat
		// otomatis oleh ensureAgamaMapelForClasses — larang tambah manual.
		if (/^pendidikan (agama|kepercayaan)/i.test(nama)) {
			return fail(400, {
				fail: 'Tidak dapat menambahkan mapel agama karena PAPB dan sub mapel sudah ada di tabel'
			});
		}

		// Validasi duplikat: cek apakah sudah ada mapel dengan nama sama di kelas ini
		const existing = await db.query.tableMataPelajaran.findFirst({
			where: and(eq(tableMataPelajaran.kelasId, kelasId), eq(tableMataPelajaran.nama, nama))
		});

		if (existing) {
			return fail(400, {
				fail: `Mata pelajaran "${nama}" sudah ada di kelas ini. Tidak boleh duplikat.`
			});
		}

		// Opsi bind-at-create: bila nama terdaftar sebagai pembelajaran rombel
		// Dapodik (mirror hasil sinkronisasi), simpan kode Dapodiknya langsung agar
		// mapel bisa dikirim balik tanpa menunggu sinkron ulang. Bila tidak ada
		// padanannya, mapel dibuat sebagai Sub Pembelajaran — wajib memilih
		// pembelajaran induk yang terdaftar di Dapodik.
		const mirrorRows = await db
			.select()
			.from(tableDapodikPembelajaran)
			.where(eq(tableDapodikPembelajaran.kelasId, kelasId));
		const namaKunci = normMapelName(nama);
		const mirror =
			mirrorRows.find((m) => m.mataPelajaranId && m.nama === nama) ??
			mirrorRows.find((m) => m.mataPelajaranId && normMapelName(m.nama) === namaKunci);

		let indukRow: (typeof mirrorRows)[number] | null = null;
		const indukIdRaw = formMapel.induk_pembelajaran_id?.toString().trim() ?? '';
		if (!mirror && indukIdRaw) {
			indukRow = mirrorRows.find((m) => m.pembelajaranId === indukIdRaw) ?? null;
			if (!indukRow) {
				return fail(400, { fail: 'Pembelajaran induk tidak valid untuk kelas ini.' });
			}
		}
		if (!mirror && !indukRow && mirrorRows.length > 0) {
			return fail(400, {
				fail: `"${nama}" belum terdaftar sebagai pembelajaran Dapodik — pilih "Mata Pelajaran Induk" agar dapat dikirim sebagai Sub Pembelajaran.`
			});
		}

		const dapodikMatpelId = mirror?.mataPelajaranId ?? (await resolveReferensiMapelId(nama));

		await db.insert(tableMataPelajaran).values({
			nama,
			jenis,
			kkm,
			kelasId,
			kode: kode || null,
			...(mirror ? { dapodikPembelajaranId: mirror.pembelajaranId } : {}),
			...(!mirror && indukRow ? { dapodikIndukPembelajaranId: indukRow.pembelajaranId } : {}),
			...(dapodikMatpelId ? { dapodikMataPelajaranId: dapodikMatpelId } : {})
		});
		const suffix = mirror
			? ' dan ter-binding ke pembelajaran Dapodik'
			: indukRow
				? ` sebagai Sub Pembelajaran dari "${indukRow.nama}"${
						dapodikMatpelId
							? ''
							: ' — ID referensi mapel belum ditemukan, akan dilengkapi saat kirim'
					}`
				: '';
		return { message: `Data mata pelajaran berhasil ditambah${suffix}` };
	}
};
