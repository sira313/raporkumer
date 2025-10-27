export const groupedUserPermissions = {
	user: {
		values: [
			['list', 'Lihat daftar pengguna'],
			['detail', 'Lihat detail pengguna'],
			['add', 'Tambah pengguna'],
			['delete', 'Hapus pengguna'],
			['suspend', 'Tangguhkan pengguna'],
			['set_permissions', 'Atur izin pengguna']
		],
		description: 'Manajemen Pengguna'
	},
	cetak: {
		values: [
			['biodata', 'Cetak biodata'],
			['cover', 'Cetak cover'],
			['piagam', 'Cetak piagam'],
			['rapor', 'Cetak rapor']
		],
		description: 'Halaman Cetak'
	},
	nilai: {
		values: [
			['absen', 'Absen'],
			['asesmen_formatif', 'Asesmen Formatif']
			// ...
		],
		description: 'Input Nilai'
	}
,
	dashboard: {
		values: [["manage", 'Kelola Tindakan Cepat'] ],
		description: 'Tindakan Cepat pada Dashboard'
	}
	,
	sekolah: {
		values: [["manage", 'Kelola Sekolah']],
		description: 'Aksi pada halaman Sekolah'
	}
	,
	rapor: {
		values: [["manage", 'Kelola Rapor']],
		description: 'Izin terkait pengelolaan data rapor'
	}
} as const;

export const userPermissions = Object.entries(groupedUserPermissions) //
	.flatMap(([key, { values }]) => values.map((value) => <UserPermission>`${key}_${value[0]}`));

export function isAuthorizedUser(
	allowedPermissions: UserPermission[],
	user?: Pick<AuthUser, 'permissions'>
) {
	if (!user) return false;
	const userPermissions = user.permissions || [];
	return allowedPermissions.some((r) => userPermissions.includes(r));
}
