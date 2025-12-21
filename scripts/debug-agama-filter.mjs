#!/usr/bin/env node
/**
 * Debug script untuk mendeteksi masalah filter agama pada rapor
 * Gunakan: node scripts/debug-agama-filter.mjs <murid_id>
 */

import { createClient } from '@libsql/client';

// Ambil DB_URL dari environment atau gunakan file lokal
const dbUrl = process.env.DB_URL || 'file:data/database.sqlite3';

// Buat client database
const client = createClient({ url: dbUrl });

const AGAMA_VARIANT_MAP = {
	islam: 'Pendidikan Agama Islam dan Budi Pekerti',
	kristen: 'Pendidikan Agama Kristen dan Budi Pekerti',
	protestan: 'Pendidikan Agama Kristen dan Budi Pekerti',
	katolik: 'Pendidikan Agama Katolik dan Budi Pekerti',
	katholik: 'Pendidikan Agama Katolik dan Budi Pekerti',
	hindu: 'Pendidikan Agama Hindu dan Budi Pekerti',
	budha: 'Pendidikan Agama Buddha dan Budi Pekerti',
	buddha: 'Pendidikan Agama Buddha dan Budi Pekerti',
	buddhist: 'Pendidikan Agama Buddha dan Budi Pekerti',
	khonghucu: 'Pendidikan Agama Khonghucu dan Budi Pekerti',
	'khong hu cu': 'Pendidikan Agama Khonghucu dan Budi Pekerti',
	konghucu: 'Pendidikan Agama Khonghucu dan Budi Pekerti'
};

function normalizeText(value) {
	return value?.trim().toLowerCase() ?? '';
}

function resolveAgamaVariantName(agama) {
	const normalized = normalizeText(agama);
	return AGAMA_VARIANT_MAP[normalized] ?? null;
}

function isAgamaSubject(name) {
	return normalizeText(name).startsWith('pendidikan agama');
}

