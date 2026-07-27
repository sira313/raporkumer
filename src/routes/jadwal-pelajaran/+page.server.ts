import db from '$lib/server/db';
import { ensureJadwalBellSchema } from '$lib/server/db/ensure-jadwal-bell';
import { ensurePresensiSettingsSchema } from '$lib/server/db/ensure-presensi-settings';
import {
	tableBellSettings,
	tableKegiatanCustom,
	tableJadwalPelajaran,
	tableKokurikuler,
	tableMataPelajaran,
	tableKelas,
	tablePresensiSettings,
	tableSekolah
} from '$lib/server/db/schema';
import { cookieNames } from '$lib/utils';
import { desc, eq, inArray } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, cookies }) => {
	let sekolahId = locals.sekolah?.id;

	if (!sekolahId) {
		const cookieSekolahId = Number(cookies.get(cookieNames.ACTIVE_SEKOLAH_ID) || '');
		if (cookieSekolahId) sekolahId = cookieSekolahId;
	}

	if (!sekolahId) {
		const firstSekolah = await db.query.tableSekolah.findFirst({
			columns: { id: true, nama: true }
		});
		if (!firstSekolah) {
			return {
				meta: { title: 'Jadwal Pelajaran' },
				namaSekolah: '',
				daftarKelas: [],
				bellSettings: null,
				kegiatanCustom: [],
				jadwalPelajaran: [],
				daftarKodeMapel: [],
				kodeMapelPerKelas: [],
				daftarKodeKokurikuler: [],
				hariSekolah: 6,
				jamPulang: '15:00'
			};
		}
		sekolahId = firstSekolah.id;
	}

	await ensureJadwalBellSchema();
	await ensurePresensiSettingsSchema();

	const sekolahRow = await db.query.tableSekolah.findFirst({
		columns: { id: true, nama: true },
		where: eq(tableSekolah.id, sekolahId)
	});

	const [bellSettings, kegiatanCustom, jadwalPelajaran, presensiSettings, kelasRows] =
		await Promise.all([
			db.query.tableBellSettings.findFirst({
				where: eq(tableBellSettings.sekolahId, sekolahId)
			}),
			db.query.tableKegiatanCustom.findMany({
				where: eq(tableKegiatanCustom.sekolahId, sekolahId)
			}),
			db.query.tableJadwalPelajaran.findMany({
				where: eq(tableJadwalPelajaran.sekolahId, sekolahId)
			}),
			db.query.tablePresensiSettings.findFirst({
				where: eq(tablePresensiSettings.sekolahId, sekolahId),
				orderBy: [desc(tablePresensiSettings.id)]
			}),
			db.query.tableKelas.findMany({
				where: eq(tableKelas.sekolahId, sekolahId),
				columns: { id: true, nama: true }
			})
		]);

	const hariSekolah = presensiSettings?.hariSekolah ?? 6;
	const jamPulang = presensiSettings?.jamPulang ?? '15:00';

	const kelasIdList = kelasRows.map((k) => k.id);
	const [daftarMapel, daftarKokurikulerRows] = await Promise.all([
		kelasIdList.length > 0
			? db.query.tableMataPelajaran.findMany({
					where: inArray(tableMataPelajaran.kelasId, kelasIdList),
					columns: { kode: true, nama: true, kelasId: true }
				})
			: Promise.resolve([]),
		kelasIdList.length > 0
			? db.query.tableKokurikuler.findMany({
					columns: { kode: true },
					where: inArray(tableKokurikuler.kelasId, kelasIdList)
				})
			: Promise.resolve([])
	]);

	const agamaMapelNames = [
		'Pendidikan Agama dan Budi Pekerti',
		'Pendidikan Agama Islam dan Budi Pekerti',
		'Pendidikan Agama Kristen dan Budi Pekerti',
		'Pendidikan Agama Katolik dan Budi Pekerti',
		'Pendidikan Agama Buddha dan Budi Pekerti',
		'Pendidikan Agama Hindu dan Budi Pekerti',
		'Pendidikan Agama Konghuchu dan Budi Pekerti'
	];
	const agamaNameSet = new Set(agamaMapelNames);
	const mapelByKelas = new Map<number, { namaKelas: string; kodes: Set<string> }>();
	const kodeSet = new Set<string>();
	for (const m of daftarMapel) {
		const kode = agamaNameSet.has(m.nama) ? 'PAPB' : m.kode;
		if (!kode) continue;
		if (!mapelByKelas.has(m.kelasId)) {
			const kelasInfo = kelasRows.find((k) => k.id === m.kelasId);
			mapelByKelas.set(m.kelasId, {
				namaKelas: kelasInfo?.nama ?? `Kelas ${m.kelasId}`,
				kodes: new Set()
			});
		}
		mapelByKelas.get(m.kelasId)!.kodes.add(kode);
		kodeSet.add(kode);
	}
	const daftarKodeMapel = [...kodeSet].sort();
	const kodeMapelPerKelas = [...mapelByKelas.entries()].map(([kelasId, info]) => ({
		kelasId,
		namaKelas: info.namaKelas,
		kodeMapel: [...info.kodes].sort()
	}));

	const daftarKodeKokurikuler = daftarKokurikulerRows.map((k) => k.kode);

	return {
		meta: { title: 'Jadwal Pelajaran' },
		namaSekolah: sekolahRow?.nama ?? '',
		daftarKelas: kelasRows,
		bellSettings,
		kegiatanCustom,
		jadwalPelajaran,
		daftarKodeMapel,
		kodeMapelPerKelas,
		daftarKodeKokurikuler,
		hariSekolah,
		jamPulang
	};
};
