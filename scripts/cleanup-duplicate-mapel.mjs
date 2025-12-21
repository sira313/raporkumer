#!/usr/bin/env node
/**
 * Script untuk membersihkan duplikat mata pelajaran sebelum apply constraint
 * Akan otomatis merge data ke mapel dengan ID terendah (yang dibuat pertama kali)
 * Gunakan: node scripts/cleanup-duplicate-mapel.mjs
 */

import { createClient } from '@libsql/client';

const dbUrl = process.env.DB_URL || 'file:data/database.sqlite3';
const client = createClient({ url: dbUrl });

async function cleanupDuplicates() {
	console.log('\n=== CLEANUP DUPLIKAT MATA PELAJARAN ===\n');

	// 1. Cari semua kelas
	const kelasResult = await client.execute({
		sql: 'SELECT id, nama FROM kelas ORDER BY id'
	});

	if (kelasResult.rows.length === 0) {
		console.log('✅ Tidak ada kelas ditemukan.');
		client.close();
		return;
	}

	let totalDuplicates = 0;
	let totalMerged = 0;

	for (const kelas of kelasResult.rows) {
		console.log(`\n📚 Kelas: ${kelas.nama} (ID: ${kelas.id})`);

		// 2. Cari duplikat di kelas ini
		const mapelResult = await client.execute({
			sql: `
				SELECT id, nama, jenis, kkm
				FROM mata_pelajaran
				WHERE kelas_id = ?
				ORDER BY nama, id
			`,
			args: [kelas.id]
		});

		// Group by nama (case insensitive)
		const mapelByName = new Map();
		for (const mapel of mapelResult.rows) {
			const namaLower = mapel.nama.trim().toLowerCase();
			if (!mapelByName.has(namaLower)) {
				mapelByName.set(namaLower, []);
			}
			mapelByName.get(namaLower).push(mapel);
		}

		// Cari yang duplikat (lebih dari 1)
		const duplicates = Array.from(mapelByName.entries()).filter(([, list]) => list.length > 1);

		if (duplicates.length === 0) {
			console.log('   ✅ Tidak ada duplikat');
			continue;
		}

		console.log(`   ⚠️  Ditemukan ${duplicates.length} mata pelajaran duplikat\n`);
		totalDuplicates += duplicates.length;

		// 3. Merge setiap duplikat
		for (const [, list] of duplicates) {
			console.log(`   📝 ${list[0].nama}:`);
			console.log(`      Ditemukan ${list.length} mapel dengan nama sama`);

			// Gunakan ID terendah (yang dibuat pertama) sebagai target
			const targetMapel = list[0]; // Sudah terurut by ID ascending
			const duplicateMapels = list.slice(1);

			console.log(`      Target: ID ${targetMapel.id} (akan dipertahankan)`);
			console.log(`      Duplikat: ${duplicateMapels.map((m) => `ID ${m.id}`).join(', ')}`);

			// 4. Merge data dari duplikat ke target
			for (const dupMapel of duplicateMapels) {
				// Count data yang akan dipindahkan
				const tpCount = await client.execute({
					sql: 'SELECT COUNT(*) as count FROM tujuan_pembelajaran WHERE mata_pelajaran_id = ?',
					args: [dupMapel.id]
				});

				const asesmenCount = await client.execute({
					sql: 'SELECT COUNT(*) as count FROM asesmen_sumatif WHERE mata_pelajaran_id = ?',
					args: [dupMapel.id]
				});

				const asesmenTujuanCount = await client.execute({
					sql: 'SELECT COUNT(*) as count FROM asesmen_sumatif_tujuan WHERE mata_pelajaran_id = ?',
					args: [dupMapel.id]
				});

				const authUserCount = await client.execute({
					sql: 'SELECT COUNT(*) as count FROM auth_user_mata_pelajaran WHERE mata_pelajaran_id = ?',
					args: [dupMapel.id]
				});

				console.log(`      \n      Memindahkan dari ID ${dupMapel.id}:`);
				console.log(`         - Tujuan Pembelajaran: ${tpCount.rows[0].count}`);
				console.log(`         - Asesmen Sumatif: ${asesmenCount.rows[0].count}`);
				console.log(`         - Asesmen Tujuan: ${asesmenTujuanCount.rows[0].count}`);
				console.log(`         - Auth User Mapel: ${authUserCount.rows[0].count}`);

				// STRATEGI MERGE untuk menghindari UNIQUE constraint conflict:
				// 1. Cari murid yang punya nilai di KEDUA mapel
				// 2. Untuk murid tersebut, HAPUS nilai di target (yang lama) dan PINDAHKAN dari duplikat (yang baru)
				// 3. Untuk murid lain, pindahkan langsung

				try {
					// Step 1: Identifikasi murid yang conflict (ada di kedua mapel)
					const conflictMurids = await client.execute({
						sql: `
							SELECT DISTINCT as1.murid_id
							FROM asesmen_sumatif as1
							INNER JOIN asesmen_sumatif as2 
								ON as1.murid_id = as2.murid_id
							WHERE as1.mata_pelajaran_id = ? 
								AND as2.mata_pelajaran_id = ?
						`,
						args: [targetMapel.id, dupMapel.id]
					});

					if (conflictMurids.rows.length > 0) {
						console.log(
							`         ⚠️  Ditemukan ${conflictMurids.rows.length} murid dengan nilai di kedua mapel`
						);
						console.log(`         Strategi: Hapus nilai lama, gunakan nilai baru`);

						// Untuk setiap murid yang conflict, hapus nilai di target mapel
						for (const row of conflictMurids.rows) {
							const muridId = row.murid_id;

							// Hapus asesmen sumatif di target mapel untuk murid ini
							await client.execute({
								sql: 'DELETE FROM asesmen_sumatif WHERE murid_id = ? AND mata_pelajaran_id = ?',
								args: [muridId, targetMapel.id]
							});

							// Hapus asesmen tujuan di target mapel untuk murid ini
							await client.execute({
								sql: 'DELETE FROM asesmen_sumatif_tujuan WHERE murid_id = ? AND mata_pelajaran_id = ?',
								args: [muridId, targetMapel.id]
							});

							// Hapus asesmen formatif di target mapel untuk murid ini (jika ada)
							await client.execute({
								sql: 'DELETE FROM asesmen_formatif WHERE murid_id = ? AND mata_pelajaran_id = ?',
								args: [muridId, targetMapel.id]
							});
						}

						console.log(`         ✅ Nilai lama untuk ${conflictMurids.rows.length} murid dihapus`);
					}

					// Step 2: Sekarang aman untuk update semua foreign keys
					if (tpCount.rows[0].count > 0) {
						await client.execute({
							sql: 'UPDATE tujuan_pembelajaran SET mata_pelajaran_id = ? WHERE mata_pelajaran_id = ?',
							args: [targetMapel.id, dupMapel.id]
						});
					}

					if (asesmenCount.rows[0].count > 0) {
						await client.execute({
							sql: 'UPDATE asesmen_sumatif SET mata_pelajaran_id = ? WHERE mata_pelajaran_id = ?',
							args: [targetMapel.id, dupMapel.id]
						});
					}

					if (asesmenTujuanCount.rows[0].count > 0) {
						await client.execute({
							sql: 'UPDATE asesmen_sumatif_tujuan SET mata_pelajaran_id = ? WHERE mata_pelajaran_id = ?',
							args: [targetMapel.id, dupMapel.id]
						});
					}

					if (authUserCount.rows[0].count > 0) {
						await client.execute({
							sql: 'UPDATE auth_user_mata_pelajaran SET mata_pelajaran_id = ? WHERE mata_pelajaran_id = ?',
							args: [targetMapel.id, dupMapel.id]
						});
					}

					// Juga update asesmen_formatif jika ada
					await client.execute({
						sql: 'UPDATE asesmen_formatif SET mata_pelajaran_id = ? WHERE mata_pelajaran_id = ?',
						args: [targetMapel.id, dupMapel.id]
					});

					// Hapus mapel duplikat
					await client.execute({
						sql: 'DELETE FROM mata_pelajaran WHERE id = ?',
						args: [dupMapel.id]
					});

					console.log(`         ✅ Berhasil dipindahkan dan ID ${dupMapel.id} dihapus`);
					totalMerged++;
				} catch (error) {
					console.error(`         ❌ ERROR: ${error.message}`);
				}
			}

			console.log('');
		}
	}

	console.log('\n=== SUMMARY ===\n');
	console.log(`Total duplikat ditemukan: ${totalDuplicates}`);
	console.log(`Total mapel berhasil di-merge: ${totalMerged}`);
	console.log('');

	if (totalMerged > 0) {
		console.log('✅ Cleanup selesai! Sekarang aman untuk apply constraint unique.');
		console.log('   Jalankan: pnpm db:push');
	} else {
		console.log('✅ Tidak ada duplikat. Database sudah bersih.');
	}

	client.close();
}

cleanupDuplicates().catch((err) => {
	console.error('Error:', err);
	client.close();
	process.exit(1);
});
