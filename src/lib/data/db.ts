import Dexie, { type EntityTable } from 'dexie';

type DB = Dexie & {
	sekolah: EntityTable<Sekolah, 'id'>;
	murid: EntityTable<Murid, 'nis'>;
};

const db = <DB>new Dexie('RaporKumer');

db.version(1).stores({
	sekolah: 'id, nama, npsn',
	murid: 'nis, &nisn, nama'
});

export default db;
