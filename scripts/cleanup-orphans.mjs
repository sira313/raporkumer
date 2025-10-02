import { createClient } from '@libsql/client';

const client = createClient({ url: process.env.DB_URL || 'file:./data/database.sqlite3' });

async function cleanup() {
	console.info('🔍  Memulai pembersihan data yatim...');

	const summary = [];

	const deletePegawai = await client.execute(
		`DELETE FROM pegawai AS p
		WHERE NOT EXISTS (SELECT 1 FROM sekolah s WHERE s.kepala_sekolah_id = p.id)
			AND NOT EXISTS (SELECT 1 FROM kelas k WHERE k.wali_kelas_id = p.id);`
	);
	summary.push({ entity: 'Pegawai', removed: deletePegawai.rowsAffected ?? 0 });

	const deleteWali = await client.execute(
		`DELETE FROM wali_murid AS w
		WHERE NOT EXISTS (
			SELECT 1 FROM murid m
			WHERE m.ibu_id = w.id
				OR m.ayah_id = w.id
				OR m.wali_id = w.id
		);`
	);
	summary.push({ entity: 'Wali murid', removed: deleteWali.rowsAffected ?? 0 });

	const deleteAlamat = await client.execute(
		`DELETE FROM alamat AS a
		WHERE NOT EXISTS (SELECT 1 FROM sekolah s WHERE s.alamat_id = a.id)
			AND NOT EXISTS (SELECT 1 FROM murid m WHERE m.alamat_id = a.id);`
	);
	summary.push({ entity: 'Alamat', removed: deleteAlamat.rowsAffected ?? 0 });

	for (const item of summary) {
		console.info(`✅ ${item.entity}: ${item.removed} baris dibersihkan`);
	}

	console.info('✨  Pembersihan selesai.');
}

cleanup()
	.catch((error) => {
		console.error('Gagal membersihkan data yatim:', error);
		process.exitCode = 1;
	})
	.finally(async () => {
		await client.close();
	});
