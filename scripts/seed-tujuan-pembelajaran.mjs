import { createClient } from '@libsql/client';
const DEFAULT_DB_URL = 'file:./data/database.sqlite3';

const dbUrl = process.env.DB_URL || DEFAULT_DB_URL;

const client = createClient({ url: dbUrl });

const mapelId = Number.parseInt(process.argv[2] ?? '', 10) || 1;

const now = new Date().toISOString();

const seedGroups = [
	{
		lingkupMateri: 'Literasi: Membaca dan Memahami Teks',
		bobot: 0,
		tujuan: [
			'Mengidentifikasi informasi penting dari teks narasi dan nonfiksi sederhana.',
			'Menganalisis unsur kebahasaan pada teks pengalaman pribadi atau cerita rakyat.',
			'Menyimpulkan isi teks dengan menggunakan bukti berupa kalimat atau paragraf pendukung.'
		]
	},
	{
		lingkupMateri: 'Komunikasi Lisan dan Tulis',
		bobot: 0,
		tujuan: [
			'Menyusun teks lisan untuk menyampaikan pendapat dengan bahasa baku dan santun.',
			'Menulis paragraf deskriptif mengenai objek di lingkungan sekitar dengan struktur yang runtut.',
			'Merevisi teks tulis berdasarkan umpan balik untuk memperbaiki ketepatan ejaan dan tanda baca.'
		]
	},
	{
		lingkupMateri: 'Apresiasi Sastra dan Budaya',
		bobot: 0,
		tujuan: [
			'Mengungkapkan kembali isi puisi atau cerita rakyat menggunakan bahasa sendiri.',
			'Membandingkan nilai moral dari dua karya sastra daerah yang berbeda.',
			'Menciptakan karya sastra sederhana sebagai bentuk apresiasi terhadap budaya lokal.'
		]
	}
];

async function main() {
	console.info(`[seed] Target DB: ${dbUrl}`);
	console.info(`[seed] Menulis ulang tujuan pembelajaran untuk mata pelajaran ${mapelId}`);

	await client.execute({
		sql: 'DELETE FROM tujuan_pembelajaran WHERE mata_pelajaran_id = ?',
		args: [mapelId]
	});

	let inserted = 0;

	for (const group of seedGroups) {
		for (const deskripsi of group.tujuan) {
			await client.execute({
				sql: `INSERT INTO tujuan_pembelajaran (mata_pelajaran_id, lingkup_materi, deskripsi, bobot, created_at)
				VALUES (?, ?, ?, ?, ?)`,
				args: [mapelId, group.lingkupMateri, deskripsi, group.bobot, now]
			});
			inserted += 1;
		}
	}

	console.info(`[seed] Selesai. Total baris ditulis: ${inserted}`);
	await client.close();
}

main().catch((error) => {
	console.error('[seed] Gagal mengisi data', error);
	process.exit(1);
});
