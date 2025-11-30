import db from './src/lib/server/db/index.js';
import { tableMataPelajaran } from './src/lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

const result = await db.query.tableMataPelajaran.findMany({
	columns: { id: true, nama: true, kelasId: true },
	where: eq(tableMataPelajaran.kelasId, 1)
});

const agama = result.filter((m) => m.nama.toLowerCase().includes('agama'));
console.log('\n=== Agama mapel di Kelas 1 ===');
agama.forEach((m) => console.log(`ID ${m.id}: ${m.nama}`));
console.log('\nAll mapel in Kelas 1:');
result.forEach((m) => console.log(`ID ${m.id}: ${m.nama}`));