async function debugAgamaFilter(muridId) {
	console.log('\n=== DEBUG FILTER AGAMA PADA RAPOR ===\n');

	// 1. Ambil data murid
	const muridResult = await client.execute({
		sql: 'SELECT id, nama, agama, kelas_id FROM murid WHERE id = ?',
		args: [muridId]
	});

	if (muridResult.rows.length === 0) {
		console.error(`❌ Murid dengan ID ${muridId} tidak ditemukan.`);
		process.exit(1);
	}

	const murid = muridResult.rows[0];

	console.log('📋 Data Murid:');
	console.log(`   ID: ${murid.id}`);
	console.log(`   Nama: ${murid.nama}`);
	console.log(`   Agama: ${murid.agama}`);
	console.log(`   Agama (normalized): "${normalizeText(murid.agama)}"`);
	console.log(`   Kelas ID: ${murid.kelas_id}`);

	// 2. Resolve expected agama mapel
	const expectedAgamaMapel = resolveAgamaVariantName(murid.agama);
	const expectedNormalized = normalizeText(expectedAgamaMapel);

	console.log('\n🎯 Expected Mata Pelajaran Agama:');
	console.log(`   Nama: ${expectedAgamaMapel}`);
	console.log(`   Normalized: "${expectedNormalized}"`);

	// 3. Ambil semua mata pelajaran agama di kelas ini
	const mapelResult = await client.execute({
		sql: 'SELECT id, nama, jenis, kkm FROM mata_pelajaran WHERE kelas_id = ?',
		args: [murid.kelas_id]
	});

	const agamaMapels = mapelResult.rows.filter((m) => isAgamaSubject(m.nama));

	console.log('\n📚 Mata Pelajaran Agama di Kelas:');
	if (agamaMapels.length === 0) {
		console.log('   ⚠️  TIDAK ADA mata pelajaran agama di kelas ini!');
	} else {
		for (const mapel of agamaMapels) {
			const normalized = normalizeText(mapel.nama);
			const isMatch = normalized === expectedNormalized;
			console.log(
				`   ${isMatch ? '✅' : '❌'} ID: ${mapel.id} | ${mapel.nama} (normalized: "${normalized}")`
			);
		}
	}

	// 4. Ambil asesmen sumatif murid ini untuk mapel agama
	const asesmenResult = await client.execute({
		sql: `
			SELECT 
				as_sum.id,
				as_sum.mata_pelajaran_id,
				as_sum.nilai_akhir,
				mp.nama as mapel_nama
			FROM asesmen_sumatif as_sum
			JOIN mata_pelajaran mp ON mp.id = as_sum.mata_pelajaran_id
			WHERE as_sum.murid_id = ?
		`,
		args: [muridId]
	});

	const agamaAsesmen = asesmenResult.rows.filter((a) => isAgamaSubject(a.mapel_nama));

	console.log('\n💯 Asesmen Sumatif untuk Mata Pelajaran Agama:');
	if (agamaAsesmen.length === 0) {
		console.log('   ⚠️  TIDAK ADA asesmen sumatif untuk mapel agama!');
	} else {
		for (const asesmen of agamaAsesmen) {
			const normalized = normalizeText(asesmen.mapel_nama);
			const isMatch = normalized === expectedNormalized;
			const willBeFiltered = !isMatch;

			console.log(
				`\n   ${isMatch ? '✅ PASS' : '❌ FILTERED'} Mapel ID: ${asesmen.mata_pelajaran_id}`
			);
			console.log(`      Nama: ${asesmen.mapel_nama}`);
			console.log(`      Normalized: "${normalized}"`);
			console.log(`      Nilai Akhir: ${asesmen.nilai_akhir ?? 'null'}`);
			console.log(`      Filter Match: ${isMatch ? 'YA' : 'TIDAK'}`);

			if (willBeFiltered) {
				console.log(
					`      ⚠️  AKAN DI-FILTER! Nama tidak match dengan expected: "${expectedNormalized}"`
				);
			}
		}
	}

	// 5. Ambil asesmen tujuan pembelajaran
	const tujuanResult = await client.execute({
		sql: `
			SELECT 
				ast.mata_pelajaran_id,
				ast.tujuan_pembelajaran_id,
				ast.nilai,
				tp.deskripsi as tujuan_deskripsi
			FROM asesmen_sumatif_tujuan ast
			LEFT JOIN tujuan_pembelajaran tp ON tp.id = ast.tujuan_pembelajaran_id
			WHERE ast.murid_id = ?
		`,
		args: [muridId]
	});

	// Group by mapel
	const tujuanByMapel = new Map();
	for (const item of tujuanResult.rows) {
		if (!tujuanByMapel.has(item.mata_pelajaran_id)) {
			tujuanByMapel.set(item.mata_pelajaran_id, []);
		}
		tujuanByMapel.get(item.mata_pelajaran_id).push(item);
	}

	console.log('\n📝 Asesmen Tujuan Pembelajaran untuk Mapel Agama:');
	let hasTujuanForAgama = false;
	for (const mapel of agamaMapels) {
		const tujuans = tujuanByMapel.get(mapel.id) ?? [];
		const normalized = normalizeText(mapel.nama);
		const isMatch = normalized === expectedNormalized;

		if (tujuans.length > 0) {
			hasTujuanForAgama = true;
			console.log(
				`\n   ${isMatch ? '✅ PASS' : '❌ FILTERED'} Mapel: ${mapel.nama} (ID: ${mapel.id})`
			);
			console.log(`      Jumlah Tujuan: ${tujuans.length}`);

			const validTujuans = tujuans.filter(
				(t) => t.tujuan_deskripsi?.trim() && typeof t.nilai === 'number' && Number.isFinite(t.nilai)
			);
			console.log(`      Tujuan Valid (ada deskripsi & nilai): ${validTujuans.length}`);

			if (!isMatch) {
				console.log(
					`      ⚠️  Tujuan pembelajaran ini TIDAK AKAN MUNCUL di rapor karena nama mapel tidak match!`
				);
			}

			// Tampilkan beberapa contoh
			for (let i = 0; i < Math.min(3, validTujuans.length); i++) {
				const t = validTujuans[i];
				console.log(`         ${i + 1}. ${t.tujuan_deskripsi.substring(0, 60)}...`);
				console.log(`            Nilai: ${t.nilai}`);
			}
		}
	}

	if (!hasTujuanForAgama) {
		console.log('   ⚠️  TIDAK ADA tujuan pembelajaran untuk mapel agama!');
	}

	// 6. Kesimpulan dan saran
	console.log('\n\n=== KESIMPULAN ===\n');

	const hasMatchingMapel = agamaMapels.some((m) => normalizeText(m.nama) === expectedNormalized);
	const hasFilteredMapel = agamaMapels.some((m) => normalizeText(m.nama) !== expectedNormalized);

	if (!expectedAgamaMapel) {
		console.log('❌ MASALAH: Agama murid tidak dikenali!');
		console.log(`   Agama murid: "${murid.agama}"`);
		console.log(`   Solusi: Pastikan kolom agama murid berisi value yang valid:`);
		console.log(`           islam, kristen, katolik, hindu, buddha, khonghucu`);
	} else if (!hasMatchingMapel && agamaMapels.length > 0) {
		console.log('❌ MASALAH: Nama mata pelajaran agama tidak sesuai dengan agama murid!');
		console.log(`   Expected: "${expectedAgamaMapel}"`);
		console.log(`   Yang ada di kelas:`);
		agamaMapels.forEach((m) => console.log(`      - "${m.nama}"`));
		console.log('\n   Solusi:');
		console.log('   1. Ubah nama mata pelajaran di kelas sesuai dengan agama murid, ATAU');
		console.log('   2. Ubah agama murid sesuai dengan nama mata pelajaran yang ada');
	} else if (hasMatchingMapel && hasFilteredMapel) {
		console.log('⚠️  PERINGATAN: Ada beberapa mapel agama, tapi hanya 1 yang akan ditampilkan');
		console.log(`   Yang ditampilkan: ${expectedAgamaMapel}`);
		console.log('   Yang di-filter:');
		agamaMapels
			.filter((m) => normalizeText(m.nama) !== expectedNormalized)
			.forEach((m) => console.log(`      - "${m.nama}"`));
	} else if (hasMatchingMapel && agamaAsesmen.length === 0) {
		console.log('❌ MASALAH: Mapel agama ada, tapi belum ada nilai asesmen sumatif!');
		console.log(`   Solusi: Input nilai asesmen sumatif untuk ${expectedAgamaMapel}`);
	} else if (hasMatchingMapel && agamaAsesmen.length > 0) {
		const matchingMapel = agamaMapels.find((m) => normalizeText(m.nama) === expectedNormalized);
		const tujuansForMatchingMapel = tujuanByMapel.get(matchingMapel.id) ?? [];

		if (tujuansForMatchingMapel.length === 0) {
			console.log(
				'❌ MASALAH: Ada nilai asesmen sumatif, tapi TIDAK ADA nilai tujuan pembelajaran!'
			);
			console.log(
				'   Solusi: Input nilai per tujuan pembelajaran (bukan hanya nilai akhir) untuk mapel ini'
			);
		} else {
			console.log('✅ Konfigurasi sudah benar!');
			console.log(
				'   Jika masih muncul "Belum ada penilaian sumatif", periksa apakah nilai sudah valid (bukan null)'
			);
		}
	}

	console.log('');
	client.close();
}

// Run script
const muridId = parseInt(process.argv[2], 10);
if (!muridId || isNaN(muridId)) {
	console.error('Usage: node scripts/debug-agama-filter.mjs <murid_id>');
	console.error('Example: node scripts/debug-agama-filter.mjs 123');
	process.exit(1);
}

debugAgamaFilter(muridId).catch((err) => {
	console.error('Error:', err);
	client.close();
	process.exit(1);
});
